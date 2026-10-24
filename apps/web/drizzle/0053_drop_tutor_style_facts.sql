-- Tutor style now lives only in learner_profiles.tutor_style and reaches the
-- Agent as run state. Onboarding used to mirror it into a synthetic
-- `preference` fact (evidence event `onboarding:tutor_style`) that also leaked
-- into lesson planning. Delete rather than dismiss: a dismissed row is an
-- extractor tombstone and would block a genuinely learned similar preference.
-- Rows the extractor later reinforced carry real evidence and are kept.
DELETE FROM "learner_facts"
WHERE "evidence" @> '[{"eventIds": ["onboarding:tutor_style"]}]'::jsonb
  AND jsonb_array_length("evidence") = 1;
