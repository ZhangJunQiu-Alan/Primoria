-- Add price column to courses table.
-- Stores the numeric price in the author's local currency.
-- Defaults to 0 (free). price_tier='free' courses should always have price=0.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0
  CONSTRAINT courses_price_non_negative CHECK (price >= 0);
