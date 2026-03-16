from utils.supabase_client import SupabaseClient


def test_us1_social_catalog_has_basics_as_second_course(client: SupabaseClient):
    """US1: As a learner, I can see Basics of Psychology under Social."""
    social = client.get_subject_by_name("Social")
    courses = client.list_social_courses(subject_id=social["id"])

    slugs = [c.get("slug") for c in courses]

    assert "intro-to-psychology" in slugs, "Intro to Psychology is missing"
    assert "basics-of-psychology" in slugs, "Basics of Psychology is missing"

    intro_idx = slugs.index("intro-to-psychology")
    basics_idx = slugs.index("basics-of-psychology")

    assert intro_idx < basics_idx, (
        "Expected Basics of Psychology to appear after Intro to Psychology "
        "in Social course order"
    )
