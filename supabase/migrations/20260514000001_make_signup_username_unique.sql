-- Make auth signup profile creation resilient to duplicate or invalid display names.
-- Supabase Auth surfaces trigger failures as "Database error saving new user";
-- this keeps profile.username unique while preserving the user's preferred base name when possible.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    base_username TEXT;
    candidate_username TEXT;
    suffix TEXT;
    attempt INTEGER := 0;
BEGIN
    base_username := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
        NULLIF(TRIM(split_part(NEW.email, '@', 1)), ''),
        'learner'
    );

    -- Keep usernames compact and within the existing CHECK(length(username) BETWEEN 3 AND 32).
    base_username := regexp_replace(base_username, '\s+', '-', 'g');
    base_username := regexp_replace(base_username, '^-+|-+$', '', 'g');

    IF length(base_username) < 3 THEN
        base_username := 'user-' || left(replace(NEW.id::TEXT, '-', ''), 8);
    END IF;

    base_username := left(base_username, 32);
    candidate_username := base_username;

    LOOP
        BEGIN
            INSERT INTO public.profiles (id, username)
            VALUES (NEW.id, candidate_username);
            RETURN NEW;
        EXCEPTION WHEN unique_violation THEN
            attempt := attempt + 1;
            suffix := '-' || left(md5(NEW.id::TEXT || ':' || attempt::TEXT), 6);
            candidate_username := left(base_username, 32 - length(suffix)) || suffix;

            IF attempt >= 20 THEN
                candidate_username := 'user-' || left(replace(NEW.id::TEXT, '-', ''), 8);
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
