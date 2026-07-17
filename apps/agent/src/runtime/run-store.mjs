import { createHash, randomUUID } from "node:crypto";
import postgres from "postgres";


/** @param {any} input */
function inputHash(input) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

/** @param {any} input */
function ownerIdFromInput(input) {
  return input?.state?.primoria_owner_id
    ?? input?.state?.user_id
    ?? input?.forwardedProps?.config?.configurable?.primoria_owner_id
    ?? input?.forwardedProps?.config?.metadata?.primoria_owner_id
    ?? null;
}

/** @param {string | undefined} [databaseUrl] */
export function createRunStore(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required for Agent runtime persistence");
  const sql = postgres(databaseUrl, { prepare: false, onnotice: () => {} });

  return {
    async close() {
      await sql.end({ timeout: 5 });
    },

    async ping() {
      await sql`select 1 from agent_runtime.runs limit 1`;
    },

    /** @param {any} input */
    async ensureRun(input, expectedOwnerId = ownerIdFromInput(input)) {
      if (!expectedOwnerId) throw Object.assign(new Error("Agent run owner is required"), { code: "owner_required" });
      const hash = inputHash(input);
      const maxAttempts = Math.max(1, Number(process.env.AGENT_RUN_MAX_ATTEMPTS ?? 2));
      await sql`
        insert into agent_runtime.runs (id, thread_id, owner_id, input, input_hash, max_attempts)
        values (${input.runId}, ${input.threadId}, ${expectedOwnerId}, ${sql.json(input)}, ${hash}, ${maxAttempts})
        on conflict (id) do nothing
      `;
      const [run] = await sql`select * from agent_runtime.runs where id = ${input.runId}`;
      if (!run) throw new Error("Agent run could not be created");
      if (run.owner_id !== expectedOwnerId) {
        throw Object.assign(new Error("runId belongs to another owner"), { code: "owner_mismatch" });
      }
      if (run.input_hash !== hash) {
        throw Object.assign(new Error("runId was already used for a different request"), { code: "run_id_conflict" });
      }
      return run;
    },

    /** @param {string} runId @param {string | null} [ownerId] */
    async getRun(runId, ownerId = null) {
      const ownerFilter = ownerId ? sql`and owner_id = ${ownerId}` : sql``;
      const [run] = await sql`select * from agent_runtime.runs where id = ${runId} ${ownerFilter}`;
      return run ?? null;
    },

    /** @param {string} runId @param {number} [afterId] @param {string | null} [ownerId] */
    async listEvents(runId, afterId = 0, ownerId = null) {
      const ownerFilter = ownerId
        ? sql`and exists (select 1 from agent_runtime.runs r where r.id = run_id and r.owner_id = ${ownerId})`
        : sql``;
      return sql`
        select id, event, created_at
        from agent_runtime.events
        where run_id = ${runId} and id > ${afterId} ${ownerFilter}
        order by id asc
        limit 200
      `;
    },

    /** @param {string} runId @param {number} afterId @param {string} ownerId */
    async readStreamBatch(runId, afterId, ownerId) {
      const [row] = await sql`
        select r.id, r.status,
          coalesce((
            select jsonb_agg(jsonb_build_object('id', e.id, 'event', e.event, 'created_at', e.created_at) order by e.id)
            from (
              select id, event, created_at
              from agent_runtime.events
              where run_id = r.id and id > ${afterId}
              order by id asc
              limit 200
            ) e
          ), '[]'::jsonb) as events
        from agent_runtime.runs r
        where r.id = ${runId} and r.owner_id = ${ownerId}
      `;
      return row ?? null;
    },

    /** @param {string} workerId @param {number} leaseMs */
    async claimNext(workerId, leaseMs) {
      const leaseToken = randomUUID();
      const leaseSeconds = Math.max(5, Math.ceil(leaseMs / 1000));
      const rows = await sql`
        with candidate as (
          select id
          from agent_runtime.runs
          where status = 'queued' and next_attempt_at <= now()
          order by created_at asc
          for update skip locked
          limit 1
        )
        update agent_runtime.runs r
        set status = 'running',
            attempts = attempts + 1,
            lease_owner = ${workerId},
            lease_token = ${leaseToken},
            lease_expires_at = now() + (${leaseSeconds} * interval '1 second'),
            heartbeat_at = now(),
            started_at = coalesce(started_at, now()),
            updated_at = now()
        from candidate
        where r.id = candidate.id
        returning r.*
      `;
      return rows[0] ?? null;
    },

    /** @param {string} runId @param {string} leaseToken @param {Record<string, any>} event */
    async appendEvent(runId, leaseToken, event) {
      const rows = await sql`
        insert into agent_runtime.events (run_id, event)
        select id, ${sql.json(event)}
        from agent_runtime.runs
        where id = ${runId} and status = 'running' and lease_token = ${leaseToken}
        returning id
      `;
      if (!rows[0]) throw new Error("Agent run lease was lost while writing an event");
      return Number(rows[0].id);
    },

    /** @param {string} runId @param {string} leaseToken @param {number} leaseMs */
    async heartbeat(runId, leaseToken, leaseMs) {
      const leaseSeconds = Math.max(5, Math.ceil(leaseMs / 1000));
      const rows = await sql`
        update agent_runtime.runs
        set heartbeat_at = now(),
            lease_expires_at = now() + (${leaseSeconds} * interval '1 second'),
            updated_at = now()
        where id = ${runId} and status = 'running' and lease_token = ${leaseToken}
        returning cancel_requested_at
      `;
      return rows[0] ? { active: true, cancelRequested: Boolean(rows[0].cancel_requested_at) } : { active: false, cancelRequested: false };
    },

    /** @param {string} runId @param {string} leaseToken @param {Record<string, any>} event */
    async finish(runId, leaseToken, event) {
      return sql.begin(async (tx) => {
        const rows = await tx`
          update agent_runtime.runs
          set status = 'completed', completed_at = now(), updated_at = now(),
              lease_owner = null, lease_token = null, lease_expires_at = null
          where id = ${runId} and status = 'running' and lease_token = ${leaseToken}
          returning id
        `;
        if (!rows[0]) return false;
        await tx`insert into agent_runtime.events (run_id, event) values (${runId}, ${tx.json(event)})`;
        return true;
      });
    },

    /** @param {string} runId @param {string | null} [ownerId] */
    async cancel(runId, ownerId = null) {
      const ownerFilter = ownerId ? sql`and owner_id = ${ownerId}` : sql``;
      return sql.begin(async (tx) => {
        const rows = await tx`
          update agent_runtime.runs
          set cancel_requested_at = now(),
              status = case when status = 'queued' then 'cancelled' else status end,
              completed_at = case when status = 'queued' then now() else completed_at end,
              updated_at = now()
          where id = ${runId} and status in ('queued', 'running') ${ownerFilter}
          returning id, status
        `;
        if (!rows[0]) return false;
        if (rows[0].status === "cancelled") {
          await tx`insert into agent_runtime.events (run_id, event) values (
            ${runId},
            ${tx.json({ type: "RUN_ERROR", message: "Run cancelled", code: "cancelled" })}
          )`;
        }
        return true;
      });
    },

    /** @param {string} runId @param {string} leaseToken */
    async markCancelled(runId, leaseToken) {
      return sql.begin(async (tx) => {
        const rows = await tx`
          update agent_runtime.runs
          set status = 'cancelled', completed_at = now(), updated_at = now(),
              lease_owner = null, lease_token = null, lease_expires_at = null
          where id = ${runId} and status = 'running' and lease_token = ${leaseToken}
          returning id
        `;
        if (!rows[0]) return false;
        await tx`insert into agent_runtime.events (run_id, event) values (
          ${runId},
          ${tx.json({ type: "RUN_ERROR", message: "Run cancelled", code: "cancelled" })}
        )`;
        return true;
      });
    },

    /** @param {string} runId @param {string} leaseToken @param {unknown} error @param {boolean} retryable */
    async fail(runId, leaseToken, error, retryable) {
      const message = error instanceof Error ? error.message : String(error);
      const category = retryable ? "transient" : "permanent";
      return sql.begin(async (tx) => {
        const [run] = await tx`
          select attempts, max_attempts,
            (select count(*)::int from agent_runtime.events e where e.run_id = r.id and e.event->>'type' <> 'RUN_STARTED') as emitted_events
          from agent_runtime.runs r
          where id = ${runId} and status = 'running' and lease_token = ${leaseToken}
          for update
        `;
        if (!run) return "lost";
        const canRetry = retryable && run.attempts < run.max_attempts && Number(run.emitted_events) === 0;
        if (canRetry) {
          const delaySeconds = Math.min(30, 2 ** Math.max(0, run.attempts - 1));
          await tx`
            update agent_runtime.runs
            set status = 'queued', next_attempt_at = now() + (${delaySeconds} * interval '1 second'),
                last_error = ${message}, error_category = ${category}, updated_at = now(),
                lease_owner = null, lease_token = null, lease_expires_at = null
            where id = ${runId}
          `;
          return "queued";
        }
        await tx`insert into agent_runtime.events (run_id, event) values (
          ${runId},
          ${tx.json({ type: "RUN_ERROR", message: "Agent run failed. Please try again.", code: category })}
        )`;
        await tx`
          update agent_runtime.runs
          set status = 'failed', completed_at = now(), last_error = ${message}, error_category = ${category},
              updated_at = now(), lease_owner = null, lease_token = null, lease_expires_at = null
          where id = ${runId}
        `;
        return "failed";
      });
    },

    async recoverStaleRuns() {
      const stale = await sql`
        select id, attempts, max_attempts,
          (select count(*)::int from agent_runtime.events e where e.run_id = r.id and e.event->>'type' <> 'RUN_STARTED') as emitted_events
        from agent_runtime.runs r
        where status = 'running' and lease_expires_at < now()
      `;
      for (const run of stale) {
        if (Number(run.emitted_events) === 0 && run.attempts < run.max_attempts) {
          await sql`
            update agent_runtime.runs
            set status = 'queued', next_attempt_at = now(), updated_at = now(),
                lease_owner = null, lease_token = null, lease_expires_at = null,
                last_error = 'Agent process stopped before producing output', error_category = 'interrupted'
            where id = ${run.id} and status = 'running' and lease_expires_at < now()
          `;
        } else {
          await sql.begin(async (tx) => {
            const rows = await tx`
              update agent_runtime.runs
              set status = 'failed', completed_at = now(), updated_at = now(),
                  lease_owner = null, lease_token = null, lease_expires_at = null,
                  last_error = 'Agent process stopped after output began', error_category = 'interrupted'
              where id = ${run.id} and status = 'running' and lease_expires_at < now()
              returning id
            `;
            if (rows[0]) {
              await tx`insert into agent_runtime.events (run_id, event) values (
                ${run.id},
                ${tx.json({ type: "RUN_ERROR", message: "Agent run was interrupted. Please retry.", code: "interrupted" })}
              )`;
            }
          });
        }
      }
      return stale.length;
    },

    async statusSummary() {
      const counts = await sql`select status, count(*)::int as count from agent_runtime.runs group by status order by status`;
      const [queue] = await sql`
        select extract(epoch from (now() - min(created_at)))::int as oldest_queued_seconds
        from agent_runtime.runs where status = 'queued'
      `;
      const [leases] = await sql`
        select count(*)::int as stale_leases
        from agent_runtime.runs where status = 'running' and lease_expires_at < now()
      `;
      return {
        counts: Object.fromEntries(counts.map((row) => [row.status, row.count])),
        oldestQueuedSeconds: queue?.oldest_queued_seconds ?? null,
        staleLeases: leases?.stale_leases ?? 0,
      };
    },

    /** @param {string} runId */
    async retry(runId) {
      return sql.begin(async (tx) => {
        const [source] = await tx`
          select input, owner_id, max_attempts
          from agent_runtime.runs
          where id = ${runId} and status in ('failed', 'cancelled')
          for update
        `;
        if (!source) return null;
        const retryRunId = randomUUID();
        const input = { ...source.input, runId: retryRunId, threadId: retryRunId };
        await tx`
          insert into agent_runtime.runs (id, thread_id, owner_id, input, input_hash, max_attempts)
          values (${retryRunId}, ${retryRunId}, ${source.owner_id}, ${tx.json(input)}, ${inputHash(input)}, ${source.max_attempts})
        `;
        return retryRunId;
      });
    },

    /** @param {number} retentionDays */
    async prune(retentionDays) {
      return sql.begin(async (tx) => {
        const doomed = await tx`
          delete from agent_runtime.runs
          where status in ('completed', 'failed', 'cancelled')
            and completed_at < now() - (${retentionDays} * interval '1 day')
          returning id, thread_id
        `;
        const threadIds = [...new Set(doomed.map((run) => run.thread_id))];
        if (threadIds.length === 0) return 0;
        const orphaned = await tx`
          select candidate.thread_id
          from unnest(${threadIds}::text[]) as candidate(thread_id)
          where not exists (
            select 1 from agent_runtime.runs retained
            where retained.thread_id = candidate.thread_id
          )
        `;
        const orphanedThreadIds = orphaned.map((row) => row.thread_id);
        if (orphanedThreadIds.length > 0) {
          await tx`delete from agent_runtime.checkpoint_writes where thread_id = any(${orphanedThreadIds}::text[])`;
          await tx`delete from agent_runtime.checkpoint_blobs where thread_id = any(${orphanedThreadIds}::text[])`;
          await tx`delete from agent_runtime.checkpoints where thread_id = any(${orphanedThreadIds}::text[])`;
        }
        return doomed.length;
      });
    },

  };
}
