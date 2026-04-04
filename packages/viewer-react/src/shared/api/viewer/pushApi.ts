import { runtimeEnv } from '@/shared/config/runtimeEnv';
import { supabase } from '@/shared/api/supabase';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';

const GEMINI_STORAGE_KEY = 'primoria.viewer.gemini-api-key';

export type ViewerPushPermissionState = NotificationPermission | 'unsupported';

export type ViewerPushRegistrationResult = {
  permission: ViewerPushPermissionState;
  active: boolean;
  message?: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const safe = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/');
  const decoded = window.atob(safe);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function getPermissionState(): ViewerPushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

async function invokePushFunction(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    throw error;
  }
  return data;
}

export async function registerViewerPushWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || usesViewerFixtures()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register('/viewer-push-sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

export async function enableViewerPushNotifications(): Promise<ViewerPushRegistrationResult> {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => ({
      ...state,
      webPushSubscription: {
        endpoint: 'https://demo.push.primoria.dev/subscription/demo-user',
        p256dh: 'demo-p256dh',
        auth: 'demo-auth',
        user_agent: 'fixture',
        permission_state: 'granted',
        active: true,
      },
    }));
    return { permission: 'granted', active: true };
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { permission: 'unsupported', active: false, message: '当前浏览器不支持系统通知。' };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { permission: 'unsupported', active: false, message: '当前浏览器不支持推送订阅。' };
  }

  const registration = (await registerViewerPushWorker()) ?? (await navigator.serviceWorker.ready);
  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    return {
      permission,
      active: false,
      message: permission === 'denied' ? '通知权限已被系统拒绝。' : '通知权限尚未开启。',
    };
  }

  if (!runtimeEnv.webPushPublicKey) {
    throw new Error('缺少 VITE_WEB_PUSH_PUBLIC_KEY，无法创建浏览器推送订阅。');
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(runtimeEnv.webPushPublicKey),
    }));

  const payload = subscription.toJSON();
  const keys = payload.keys ?? {};
  await invokePushFunction('viewer-push-subscribe', {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh ?? '',
    auth: keys.auth ?? '',
    user_agent: navigator.userAgent,
    permission_state: 'granted',
  });

  return { permission: 'granted', active: true };
}

export async function disableViewerPushNotifications(): Promise<ViewerPushRegistrationResult> {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => ({
      ...state,
      webPushSubscription: state.webPushSubscription
        ? { ...state.webPushSubscription, active: false, permission_state: 'default' }
        : null,
    }));
    return { permission: 'default', active: false };
  }

  const permissionState = getPermissionState();
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { permission: permissionState, active: false };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  const endpoint = subscription?.endpoint ?? null;

  await invokePushFunction('viewer-push-unsubscribe', {
    endpoint,
    permission_state: permissionState === 'unsupported' ? 'unsupported' : permissionState,
  });

  if (subscription) {
    await subscription.unsubscribe();
  }

  return { permission: permissionState, active: false };
}

export async function clearViewerLocalCache() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(GEMINI_STORAGE_KEY);

  if ('caches' in window) {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('primoria-viewer') || key.startsWith('workbox-precache'))
        .map((key) => window.caches.delete(key)),
    );
  }
}
