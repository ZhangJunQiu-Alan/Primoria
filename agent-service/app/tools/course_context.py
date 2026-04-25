from langchain_core.tools import tool


def build_course_context_tools(supabase_client):
    @tool
    async def get_course_context(course_id: str) -> dict:
        """Fetch a course and its ordered lessons for learner guidance."""
        course = await supabase_client.select(
            'courses',
            select='id,title,description,difficulty_level,estimated_minutes,tags,status,subject_id',
            filters={'id': f'eq.{course_id}'},
            single=True,
        )
        lessons = await supabase_client.select(
            'lessons',
            select='id,title,type,sort_key,xp_reward,duration_seconds,is_locked,unlock_type,prerequisite_lesson_id',
            filters={'course_id': f'eq.{course_id}'},
            order='sort_key.asc',
            limit=200,
        )
        return {'course': course or {}, 'lessons': lessons}

    @tool
    async def get_course_content_bundle(course_id: str, mode: str = 'summary', lesson_limit: int = 12) -> dict:
        """Fetch course-level teaching content across lessons.

        Use mode='lesson_titles_only' when the learner mainly needs the lesson list or directory.
        Use mode='summary' for most course-level, cross-lesson, recap, outline, or structure questions.
        Use mode='full' only when detailed lesson content across the course is necessary.
        """
        course = await supabase_client.select(
            'courses',
            select='id,title,description,difficulty_level,estimated_minutes,tags,status,subject_id',
            filters={'id': f'eq.{course_id}'},
            single=True,
        )
        lessons = await supabase_client.select(
            'lessons',
            select='id,title,type,sort_key,xp_reward,duration_seconds,is_locked,unlock_type,prerequisite_lesson_id,content_json',
            filters={'course_id': f'eq.{course_id}'},
            order='sort_key.asc',
            limit=max(1, min(lesson_limit, 30)),
        )

        normalized_mode = mode.strip().lower() if mode else 'summary'
        if normalized_mode == 'lesson_titles_only':
            return {
                'course': course or {},
                'lessons': [
                    {
                        'id': lesson.get('id'),
                        'title': lesson.get('title'),
                        'sort_key': lesson.get('sort_key'),
                        'type': lesson.get('type'),
                    }
                    for lesson in lessons or []
                ],
                'mode': 'lesson_titles_only',
            }
        if normalized_mode == 'full':
            return {
                'course': course or {},
                'lessons': lessons,
                'mode': 'full',
            }

        summary_lessons: list[dict] = []
        for lesson in lessons or []:
            content_json = lesson.get('content_json') if isinstance(lesson, dict) else {}
            pages = []
            if isinstance(content_json, dict):
                raw_pages = content_json.get('pages')
                if isinstance(raw_pages, list):
                    pages = raw_pages
            page_count = len(pages)
            block_count = sum(len(page.get('blocks') or []) for page in pages if isinstance(page, dict))
            block_types = []
            for page in pages:
                if not isinstance(page, dict):
                    continue
                for block in page.get('blocks') or []:
                    if not isinstance(block, dict):
                        continue
                    block_type = str(block.get('type') or '').strip()
                    if block_type and block_type not in block_types:
                        block_types.append(block_type)
            summary_lessons.append(
                {
                    'id': lesson.get('id'),
                    'title': lesson.get('title'),
                    'sort_key': lesson.get('sort_key'),
                    'type': lesson.get('type'),
                    'xp_reward': lesson.get('xp_reward'),
                    'duration_seconds': lesson.get('duration_seconds'),
                    'page_count': page_count,
                    'block_count': block_count,
                    'block_types': block_types,
                    'content_preview': {
                        'lesson_id': content_json.get('lesson_id') if isinstance(content_json, dict) else None,
                        'title': content_json.get('title') if isinstance(content_json, dict) else None,
                    },
                }
            )

        return {
            'course': course or {},
            'lessons': summary_lessons,
            'mode': 'summary',
        }

    return [get_course_context, get_course_content_bundle]
