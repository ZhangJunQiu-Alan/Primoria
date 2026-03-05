-- Add cover_image_url to profiles for single-current-cover feature.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
