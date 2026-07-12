CREATE SCHEMA IF NOT EXISTS agent_runtime;

CREATE TABLE IF NOT EXISTS agent_runtime.runs (
  id text PRIMARY KEY,
  thread_id text NOT NULL,
  owner_id text,
  input jsonb NOT NULL,
  input_hash text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 2,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_owner text,
  lease_token text,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  cancel_requested_at timestamptz,
  last_error text,
  error_category text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_runtime_runs_status_check
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  CONSTRAINT agent_runtime_runs_attempts_check
    CHECK (attempts >= 0 AND max_attempts > 0)
);

CREATE INDEX IF NOT EXISTS agent_runtime_runs_claim_idx
  ON agent_runtime.runs (status, next_attempt_at, lease_expires_at, created_at);

CREATE INDEX IF NOT EXISTS agent_runtime_runs_owner_created_idx
  ON agent_runtime.runs (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_runtime.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id text NOT NULL REFERENCES agent_runtime.runs(id) ON DELETE CASCADE,
  event jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_runtime_events_run_id_idx
  ON agent_runtime.events (run_id, id);
