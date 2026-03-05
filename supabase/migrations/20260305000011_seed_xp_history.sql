-- Seed XP history for 791667283@qq.com over the past 120 days
-- Skip days that already have data; ~28% of days will have 0 XP.

DO $$
DECLARE
  v_user_id  UUID;
  v_roll     FLOAT;
  v_xp       INT;
  v_ts       TIMESTAMPTZ;
  v_day_ts   TIMESTAMPTZ;
  v_exists   BOOLEAN;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = '791667283@qq.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User 791667283@qq.com not found';
  END IF;

  FOR i IN 0..119 LOOP
    v_roll := random();

    -- ~28% of days → no XP (0 day)
    IF v_roll < 0.28 THEN
      CONTINUE;
    END IF;

    -- Weighted XP range
    v_xp := CASE
      WHEN v_roll < 0.50 THEN (random() * 29 + 1)::INT
      WHEN v_roll < 0.72 THEN (random() * 49 + 31)::INT
      WHEN v_roll < 0.88 THEN (random() * 69 + 81)::INT
      ELSE                    (random() * 100 + 151)::INT
    END;

    -- Timestamp: random hour within the day (server stores UTC)
    v_day_ts := (NOW() - (i || ' days')::INTERVAL)::DATE::TIMESTAMPTZ;
    v_ts     := v_day_ts + ((random() * 21 + 1) || ' hours')::INTERVAL;

    -- Skip if this user already has an entry on that calendar day
    SELECT EXISTS(
      SELECT 1 FROM xp_transactions
      WHERE user_id  = v_user_id
        AND created_at >= v_day_ts
        AND created_at <  v_day_ts + INTERVAL '1 day'
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO xp_transactions (user_id, amount, source_type, created_at)
      VALUES (v_user_id, v_xp, 'lesson_complete', v_ts);
    END IF;
  END LOOP;
END $$;
