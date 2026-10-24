-- Tutor style now lives only in learner_profiles.tutor_style and reaches the
-- Agent as run state. Onboarding used to mirror it into a synthetic
-- `preference` fact (evidence event `onboarding:tutor_style`) whose text was one
-- of three fixed strings; it leaked into lesson planning and, once Settings can
-- change the style, would contradict it. Delete exactly those rows, including
-- ones the extractor later reinforced (their text is still the stale mirror).
-- A row the learner rewrote in Settings keeps the onboarding evidence but no
-- longer matches the text, so it is kept. Delete rather than dismiss: a
-- dismissed row is an extractor tombstone and would block a genuinely learned
-- similar preference.
DELETE FROM "learner_facts"
WHERE "category" = 'preference'
  AND "evidence" @> '[{"eventIds": ["onboarding:tutor_style"]}]'::jsonb
  AND "text" IN (
    'Selected Socrates as tutor; prefers guiding questions before direct answers.',
    'Selected Richard Feynman as tutor; prefers intuition and analogies before formal details.',
    'Selected Euclid as tutor; prefers precise definitions and structured reasoning.'
  );
