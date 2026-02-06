-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== Profiles Table ====================
-- User profiles (auto-created on signup)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==================== Courses Table ====================
CREATE TABLE courses (
    id TEXT PRIMARY KEY,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    current_draft_version_id TEXT,
    current_published_version_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Courses policies
CREATE POLICY "Published courses are viewable by everyone"
    ON courses FOR SELECT
    USING (status = 'published' OR auth.uid() = owner_id);

CREATE POLICY "Users can create their own courses"
    ON courses FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own courses"
    ON courses FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own courses"
    ON courses FOR DELETE
    USING (auth.uid() = owner_id);


-- ==================== Course Versions Table ====================
CREATE TABLE course_versions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    version INTEGER NOT NULL,
    content JSONB NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (course_id, version)
);

-- Enable RLS for course_versions
ALTER TABLE course_versions ENABLE ROW LEVEL SECURITY;

-- Course versions policies
CREATE POLICY "Published versions are viewable by everyone"
    ON course_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = course_versions.course_id
            AND (courses.status = 'published' OR courses.owner_id = auth.uid())
        )
    );

CREATE POLICY "Course owners can create versions"
    ON course_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = course_versions.course_id
            AND courses.owner_id = auth.uid()
        )
    );


-- ==================== Helper Functions ====================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to courses table
CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to profiles table
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ==================== RPC Functions ====================

-- Publish course function
CREATE OR REPLACE FUNCTION publish_course(p_course_id TEXT, p_version_id TEXT)
RETURNS void AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    -- Check ownership
    SELECT owner_id INTO v_owner_id
    FROM courses
    WHERE id = p_course_id;

    IF v_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'You do not have permission to publish this course';
    END IF;

    -- Update course status and published version
    UPDATE courses
    SET
        status = 'published',
        current_published_version_id = p_version_id,
        updated_at = NOW()
    WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Search courses function
CREATE OR REPLACE FUNCTION search_courses(
    p_query TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_difficulty TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    description TEXT,
    tags TEXT[],
    difficulty TEXT,
    estimated_minutes INTEGER,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.title,
        c.description,
        c.tags,
        c.difficulty,
        c.estimated_minutes,
        c.owner_id,
        c.created_at,
        c.updated_at
    FROM courses c
    WHERE
        c.status = 'published'
        AND (p_query IS NULL OR c.title ILIKE '%' || p_query || '%' OR c.description ILIKE '%' || p_query || '%')
        AND (p_tags IS NULL OR c.tags && p_tags)
        AND (p_difficulty IS NULL OR c.difficulty = p_difficulty)
    ORDER BY c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Recommend courses function (simple version - returns recent published courses)
CREATE OR REPLACE FUNCTION recommend_courses(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    description TEXT,
    tags TEXT[],
    difficulty TEXT,
    estimated_minutes INTEGER,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.title,
        c.description,
        c.tags,
        c.difficulty,
        c.estimated_minutes,
        c.owner_id,
        c.created_at,
        c.updated_at
    FROM courses c
    WHERE c.status = 'published'
    ORDER BY c.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================== Indexes ====================

-- Index for faster course queries
CREATE INDEX idx_courses_owner_id ON courses(owner_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_tags ON courses USING GIN(tags);
CREATE INDEX idx_courses_updated_at ON courses(updated_at DESC);

-- Index for course versions
CREATE INDEX idx_course_versions_course_id ON course_versions(course_id);
CREATE INDEX idx_course_versions_created_at ON course_versions(created_at DESC);
