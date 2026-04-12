from pydantic import BaseModel, Field
from typing import Any, Literal


class ChatHistoryMessage(BaseModel):
    role: str
    text: str


class ChatContext(BaseModel):
    surface: str | None = None
    course_id: str | None = None
    lesson_id: str | None = None
    block_id: str | None = None
    locale: str | None = None
    ui_language: str | None = None
    ai_tutor_persona: str | None = None


class ChatRequest(BaseModel):
    thread_id: str | None = None
    message: str = Field(min_length=1)
    history: list[ChatHistoryMessage] = Field(default_factory=list)
    context: ChatContext = Field(default_factory=ChatContext)


class ChatResponse(BaseModel):
    thread_id: str
    reply: str
    used_tools: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str = 'ok'


class AgentThreadSummary(BaseModel):
    id: str
    title: str | None = None
    surface: str
    course_id: str | None = None
    lesson_id: str | None = None
    block_id: str | None = None
    locale: str | None = None
    ai_tutor_persona: str | None = None
    status: str
    created_at: str | None = None
    updated_at: str | None = None
    last_message_at: str | None = None


class AgentThreadMessage(BaseModel):
    id: str
    role: str
    content: str
    created_at: str | None = None
    metadata: dict = Field(default_factory=dict)


class CreateThreadRequest(BaseModel):
    context: ChatContext = Field(default_factory=ChatContext)
    title: str | None = None


class CreateThreadResponse(BaseModel):
    thread: AgentThreadSummary


class ThreadListResponse(BaseModel):
    threads: list[AgentThreadSummary] = Field(default_factory=list)


class ThreadMessagesResponse(BaseModel):
    thread: AgentThreadSummary
    messages: list[AgentThreadMessage] = Field(default_factory=list)


class TutorToolRequest(BaseModel):
    history: list[ChatHistoryMessage] = Field(default_factory=list)
    context: ChatContext = Field(default_factory=ChatContext)


class TutorMindMapNode(BaseModel):
    id: str
    label: str


class TutorMindMapResponse(BaseModel):
    title: str
    nodes: list[TutorMindMapNode] = Field(default_factory=list)


class TutorQuizQuestion(BaseModel):
    prompt: str
    options: list[str] = Field(default_factory=list)
    answerIndex: int


class TutorQuizResponse(BaseModel):
    title: str
    questions: list[TutorQuizQuestion] = Field(default_factory=list)


class TutorPresentationSlide(BaseModel):
    title: str
    bullet: str


class TutorPresentationResponse(BaseModel):
    title: str
    slides: list[TutorPresentationSlide] = Field(default_factory=list)


class CourseDetailLesson(BaseModel):
    id: str
    title: str
    sort_key: int
    xp_reward: int
    duration_seconds: int
    is_locked: bool
    unlock_type: str


class CourseDetailResponse(BaseModel):
    course: dict
    lessons: list[CourseDetailLesson] = Field(default_factory=list)
    completed_lesson_ids: list[str] = Field(default_factory=list)
    enrollment: dict | None = None


class BuilderBlockPosition(BaseModel):
    order: int


class BuilderBlock(BaseModel):
    id: str
    type: str
    position: BuilderBlockPosition
    style: dict[str, Any] | None = None
    visibilityRule: str | None = None
    content: dict[str, Any] = Field(default_factory=dict)


class BuilderPage(BaseModel):
    page_id: str
    order: int
    blocks: list[BuilderBlock] = Field(default_factory=list)


class BuilderLesson(BaseModel):
    lesson_id: str
    title: str
    pages: list[BuilderPage] = Field(default_factory=list)


class BuilderCourseMetadata(BaseModel):
    title: str
    description: str | None = None
    author: dict[str, Any] | None = None
    tags: list[str] = Field(default_factory=list)
    difficulty_level: Literal['beginner', 'intermediate', 'advanced'] | None = None
    estimated_minutes: int | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    version: str | None = None
    thumbnail: str | None = None


class BuilderCourseSettings(BaseModel):
    theme: Literal['light', 'dark'] | None = None
    primaryColor: str | None = None
    fontFamily: str | None = None


class BuilderCourseDraft(BaseModel):
    schema_version: str | None = None
    course_id: str
    metadata: BuilderCourseMetadata
    settings: BuilderCourseSettings | None = None
    lessons: list[BuilderLesson] = Field(default_factory=list)
    schema_url: str | None = Field(default=None, alias='$schema')

    model_config = {'populate_by_name': True}


class SaveBuilderCourseDraftRequest(BaseModel):
    draft: BuilderCourseDraft


class SaveBuilderCourseDraftResponse(BaseModel):
    course_id: str
    status: Literal['draft', 'published']
    saved_lessons: int


class PublishBuilderCourseRequest(BaseModel):
    draft: BuilderCourseDraft | None = None


class GenerateBuilderCourseDraftRequest(BaseModel):
    topic: str = Field(min_length=1)
    audience: str | None = None
    outcome: str | None = None
    pace: Literal['quick', 'balanced', 'deep'] = 'balanced'
    language: str | None = None
    difficulty_level: Literal['beginner', 'intermediate', 'advanced'] | None = None
    persist: bool = False


class GenerateBuilderCourseDraftResponse(BaseModel):
    draft: BuilderCourseDraft
    persisted: bool = False
    status: Literal['draft', 'published'] | None = None


class GeneratedCourseLessonPlan(BaseModel):
    title: str
    objective: str
    explanation: str
    key_points: list[str] = Field(default_factory=list)
    quiz_question: str
    quiz_options: list[str] = Field(default_factory=list)
    quiz_answer_index: int = 0
    quiz_explanation: str | None = None
    reflection_prompt: str | None = None


class GeneratedCoursePlan(BaseModel):
    title: str
    description: str
    difficulty_level: Literal['beginner', 'intermediate', 'advanced'] = 'beginner'
    estimated_minutes: int = 30
    tags: list[str] = Field(default_factory=list)
    lessons: list[GeneratedCourseLessonPlan] = Field(default_factory=list)


class BuilderCourseMutationRequest(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    thumbnailUrl: str | None = None
    difficultyLevel: Literal['beginner', 'intermediate', 'advanced'] = 'beginner'
    estimatedMinutes: int | None = None
    priceTier: Literal['free', 'premium'] = 'free'
    price: int | None = None


class BuilderAddLessonRequest(BaseModel):
    title: str = Field(min_length=1)


class BuilderImportCourseRequest(BaseModel):
    raw: dict[str, Any]


class GenerateInteractiveVisualRequest(BaseModel):
    prompt: str = Field(min_length=1)
    template: str | None = None
    title: str | None = None
    description: str | None = None


class GenerateInteractiveVisualResponse(BaseModel):
    html: str
