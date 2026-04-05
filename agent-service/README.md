# Primoria Agent Service

独立的 learner AI agent 服务，面向 `packages/viewer-react` 的 `/ai-tutor` 页面。

## v1 能力

- 基于 Supabase 用户会话的 authenticated chat
- 读取用户 profile / stats / enrollments / course / lesson context
- 使用 LangChain Deep Agents 组织 tool-calling
- thread short-term memory（当前为文件持久化 checkpointer）
- user long-term memory（`preferences.md` / `profile.md` / `goals.md` / `episodes.jsonl`）

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
- `GET /v1/memory/inspect`

## Memory 落盘结构

默认会写到 `agent-service/data/memory`：

```txt
data/memory/
  checkpoints/
    storage.pkl
    writes.pkl
    blobs.pkl
  users/
    <user_id>/
      daily/
        YYYY-MM-DD.md
      courses/
        <course_id>/
          course.md
          lessons/
            <lesson_id>.md
      preferences.md
      profile.md
      goals.md
      episodes.jsonl
```

- `checkpoints/*.pkl`: thread short-term memory / checkpoint
- `preferences.md`: 稳定偏好
- `profile.md`: 背景信息 / 约束 / 用户画像
- `goals.md`: 学习目标
- `daily/YYYY-MM-DD.md`: 当天学习进展 / 卡点 / 临时上下文
- `daily/YYYY-MM-DD.summary.md`: 当天较旧记忆的压缩摘要
- `courses/<course_id>/course.md`: 课程级记忆
- `courses/<course_id>/course.summary.md`: 课程级较旧记忆压缩摘要
- `courses/<course_id>/lessons/<lesson_id>.md`: 课时级记忆
- `courses/<course_id>/lessons/<lesson_id>.summary.md`: 课时级较旧记忆压缩摘要
- `episodes.jsonl`: 零散事件型记忆

如果配置了 `GOOGLE_API_KEY`，上述 `*.summary.md` 会优先使用 Gemini 生成更紧凑的 AI 摘要；没有 key 时回退到规则压缩。

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
