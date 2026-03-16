from utils.supabase_client import SupabaseClient


def test_us3_user_can_enroll_and_see_lessons(
    client: SupabaseClient, make_user_session
):
    """US3: As a learner, I can enroll in Basics of Psychology and access lessons."""
    session = make_user_session()
    course = client.get_course_by_slug("basics-of-psychology")

    client.upsert_enrollment(
        user_id=session["user_id"],
        course_id=course["id"],
        access_token=session["access_token"],
    )

    enrollment = client.get_enrollment(
        user_id=session["user_id"],
        course_id=course["id"],
        access_token=session["access_token"],
    )

    assert enrollment["status"] in ("in_progress", "completed")

    lessons = client.list_lessons(
        course_id=course["id"],
        access_token=session["access_token"],
    )
    titles = [lesson.get("title", "") for lesson in lessons]

    assert len(lessons) >= 2, "Expected at least 2 lessons in Basics of Psychology"
    assert "Basics of Psychology" in titles
