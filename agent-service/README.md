# Primoria Agent Service

Primoria 的 AI agent 服务，面向 `packages/viewer-react` 的 `/ai-tutor` 页面和 Builder 侧课程生成能力。

长期产品目标是支持用户通过自然语言生成一整套类似教科书的完整互动课程。生成结果必须能落到 Primoria 的规范层级：`Course -> Lesson -> Page -> Block`。其中 `interactive-visual` 是关键 Block 类型，目标是 Brilliant 式互动学习体验。

## v1 能力

- 基于 Supabase 用户会话的 authenticated chat
- 读取用户 profile / stats / enrollments / course / lesson context
- 使用 LangChain Deep Agents 组织 tool-calling
- thread short-term memory（Supabase `agent_thread_checkpoints`）
- user long-term memory（已迁移为 Supabase `agent_memories`）
- Builder 课程生成服务：从自然语言和上下文生成 course brief、outline、lesson plan、critique 和 course draft
- 生成 course draft 时必须保持 lesson/page/block 层级，并优先为适合视觉化的概念生成 interactive visualization block

## 环境变量

```bash
AGENT_SERVICE_ENV=development
AGENT_SERVICE_HOST=0.0.0.0
AGENT_SERVICE_PORT=8787
AGENT_MEMORY_ROOT=data/memory
AGENT_SERVICE_CORS_ORIGINS=http://localhost:5180,http://127.0.0.1:5180

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# 推荐沿用现有 Gemini 体系
GOOGLE_API_KEY=YOUR_GEMINI_KEY
AGENT_MODEL=gemini-2.5-pro
MEMORY_SUMMARY_MODEL=gemini-2.5-pro
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
- `GET /v1/memory/inspect`
- Builder 课程生成相关接口位于 `app/routes/builder.py`，由前端 Builder 工作台调用

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
如果配置了 `GOOGLE_API_KEY`，summary 合并会优先使用 Gemini；没有 key 时回退到规则压缩。

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
