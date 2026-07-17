DO $$
DECLARE
  missing_owner_count bigint;
BEGIN
  SELECT count(*) INTO missing_owner_count
  FROM agent_runtime.runs
  WHERE owner_id IS NULL OR btrim(owner_id) = '';

  IF missing_owner_count > 0 THEN
    RAISE EXCEPTION 'Agent owner preflight failed: % runs have no owner', missing_owner_count;
  END IF;
END $$;

ALTER TABLE agent_runtime.runs
  ALTER COLUMN owner_id SET NOT NULL;

ALTER TABLE agent_runtime.runs
  ADD CONSTRAINT agent_runtime_runs_owner_check
  CHECK (length(btrim(owner_id)) BETWEEN 1 AND 200);
