from pydantic import BaseModel, Field


class ChatHistoryMessage(BaseModel):
    role: str
    text: str


class ChatContext(BaseModel):
    surface: str | None = None
    course_id: str | None = None
    lesson_id: str | None = None
    block_id: str | None = None
    locale: str | None = None


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
