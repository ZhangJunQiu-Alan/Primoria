import { isFixtureModeEnabled } from '@/shared/utils/demoMode';

export function usesViewerFixtures() {
  return isFixtureModeEnabled();
}

export function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function toString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value ?? 0) || 0;
}

export function toBoolean(value: unknown) {
  return value === true;
}

export function trimOrNull(value: unknown) {
  const next = toString(value).trim();
  return next || null;
}

export function normalizeType(value: unknown) {
  return toString(value).trim().toLowerCase().replaceAll('_', '-');
}
