from utils.supabase_client import SupabaseClient


def test_us2_user_can_sign_up_and_sign_in(
    client: SupabaseClient, make_user_session
):
    """US2: As a learner, I can create an account and sign in."""
    session = make_user_session()

    assert session["email"].endswith("@primoria.test")
    assert session["access_token"]
    assert session["user_id"]

    # Sanity check: token should be accepted on a protected endpoint
    course = client.get_course_by_slug("basics-of-psychology")
    assert course["slug"] == "basics-of-psychology"
