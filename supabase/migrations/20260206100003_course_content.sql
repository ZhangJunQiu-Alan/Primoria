-- ============================================================
-- 2. 课程内容 (Course Content)
-- ============================================================

-- -------------------- subjects (学科/分类) --------------------
CREATE TABLE subjects (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL UNIQUE,
    icon_url          TEXT,
    color_hex         TEXT CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    parent_subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select_public"
    ON subjects FOR SELECT USING (true);

-- -------------------- courses (课程) --------------------
CREATE TABLE courses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id        UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title             TEXT NOT NULL,
    slug              TEXT NOT NULL UNIQUE,
    description       TEXT,
    thumbnail_url     TEXT,
    difficulty_level  difficulty_level NOT NULL DEFAULT 'beginner',
    status            course_status NOT NULL DEFAULT 'draft',
    estimated_minutes INTEGER NOT NULL DEFAULT 0,
    tags              TEXT[] NOT NULL DEFAULT '{}',
    price_tier        price_tier NOT NULL DEFAULT 'free',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at      TIMESTAMPTZ,
    search_tsv        TSVECTOR
);

-- 触发器函数：维护 courses.search_tsv
CREATE OR REPLACE FUNCTION courses_search_tsv_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_tsv :=
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_courses_search_tsv
    BEFORE INSERT OR UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION courses_search_tsv_trigger();

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 全文检索索引
CREATE INDEX idx_courses_search_tsv ON courses USING GIN(search_tsv);
CREATE INDEX idx_courses_author_id ON courses(author_id);
CREATE INDEX idx_courses_subject_id ON courses(subject_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_tags ON courses USING GIN(tags);
CREATE INDEX idx_courses_slug ON courses(slug);

-- RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_select_published_or_own"
    ON courses FOR SELECT
    USING (status = 'published' OR auth.uid() = author_id);

CREATE POLICY "courses_insert_own"
    ON courses FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "courses_update_own"
    ON courses FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "courses_delete_own"
    ON courses FOR DELETE USING (auth.uid() = author_id);

-- -------------------- chapters (章节) --------------------
CREATE TABLE chapters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    sort_key    BIGINT NOT NULL DEFAULT 1000,
    is_locked   BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (course_id, sort_key)
);

CREATE INDEX idx_chapters_course_sort ON chapters(course_id, sort_key);

-- RLS
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapters_select_via_course"
    ON chapters FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = chapters.course_id
              AND (courses.status = 'published' OR courses.author_id = auth.uid())
        )
    );

CREATE POLICY "chapters_insert_author"
    ON chapters FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = chapters.course_id
              AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "chapters_update_author"
    ON chapters FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = chapters.course_id
              AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "chapters_delete_author"
    ON chapters FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = chapters.course_id
              AND courses.author_id = auth.uid()
        )
    );

-- -------------------- lessons (子课程) --------------------
CREATE TABLE lessons (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id        UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    type              lesson_type NOT NULL DEFAULT 'interactive',
    sort_key          BIGINT NOT NULL DEFAULT 1000,
    xp_reward         INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
    duration_seconds  INTEGER NOT NULL DEFAULT 0,
    content_json      JSONB NOT NULL DEFAULT '{}',
    content_hash      TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chapter_id, sort_key)
);

CREATE TRIGGER trg_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_lessons_chapter_sort ON lessons(chapter_id, sort_key);

-- RLS
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons_select_via_course"
    ON lessons FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chapters
            JOIN courses ON courses.id = chapters.course_id
            WHERE chapters.id = lessons.chapter_id
              AND (courses.status = 'published' OR courses.author_id = auth.uid())
        )
    );

CREATE POLICY "lessons_insert_author"
    ON lessons FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chapters
            JOIN courses ON courses.id = chapters.course_id
            WHERE chapters.id = lessons.chapter_id
              AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "lessons_update_author"
    ON lessons FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chapters
            JOIN courses ON courses.id = chapters.course_id
            WHERE chapters.id = lessons.chapter_id
              AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "lessons_delete_author"
    ON lessons FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chapters
            JOIN courses ON courses.id = chapters.course_id
            WHERE chapters.id = lessons.chapter_id
              AND courses.author_id = auth.uid()
        )
    );

-- -------------------- content_blocks (内容块 - Source of Truth) --------------------
CREATE TABLE content_blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    type            block_type NOT NULL,
    content         JSONB NOT NULL DEFAULT '{}',
    config          JSONB NOT NULL DEFAULT '{}',
    sort_key        BIGINT NOT NULL DEFAULT 1000,
    is_interactive  BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE (lesson_id, sort_key)
);

CREATE TRIGGER trg_content_blocks_updated_at
    BEFORE UPDATE ON content_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_content_blocks_lesson_sort ON content_blocks(lesson_id, sort_key);

-- RLS
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_select_via_course"
    ON content_blocks FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lessons
            JOIN chapters ON chapters.id = lessons.chapter_id
            JOIN courses  ON courses.id  = chapters.course_id
            WHERE lessons.id = content_blocks.lesson_id
              AND (courses.status = 'published' OR courses.author_id = auth.uid())
        )
    );

CREATE POLICY "blocks_insert_author"
    ON content_blocks FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM lessons
            JOIN chapters ON chapters.id = lessons.chapter_id
            JOIN courses  ON courses.id  = chapters.course_id
            WHERE lessons.id = content_blocks.lesson_id
              AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "blocks_update_author"
    ON content_blocks FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM lessons
            JOIN chapters ON chapters.id = lessons.chapter_id
            JOIN courses  ON courses.id  = chapters.course_id
            WHERE lessons.id = content_blocks.lesson_id
              AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "blocks_delete_author"
    ON content_blocks FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM lessons
            JOIN chapters ON chapters.id = lessons.chapter_id
            JOIN courses  ON courses.id  = chapters.course_id
            WHERE lessons.id = content_blocks.lesson_id
              AND courses.author_id = auth.uid()
        )
    );
