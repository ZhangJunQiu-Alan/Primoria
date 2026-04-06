ALTER TABLE user_settings
  ADD COLUMN ai_tutor_persona text NOT NULL DEFAULT 'gentle'
    CHECK (ai_tutor_persona IN ('gentle', 'socratic', 'coach')),
  ADD COLUMN home_companion_enabled boolean NOT NULL DEFAULT true;
