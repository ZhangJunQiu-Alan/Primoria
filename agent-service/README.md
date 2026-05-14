# Primoria Agent Service

独立的 learner AI agent 服务，面向 `packages/viewer-react` 的 `/ai-tutor` 页面。

## v1 能力

- 基于 Supabase 用户会话的 authenticated chat
- 读取用户 profile / stats / enrollments / course / lesson context
- 使用 LangChain Deep Agents 组织 tool-calling
- thread short-term memory（Supabase `agent_thread_checkpoints`）
- user long-term memory（已迁移为 Supabase `agent_memories`）

## 环境变量

```bash
AGENT_SERVICE_ENV=development
AGENT_SERVICE_HOST=0.0.0.0
AGENT_SERVICE_PORT=8787
AGENT_MEMORY_ROOT=data/memory
AGENT_SERVICE_CORS_ORIGINS=http://localhost:5180,http://127.0.0.1:5180

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# 统一模型 API 服务配置；Viewer 的 AI 功能统一经由本服务转发
AI_PROVIDER=google
AI_MODEL=gemini-2.5-flash
AI_API_KEY=
AI_BASE_URL=

# Provider-specific override
GOOGLE_API_KEY=YOUR_GEMINI_KEY
# Alias also supported for compatibility:
GEMINI_API_KEY=
GOOGLE_MODEL=gemini-2.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
OPENAI_BASE_URL=https://api.openai.com/v1

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_BASE_URL=https://api.anthropic.com

AGENT_MODEL=gemini-2.5-flash
MEMORY_SUMMARY_MODEL=gemini-2.5-flash
```

## 本地启动

```bash
cd agent-service
uv sync
uv run uvicorn app.main:app --reload --port 8787
```

## 当前接口

- `GET /healthz`
- `POST /v1/chat`
- `POST /v1/chat/stream`
- `POST /v1/llm/tutor/reply`
- `POST /v1/llm/tutor/quiz-from-docs`
- `POST /v1/llm/tutor/mindmap-from-docs`
- `POST /v1/llm/interactive-visual`
- `GET /v1/memory/inspect`

## Memory 持久化结构

长期 memory 现在持久化到 Supabase：

```txt
public.agent_memories
  - global preferences / profile / goals
  - daily memory + summary
  - course memory + summary
  - lesson memory + summary
  - episodes

public.agent_threads
public.agent_thread_messages
public.agent_thread_checkpoints
```

- `agent_memories`: 结构化长期记忆主表
- `agent_threads`: 会话线程元数据
- `agent_thread_messages`: 会话消息
- `agent_thread_checkpoints`: LangGraph checkpoint 持久化

summary 不再写 `*.summary.md` 文件，而是写回 `agent_memories` 里的 `is_summary=true` 记录。
如果配置了 `GOOGLE_API_KEY` / `GEMINI_API_KEY` / `AI_API_KEY`，summary 合并会优先使用统一模型服务；没有 key 时回退到规则压缩。

## Memory Inspector

可以直接查看某个用户当前的 memory 全景：

```http
GET /v1/memory/inspect?course_id=course-1&lesson_id=lesson-9
Authorization: Bearer <supabase_access_token>
```

返回会包含：

- global preferences / profile / goals
- daily memory + summary
- current course memory + summary
- current lesson memory + summary
- recent episodes

请求示例：

```json
{
  "thread_id": "viewer:user-123:local-thread-1",
  "message": "我下一步该学什么？",
  "history": [
    { "role": "user", "text": "我最近在学网络基础" }
  ],
  "context": {
    "surface": "ai-tutor",
    "course_id": "course-uuid",
    "lesson_id": "lesson-uuid",
    "locale": "zh-CN"
  }
}
```

前端调用时应携带：

```http
Authorization: Bearer <supabase_access_token>
```
