import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getEnv(name: string) {
  const value = Deno.env.get(name) ?? '';
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

type WebPushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  last_sent_at: string | null;
};

type UserSettingsRow = {
  user_id: string;
  notification_daily_reminder: boolean;
  notification_reminder_time: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

function isDueNow(reminderTime: string, lastSentAt: string | null, force: boolean) {
  if (force) {
    return true;
  }

  const now = new Date();
  const currentTime = now.toISOString().slice(11, 16);
  if (currentTime !== reminderTime) {
    return false;
  }

  if (!lastSentAt) {
    return true;
  }

  return lastSentAt.slice(0, 10) !== now.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const force = body?.force === true;

    const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
    webpush.setVapidDetails(
      getEnv('WEB_PUSH_SUBJECT'),
      getEnv('WEB_PUSH_PUBLIC_KEY'),
      getEnv('WEB_PUSH_PRIVATE_KEY'),
    );

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('web_push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth, last_sent_at')
      .eq('active', true)
      .eq('permission_state', 'granted');

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    const userIds = Array.from(new Set((subscriptions ?? []).map((row) => String(row.user_id ?? '')))).filter(Boolean);
    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, due: 0, sent: 0, invalidated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const [{ data: userSettings, error: userSettingsError }, { data: profiles, error: profilesError }] = await Promise.all([
      supabase
        .from('user_settings')
        .select('user_id, notification_daily_reminder, notification_reminder_time')
        .in('user_id', userIds)
        .eq('notification_daily_reminder', true),
      supabase.from('profiles').select('id, username').in('id', userIds),
    ]);

    if (userSettingsError) {
      throw userSettingsError;
    }
    if (profilesError) {
      throw profilesError;
    }

    const settingsByUser = new Map(
      ((userSettings ?? []) as UserSettingsRow[]).map((row) => [row.user_id, row]),
    );
    const profileByUser = new Map(((profiles ?? []) as ProfileRow[]).map((row) => [row.id, row]));

    const due = ((subscriptions ?? []) as WebPushSubscriptionRow[]).filter((row) => {
      const settings = settingsByUser.get(row.user_id);
      if (!settings) {
        return false;
      }
      return isDueNow(settings.notification_reminder_time, row.last_sent_at, force);
    });

    if (dryRun) {
      return new Response(
        JSON.stringify({ ok: true, due: due.length, sent: 0, invalidated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let sent = 0;
    let invalidated = 0;

    for (const subscription of due) {
      const profile = profileByUser.get(subscription.user_id);
      const displayName = profile?.username?.trim() || 'Learner';

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify({
            title: 'Primoria 学习提醒',
            body: `${displayName}，该继续今天的学习了。回到 Primoria 保持你的学习节奏。`,
            url: '/home',
          }),
        );

        sent += 1;

        const { error: updateError } = await supabase
          .from('web_push_subscriptions')
          .update({ last_sent_at: new Date().toISOString(), active: true })
          .eq('id', subscription.id);

        if (updateError) {
          throw updateError;
        }
      } catch (error) {
        const statusCode = Number((error as { statusCode?: number }).statusCode ?? 0);
        if (statusCode === 404 || statusCode === 410) {
          invalidated += 1;
          await supabase
            .from('web_push_subscriptions')
            .update({ active: false })
            .eq('id', subscription.id);
          continue;
        }
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, due: due.length, sent, invalidated }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
