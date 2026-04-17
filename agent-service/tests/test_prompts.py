import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.prompts import build_user_prompt
from app.schemas import ChatContext


def test_chat_context_accepts_lesson_page_grounding_fields():
    context = ChatContext(
        surface='lesson-runtime',
        course_id='course-1',
        lesson_id='lesson-1',
        block_id='mc-1',
        locale='en-US',
        lesson_title='Lesson A',
        page_index=1,
        page_count=2,
        page_title='Page 1',
        page_content='Visible content',
        learner_state='Answered incorrectly',
    )

    assert context.lesson_title == 'Lesson A'
    assert context.page_index == 1
    assert context.page_count == 2
    assert context.page_title == 'Page 1'
    assert context.page_content == 'Visible content'
    assert context.learner_state == 'Answered incorrectly'


def test_build_user_prompt_adds_lesson_grounding_rules_and_page_state():
    context = ChatContext(
        surface='lesson-runtime',
        course_id='course-1',
        lesson_id='lesson-1',
        lesson_title='Lesson A',
        page_index=1,
        page_count=2,
        page_title='Page 1',
        page_content='Visible content',
        learner_state='Answered incorrectly',
    )

    prompt = build_user_prompt(
        'Explain this page.',
        context,
        relevant_memories=[{'content': 'Prefers concise answers.', 'kind': 'preference', 'source': 'memory'}],
    )

    assert 'lesson_title: Lesson A' in prompt
    assert 'page: 1/2' in prompt
    assert 'page_content:\nVisible content' in prompt
    assert 'learner_state:\nAnswered incorrectly' in prompt
    assert 'Prioritize the visible current-page content and learner state.' in prompt
    assert 'Do not reveal hidden future questions' in prompt
    assert 'Learner request:\nExplain this page.' in prompt
