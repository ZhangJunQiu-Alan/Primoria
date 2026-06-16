# Workspace Agent System Design

## Decision Summary

Workspace agents should be modeled as real collaborators inside an **AI4Edu learning workspace**, not as a separate bot panel or generic Slack clone. The first implementation should make a few opinionated decisions early:

- People and agents share the same member model, room model, direct chat model, mention model, and task assignment model.
- Agent identity is stored in an agent profile. Workspace membership only points at that profile.
- Every meaningful agent action creates a durable run, and every tool/approval/final answer is attached to that run.
- Deep Agents is the runtime harness for complex work, but Primoria owns product authorization, tool allowlists, audit, persistence, and UI.
- Internal tools ship before user-provided MCP connections.
- Learning value comes from workflows such as questioning, practice, critique, planning, and artifact creation, not from hard-coded teacher/student roles.

This document is the product/engineering contract for Workspace Agents. It should be updated before large implementation changes, because it defines the boundaries between chat UX, profile configuration, tool authorization, Deep Agents runtime behavior, and future MCP integration.

## Document Scope And Source Check

This is the living design document for the Workspace Agent system. It is intentionally broader than a task checklist: product decisions, runtime boundaries, data contracts, UI behavior, and phased implementation should all point back here.

Latest Deep Agents docs check: 2026-05-27.

Official docs reviewed:

- Deep Agents overview: https://docs.langchain.com/oss/javascript/deepagents/overview
- Deep Agents skills: https://docs.langchain.com/oss/javascript/deepagents/skills
- Deep Agents subagents: https://docs.langchain.com/oss/javascript/deepagents/subagents
- Deep Agents human-in-the-loop: https://docs.langchain.com/oss/javascript/deepagents/human-in-the-loop
- LangChain MCP adapter: https://docs.langchain.com/oss/javascript/langchain/mcp

The docs reinforce the core Primoria boundary:

```text
Deep Agents is the harness for planning, skill loading, subagent delegation, memory, and HITL mechanics.
Primoria is the product system for workspace identity, data access, approval policy, audit, persistence, and UI.
```

So this document should be read as a Primoria product/architecture layer around Deep Agents, not as a fork of Deep Agents itself.

## AI4Edu North Star

Workspace Agent is an AI4Edu learning workspace system. It can support general teams, creators, researchers, and individuals, but its product advantage should come from better learning loops:

- turn vague goals into concrete study/project plans
- ask questions that reveal understanding before giving answers
- generate practice, quizzes, rubrics, courses, widgets, and reviewable artifacts
- diagnose misconceptions from learner attempts and chat context
- remember useful learning preferences only when the user can review the memory
- let a learner bring a personal helper across rooms and workspaces without exposing private setup by default

This means the product should avoid teacher/student-only labels while still optimizing for learning. The general model is:

```text
people + agents + learning artifacts + reviewable memory + permissioned actions
```

The workspace should feel like a collaborative study/work room where agents participate as capable peers. Deep technical terms such as MCP, checkpointer, store, subagent middleware, or tool schema should stay behind product concepts such as connections, approvals, memory, skills, and actions.

## MVP Design Decision

The first shipped experience should be **agent-as-collaborator**, not **agent dashboard**.

Concretely:

- The entry point is the same `+` flow used for people.
- The agent appears as a normal workspace member.
- Direct chat with one agent can auto-run that agent.
- Group chat only runs agents on mention, task assignment, or explicit automation.
- Agent work appears inline as message, run chip, approval card, task update, or artifact.
- Right-side details are opt-in; they are not the default workspace layout.
- Room settings live in an opt-in workspace panel rather than crowding the chat header. The header can summarize agent mode/access, but changing those controls belongs in the panel.
- Skills and tools are configured in product language: "ways this agent works" and "actions this agent can take".
- MCP is postponed until internal tools, approvals, and audit are boring and reliable.

Engineering should use this MVP boundary when deciding whether a feature belongs in the first implementation.

## V0 Product Contract

The first useful version should feel like adding a capable teammate into a normal workspace. It should not feel like opening an agent dashboard.

V0 should optimize for five user-visible promises:

1. **Add agents the same way as people.** The `+` action is the shared entry point for people, agents, and eventually connections. Agents are selectable collaborators, not hidden settings.
2. **Agents can join the conversation without owning it.** Group rooms default to mentions only. Direct chat with one agent can auto-run that agent. Long work appears as a compact run card, approval card, task, or artifact.
3. **Users can create their own helper.** A custom agent starts from name, purpose, behavior, skills, allowed actions, memory scope, and visibility. The UI should speak in learning/workflow terms, not raw prompt-engineering terms.
4. **Every agent action is recoverable.** Runs, events, approvals, final messages, task updates, and artifacts are persisted. Refresh should never make successful agent work disappear.
5. **Learning behavior is modular.** Socratic coaching, visual explanation, quiz generation, course design, misconception diagnosis, research, and review should be skills/tools that can compose across agents.

V0 should deliberately avoid:

- default-open right-side agent detail panels
- fake/mock agent activity
- teacher/student-only language
- silent multi-agent debates
- arbitrary MCP access
- invisible memory writes
- filesystem or shell power exposed through Deep Agents without a product permission boundary

The key product sentence:

```text
An agent is a workspace member with a profile, skills, allowed actions, memory scope, and visible runs.
```

## Learning Agent System Brief

This section is the short design brief for discussing the agent system before implementation details.

Primoria should treat agents as **learning collaborators** inside Workspace. A user should not need to understand Deep Agents, LangGraph, MCP, prompts, or tool schemas to get value. They should understand:

- I can add a person or an agent from the same `+` flow.
- I can talk to an agent privately or mention it in a room.
- I can create my own agent for a specific learning/workflow style.
- I can give that agent skills, allowed actions, and memory boundaries.
- I can see what the agent did, approve risky actions, and reuse its output.

The first product shape should be:

```text
Workspace
  -> People and agents as members
  -> Rooms and direct chats
  -> Tasks assigned to people or agents
  -> Agent runs shown inline
  -> Artifacts saved from useful outputs
  -> Skills as reusable ways of working
  -> Tools/connections as permissioned actions
```

### Mental Model

Do not present agents as a separate dashboard. Present them as capable collaborators.

Good user-facing language:

- "Add an agent"
- "Ways this agent works"
- "Actions this agent can take"
- "Connections this agent can use"
- "What this agent can remember"
- "Review what this agent produced"

Avoid default user-facing language such as:

- "MCP server"
- "LangGraph checkpoint"
- "tool schema"
- "system prompt JSON"
- "subagent middleware"

Advanced details can exist behind advanced controls, but the default workspace experience should stay calm and collaborative.

### Core Objects

The system should stay understandable by separating these objects:

| Object | Product meaning | Engineering owner |
| --- | --- | --- |
| Member | visible participant in chat | Workspace |
| Agent profile | identity, purpose, behavior, model preference | Primoria |
| Skill | reusable learning/workflow method | Primoria + Deep Agents |
| Internal tool | trusted Primoria action | Primoria |
| Connection/MCP tool | external capability | Primoria policy wrapper |
| Run | one visible unit of agent work | Primoria persistence |
| Approval | user decision for risky action | Primoria persistence |
| Artifact | reusable output such as quiz/course/widget/note | Primoria |
| Memory | reviewable remembered context | Primoria + runtime store |

Important boundary:

```text
Deep Agents can execute the reasoning loop.
Primoria decides who can run what, where data comes from, what needs approval, and what persists.
```

### How Learning Improves

The system should improve learning by making agent behavior modular instead of hard-coding one "AI tutor" personality.

Learning needs many modes:

- a Socratic coach that asks before answering
- an explainer that gives examples and visual models
- a practice generator that creates exercises and rubrics
- a misconception detector that reacts to learner attempts
- a course designer that turns goals into plans
- a project mentor that converts work into tasks
- a reviewer that critiques artifacts and next steps

These should be skills and profiles that compose. A user might create "My Calculus Coach", attach `socratic-questioning`, `math-step-checking`, and `quiz-generation`, and allow only read tools plus quiz creation. Another user might create "Research Buddy" with source-grounded research and artifact-saving tools.

### Runtime Mapping

At runtime, one workspace agent run maps to a DeepAgent invocation:

```text
Agent profile
  + selected skills
  + allowed internal tools
  + allowed delegate agents
  + approved connections later
  + scoped workspace/thread context
  + stable run thread_id
  + checkpointer/store when approvals or memory exist
  -> createDeepAgent(...)
  -> stream/persist run events
  -> final message/task/artifact
```

DeepAgent features should map to product concepts:

| DeepAgent capability | Primoria product concept |
| --- | --- |
| `systemPrompt` | profile behavior + workspace context |
| `skills` | "ways this agent works" |
| `tools` | approved internal actions/connections |
| `subagents` | delegate agent capabilities |
| `interruptOn` | approval cards |
| `checkpointer` | resumable approval/run state |
| `store` | runtime memory backing |
| filesystem backend | controlled skill/materialized context backend |

Do not pass arbitrary user filesystem paths to Deep Agents. Stored user/workspace skills should resolve through portable ids and be materialized by Primoria only after scope checks.

### First Product Slice

The first useful implementation should include:

1. `+` picker for people and agents.
2. Template agents plus custom agent creation.
3. Profile fields: name, purpose, behavior, skills, actions, memory, visibility.
4. Direct agent chat auto-run.
5. Group chat mention run.
6. Durable run records and inline run chips/cards.
7. Approval cards for write/costly actions.
8. First-class artifact records for generated courses, quizzes, widgets, notes, and task outputs.

It should not start with:

- public agent marketplace
- arbitrary MCP configuration
- shell/filesystem power
- multi-agent debate mode
- default-open agent detail sidebars
- fake/mock activity

## Agent Studio Product Blueprint

This section describes how users should create and operate many different agents without turning Workspace into an agent dashboard. The product surface can be called **Agent Studio** internally, but the primary user entry point remains the Workspace `+` action.

The core product promise:

```text
Create a collaborator by describing who it is, how it helps, what skills it uses, what actions it can take, and what it may remember.
```

### User-Created Agents

Users should be able to create agents for their own learning and workflow styles. A custom agent is not a raw prompt box first; it is a guided composition of identity, skills, actions, memory, and permissions.

Default creation flow:

1. **Identity**
   - name
   - short purpose
   - optional avatar/accent
   - private or workspace-visible
2. **How it helps**
   - behavior instructions in plain language
   - selectable learning/workflow style such as Socratic, Explainer, Reviewer, Planner, Builder
   - optional advanced system prompt editing later
3. **Skills**
   - system skills from Primoria
   - workspace skills shared by the group
   - personal skills owned by the user
   - version and source visible enough for trust/recovery
4. **Actions and connections**
   - read-only tools enabled by default when safe
   - write/costly/external tools opt-in
   - actions grouped in product language: context, tasks, learning artifacts, and memory
   - MCP connections hidden under the product word "Connections"
   - every risky action mapped to approval policy
5. **Memory**
   - none, this chat, this workspace, or my preferences
   - user-level memory requires explicit review/approval
   - memories are reviewable and archivable later
6. **Add to context**
   - add to current room
   - start direct chat
   - keep in personal library only

The creation form should stay useful when the workspace has zero threads or zero other members. Empty state should invite a first action: create a room, add a person, add an agent, or start a direct chat. It should not show mock conversations.

### `+` Flow Information Architecture

The Workspace `+` popover is the shared object picker, not an invite-only control. It should support:

```text
+
  People
    Invite by email / code
    Existing members
  Agents
    Template agents
    My agents
    Workspace agents
    Create an agent
  Connections (later, advanced)
    Add a connection
```

Design rules:

- People and agents appear together as collaborators.
- Agent cards should show one-line purpose and key capabilities, not raw prompt text.
- The picker should let the user choose between adding to current group chat and starting a private direct chat.
- Agents should be selectable even when no group room exists yet.
- The right sidebar is not the default way to add or inspect agents.

### Agent Library, Not Bot Dashboard

The system needs an agent library, but it should feel like a collaborator library rather than an operations console.

Library views:

- **My agents**: private helpers and drafts.
- **Workspace agents**: agents shared with the current workspace.
- **Templates**: Primoria-provided starting points.
- **Archived/disabled** later: keep history without clutter.

Each library card should answer:

- What does this agent help with?
- Where can I use it?
- What skills/actions are enabled?
- Does it remember anything?
- Is it currently in this workspace/thread?

Avoid showing run logs, raw tool schemas, MCP transport details, or memory internals on the default card. Those belong in details/review surfaces.

### Agent Builder Action Groups

Allowed actions should not render as one long technical checklist. The builder/editor should group them by user intent:

- **Context actions**: search workspace messages, summarize chat.
- **Task actions**: create tasks, update tasks, with approval mode shown next to the write action.
- **Learning artifact actions**: share learning apps, create practice quizzes, generate course drafts, render interactive widgets, save learning artifacts.
- **Memory actions**: request reviewable memory saves.

This keeps the compact `+` flow readable while still making every capability explicit. The grouping is a display affordance only; runtime authorization still comes from persisted profile capabilities and tool policy.

### Capability Composition Model

An agent should be assembled from a few orthogonal capability types. This keeps the system extensible without making every new feature a one-off prompt hack.

| Capability | User wording | What it controls | Runtime mapping |
| --- | --- | --- | --- |
| Profile | Who this collaborator is | identity, purpose, behavior, model preference | `systemPrompt`, model config |
| Skill | How it works | reusable method/instructions | Deep Agents `skills` |
| Internal action | What it can change in Primoria | tasks, artifacts, quizzes, apps, memory | typed LangChain tools wrapped by Primoria |
| Delegate agent | Who it can ask for help | selected agent profiles | Deep Agents custom `subagents` |
| Connection | What outside system it can use | future MCP/API capabilities | MCP tool -> policy wrapper -> LangChain tool |
| Memory | What context persists | thread/workspace/user summaries | Primoria memory records + optional LangGraph Store |
| Approval policy | What needs review | risky writes, external calls, costly runs | `interruptOn` + persisted approval records |

Important rule:

```text
Skills can shape behavior, but only tools/connections grant power.
```

A user-authored skill must never silently grant a new tool. A workspace admin or owner must explicitly enable actions/connections for a profile.

### Agent Archetypes For Learning

Instead of one generic tutor, ship a small set of composable archetypes. These are templates users can clone and edit.

| Template | Purpose | Default skills | Default actions | Memory default |
| --- | --- | --- | --- | --- |
| Socratic Coach | helps users reason before answering | `socratic-questioning`, `misconception-diagnosis` | summarize current thread, create quiz | thread |
| Visual Explainer | turns concepts into examples/diagrams/widgets | `visual-explainer` | render widget, save artifact | thread |
| Practice Builder | creates exercises and feedback loops | `quiz-generation`, `math-step-checking` later | create quiz, save artifact | workspace or thread |
| Project Mentor | turns goals into plans/tasks | `project-breakdown`, `artifact-review` | create/update task | workspace |
| Research Buddy | gathers and evaluates sources | `source-grounded-research` | read tools first; external connections later | thread |
| Course Designer | turns a goal into a course/module plan | `course-outline-design`, `quiz-generation` | generate course, save artifact | workspace |
| Critic / Reviewer | reviews artifacts and proposes next steps | `artifact-review`, `misconception-diagnosis` | update task, save review artifact | thread |

Templates are not special runtime types. They are starting profile/capability bundles. After cloning, a user-owned profile is the source of truth.

### Personal Agents And Workspace Agents

Primoria should support both private learning helpers and shared workspace collaborators.

Personal agent behavior:

- owned by a user
- appears in that user's picker across relevant workspaces
- can start direct chats
- can be added to a workspace only if user has permission
- user-scope memory belongs to the user and should not automatically become workspace-visible

Workspace agent behavior:

- owned by or shared to a workspace
- visible to workspace members
- can participate in rooms and tasks
- workspace/thread memory is visible/reviewable according to workspace rules
- connection use depends on connection ownership and policy

A personal agent added to a workspace should still retain clear ownership. The product must distinguish:

```text
My private agent helping me in this workspace
vs
A workspace agent shared with everyone
```

### Agent Creation Guardrails

Custom agent creation should empower users while preventing confusing or unsafe behavior.

Required guardrails:

- unique handle inside a workspace/member namespace
- no capability from prompt text alone
- no arbitrary filesystem paths in skill inputs
- no raw MCP server exposure in default UI
- no hidden user-level memory writes
- no silent group-room auto-replies by newly created agents
- no fake sample runs in a real workspace
- no default shell/code-execution capability

Recommended validation:

- purpose must be non-empty and short
- behavior should be plain text with max length
- at least one explicit way to help should be selected for a useful runnable agent: a skill, allowed action, delegate, or connection tool. The product must not invent a fake skill path when the user clears all selections.
- risky actions require explicit approval mode
- external connections show destination and data category before enablement

### Deep Agents Mapping For Created Agents

When a user-created profile runs, Primoria should compile it into a Deep Agents config.

```text
AgentProfile
  -> prompt sections: identity, purpose, behavior, workspace rules
Capabilities(kind=skill)
  -> portable ids -> scope check -> materialized SKILL.md dirs -> skills[]
Capabilities(kind=internal_tool)
  -> policy wrapped tools[]
Capabilities(kind=subagent)
  -> selected profiles -> explicit subagents[] with explicit skills/tools
Capabilities(kind=mcp_tool later)
  -> connection owner check -> MCP adapter -> policy/approval wrapper -> tools[]
Memory scope
  -> visible memory summaries in prompt + optional Store backing
Approval policy
  -> interruptOn + checkpointer + persisted approval records
Run id
  -> stable thread_id for checkpoint/resume
```

This compilation should be deterministic and testable. A profile edit changes future runs, not historical run records. Historical runs keep the profile/capability snapshot needed to explain what happened.

### Skill Creation As Learning Infrastructure

User-created skills are important because they turn learning preferences into reusable behavior. A skill can encode:

- how to ask questions
- how to explain a topic
- how to grade an answer
- how to format feedback
- how to build a practice loop
- how to review a project artifact

Skill builder should encourage narrow skills:

```text
Good: "When reviewing my proof, first identify the theorem used, then ask one question about the weakest step."
Bad:  "Be a perfect tutor for everything."
```

Skill creation flow:

1. User describes the reusable behavior.
2. Primoria suggests a narrow name and description.
3. User edits instructions.
4. User chooses personal or workspace scope.
5. Primoria validates `SKILL.md` frontmatter.
6. Skill is versioned and can be restored.
7. Agent builder can attach the skill by portable id.

A skill should be easy to review because it can materially change how an agent teaches. But it must not be treated as trusted code or permission.

### Tools And MCP Progression

The safest progression is:

1. Read-only internal tools.
2. Narrow Primoria write tools with approvals.
3. Artifact-producing tools.
4. Reviewable memory writes.
5. User/workspace skill library.
6. Approved external connections/MCP.
7. Async/remote subagents only after cancellation/retry/recovery are reliable.

MCP should not be the first user-facing power feature. It should arrive as "Connections" once the boring pieces work:

- clear ownership
- per-agent allowlist
- approval copy
- audit events
- revocation
- failure recovery
- data egress visibility

### Conversation Design

Agents should help the conversation without flooding it.

Rules for group rooms:

- direct mention triggers the named agent unless the room is in quiet review mode
- generic `@agent` / `@ai` may trigger a coordinator that selects one best agent in room-default mode
- silent messages do not trigger agents by default
- each message should produce at most one visible primary response unless the user asks for multiple agents
- agent-to-agent delegation should appear as compact run events, not as a full transcript by default

Rules for direct chats:

- direct chat with one agent auto-runs that agent
- direct chat with multiple people and agents behaves like a group and should require mentions unless configured otherwise
- a direct chat with an agent can show richer learning loops because it is less noisy than a shared room

Run detail should be inline and opt-in:

```text
Socratic Coach is thinking · used 1 skill · needs approval
[View] [Cancel]
```

Expanded detail can show plan, tools, approvals, memory used, artifacts produced, and errors. It should not default-open a large right drawer.

### Review Surfaces

Because agents can produce durable objects, Workspace needs lightweight review surfaces that do not dominate the main chat.

Review surfaces:

- **Approvals**: immediate cards in chat/run context.
- **Artifacts**: reusable outputs with provenance and review status.
- **Skills**: version history, restore, delete, attach to agents.
- **Memories**: review/archive what agents remember.
- **Runs**: debug/audit surface for what happened.

Default chat should show only what is needed to keep collaboration understandable. Deep details should be one click away.

### Implementation North Star

The implementation should make one narrow path excellent before broadening:

```text
Create custom agent
  -> add it from + flow
  -> direct chat auto-runs it
  -> it uses selected skills and safe read tools
  -> risky write asks approval
  -> output is persisted as message/artifact/task
  -> memory is visible/reviewable when enabled
```

Only after this path is boring and reliable should we add broad MCP configuration, async subagents, marketplace behavior, or complex room automation.

## Purpose

Workspace should become a general collaboration space where people and agents work in the same rooms. It is not a teacher/student-specific product surface. The core model should also work for study groups, creators, researchers, teams, and individual users who want private help.

Agents are not decorative bots. They are configurable workspace members with skills, tools, memory, permissions, and visible work history.

The design goal:

- Humans and agents are equal citizens in group chat and private chat.
- A workspace can contain many agents with different capabilities.
- A user can add a template agent, create a personal agent, or share an agent with a workspace.
- Agents should help learning through explanation, questioning, visualization, practice, planning, critique, and artifact creation.
- Agent work must be observable, permissioned, resumable, and recoverable.
- The product should stay calm. Agents should not flood group chat or make the UI feel like a control panel.

## Product Principles

### General Workspace, Learning First

The language in the UI should be general. Use "people", "agents", "rooms", "direct chats", "tasks", "apps", and "artifacts". Avoid hard-coded teacher/student framing.

Learning is expressed through agent behavior and tools:

- explaining concepts in context
- asking Socratic questions
- generating practice and feedback
- building interactive widgets
- summarizing discussions
- turning goals into tasks
- saving useful artifacts
- recommending the next step

This means the same system can support:

- a student learning calculus with a private coach
- a study group asking a visualizer to explain a concept
- a creator building a mini-course with a course designer agent
- a project team assigning research and review tasks to agents
- an individual creating a personal agent that remembers preferences

### Agents Are Members

The member list should contain people and agents together. An agent can be invited into a room, mentioned, assigned a task, or opened in a direct chat.

The runtime can keep richer agent configuration behind the scenes, but the visible UI model should stay simple:

```text
Workspace
  -> members: people and agents
  -> threads: group rooms and direct chats
  -> messages: human, agent, and system messages
  -> tasks: assignable to people or agents
```

### Calm By Default

Agents should be useful without taking over the conversation.

- No agent speaks unless mentioned, directly chatted with, assigned a task, or enabled by an explicit room automation.
- A normal message should trigger at most one agent by default.
- Coordinator-triggered multi-agent responses should be rare and capped.
- Long work should become a run card, task, or artifact instead of a wall of chat messages.
- Run detail should be available inline or from a compact card. It should not default-open as a large right sidebar.

### Learning Loops

Agents should be designed around learning loops, not one-shot answer generation.

Core loops:

- Explain: answer with context, examples, and alternative representations.
- Question: ask the learner to reason before revealing the answer.
- Practice: generate exercises, evaluate attempts, and adapt difficulty.
- Diagnose: identify misconceptions from messages, submissions, or quiz answers.
- Plan: turn a goal into a sequence of tasks, sessions, or milestones.
- Build: create an app, artifact, diagram, simulation, note, or quiz.
- Reflect: summarize progress and propose the next learning move.

Each loop should be implementable as a skill plus a small set of allowed tools. The UI should not expose this as technical machinery by default; it should feel like choosing how an agent helps.

### Agent-As-Collaborator North Star

The best mental model is not "chatbot settings". It is "add a capable teammate to this workspace".

The workspace should answer these user questions clearly:

- Who is here?
- What can each person or agent help with?
- Where should I ask them: group room, direct chat, or task?
- What is the agent doing right now?
- What is the agent asking permission to do?
- What did the agent produce, and can I reuse it?

This implies a few product decisions:

- Agent configuration starts from human language: purpose, ways of working, memory, and allowed actions.
- Technical capability labels such as "MCP", "LangGraph", or "DeepAgent" should be hidden from normal users.
- Advanced users can still open a deeper configuration surface for tools, model, MCP connections, and prompt details.
- The chat stream remains the shared source of truth. Agent runs, approvals, and artifacts should be visible where the work happened.
- The right sidebar should be contextual and optional, not the primary agent control center.

## Learning-Oriented Agent Patterns

The system should support many different agents, but those agents should be built from a small set of reusable learning patterns. These patterns map well to Deep Agents skills.

| Pattern | User-facing wording | Typical trigger | Useful tools | Output |
| --- | --- | --- | --- | --- |
| Socratic coach | "Help me think it through" | direct chat, mention | summarize thread, create quiz | follow-up question, hint ladder |
| Explainer | "Explain this clearly" | mention, selected message | search workspace messages, visual widget | explanation, examples, diagram |
| Practice generator | "Give me practice" | direct chat, task | create quiz, update task | exercises, rubric, feedback |
| Misconception detector | "Check my understanding" | answer submission, mention | summarize thread, artifact search | diagnosis, targeted feedback |
| Project mentor | "Turn this into a plan" | task assignment, manual run | create task, update task | task plan, next steps |
| Researcher | "Find grounded references" | mention, manual run | approved external/search tool later | source summary, citations |
| Builder | "Make an app/artifact" | task assignment | share app, render widget | interactive artifact |
| Critic/reviewer | "Review this" | selected artifact, task | search messages, update task | review notes, suggested changes |

V0 does not need every pattern implemented as a separate product object. It needs enough profile/capability structure so these can be expressed later without changing the member, thread, and run model.

## Deep Agents Constraints

Deep Agents is a good fit because it provides the harness we need: planning, filesystem context, subagent delegation, skills, memory, streaming, and human-in-the-loop.

We should configure that harness instead of rebuilding a second agent framework inside Workspace.

Implementation constraints to respect:

- JavaScript configuration uses camelCase options such as `systemPrompt`, `interruptOn`, `responseFormat`, `checkpointer`, `store`, `subagents`, and `skills`.
- Stable `thread_id` values are required for checkpointer-backed state, approvals, memory, and resumable runs.
- `interruptOn` requires a checkpointer and should be used for sensitive tools.
- A general-purpose subagent can inherit main-agent skills, but custom subagents do not automatically inherit them. Give custom subagents explicit `skills`.
- A subagent `tools` array overrides its default tools. Do not assume tools are merged.
- Skills use progressive disclosure. The agent sees skill metadata first and reads the full `SKILL.md` only when useful.
- Deep Agents filesystem permissions apply to built-in filesystem tools. They do not sandbox arbitrary Primoria internal tools or MCP tools.
- Sandbox backends can expose shell execution. Do not enable shell execution for workspace agents until there is a clear isolation, billing, and abuse story.
- Interpreters can be useful for structured transformations and tool composition later, but they should not be needed for the first chat/task path.
- MCP tools should be converted to LangChain tools, then wrapped by Primoria allowlists, audit logging, and approval rules.
- Async subagents are useful later for long-running work. The first production path should make normal sync or streaming runs reliable before adding remote async execution.

Primary references:

- Deep Agents overview: https://docs.langchain.com/oss/javascript/deepagents/overview
- Subagents: https://docs.langchain.com/oss/javascript/deepagents/subagents
- Skills: https://docs.langchain.com/oss/javascript/deepagents/skills
- Human-in-the-loop: https://docs.langchain.com/oss/javascript/deepagents/human-in-the-loop
- Permissions: https://docs.langchain.com/oss/javascript/deepagents/permissions
- Async subagents: https://docs.langchain.com/oss/javascript/deepagents/async-subagents
- MCP adapter path: https://docs.langchain.com/oss/javascript/langchain/mcp

### Deep Agents Docs Review Notes

Reviewed on 2026-05-26 for the Workspace Agent design.

Important product implications from the docs:

- Deep Agents is a harness for planning, filesystem context, subagents, memory, skills, streaming, and human approval. Primoria should configure it rather than rebuild those runtime primitives.
- Use Deep Agents for multi-step learning work. Use a simpler agent path only for narrow one-shot behavior.
- Skills are loaded from explicit source paths. The SDK does not magically scan local agent folders, so Primoria must resolve system, workspace, and user skill sources deliberately.
- Skill routing depends heavily on the `description` in `SKILL.md`; vague skills will make agents unpredictable.
- General-purpose subagents can inherit main-agent skills, but custom subagents need explicit `skills` and should be treated as isolated workers.
- Human-in-the-loop requires a real checkpointer and a stable `thread_id`. Approval records in Primoria must map back to the same runtime thread when resuming.
- Deep Agents filesystem `permissions` cover only built-in filesystem tools. They do not secure Primoria internal tools, MCP tools, sandbox command execution, or arbitrary external effects.
- MCP tools should be treated as external connections: convert them to LangChain tools, then wrap with Primoria policy, authorization, audit, and approval before the runtime receives them.
- Async subagents and remote workers are powerful but should come after the sync/streaming run path, cancellation, retry, and approval recovery are reliable.

Architecture rule from this review:

```text
Deep Agents owns reasoning mechanics.
Primoria owns identity, authorization, persistence, tool policy, approvals, memory visibility, and UI.
```

## Product Model

Separate agent identity from workspace membership.

### Agent Profile

An agent profile defines who the agent is and what it can do. It can exist before it is added to a specific thread.

```ts
type AgentProfile = {
  id: string;
  workspaceId: string;
  ownerId?: string;
  displayName: string;
  handle: string;
  description: string;
  visibility: "private" | "workspace" | "public_template";
  templateKey?: string;
  systemPrompt: string;
  defaultModel?: string;
  memoryScope: "none" | "user" | "workspace" | "thread";
  createdAt: number;
  updatedAt: number;
};
```

### Agent Capability

Capabilities belong to profiles. A member reference should not carry tool or skill configuration directly.

```ts
type AgentCapability =
  | { kind: "skill"; source: "system" | "workspace" | "user"; path: string; enabled: boolean }
  | { kind: "internal_tool"; toolName: string; approval: "never" | "on_risk" | "always"; enabled: boolean }
  | { kind: "mcp_tool"; connectionId: string; toolName: string; approval: "on_risk" | "always"; enabled: boolean }
  | { kind: "subagent"; agentProfileId: string; enabled: boolean };
```

Capabilities should be edited through product language:

- Skills: "Ways this agent works"
- Internal tools: "Actions this agent can take"
- MCP tools: "Connections this agent can use"
- Subagents: "Agents this agent can delegate to"

The stored form remains explicit and auditable. A capability row should contain enough information to answer:

- who enabled it
- which profile can use it
- whether it is enabled
- what approval rule applies
- when it was changed
- whether it came from a template or user customization

### Workspace Member

A member is the visible participant in chat. It can optionally point at an agent profile.

```ts
type WorkspaceMember = {
  id: string;
  workspaceId: string;
  displayName: string;
  role: string;
  status?: string;
  agentProfileId?: string;
};
```

This keeps the UI model human-readable while preserving enough runtime metadata for Deep Agents.

### Personal, Workspace, And Template Agents

An agent can appear in three product states:

- Template: built by Primoria, cloneable, not itself a member.
- Personal agent: owned by one user, usable in private chats and optionally addable to workspaces.
- Workspace agent: shared with a workspace and visible to members who have access.

Important rule:

```text
Template -> Profile -> Workspace Member
```

Do not let a workspace member row become the source of truth for prompts, skills, tools, memory, or MCP connections. Those belong to the profile and capability records.

Suggested visibility semantics:

| Visibility | Who can use it | Where it appears | Notes |
| --- | --- | --- | --- |
| `private` | owner only | owner's picker and direct chats | best default for personal learning assistants |
| `workspace` | workspace members with access | workspace picker/member list | default for agents created inside a workspace |
| `public_template` | any user can clone | template gallery | not itself a runnable profile |

Do not overload visibility as permission. Runtime authorization still checks workspace membership, thread access, tool policy, and connection ownership.

### Agent Lifecycle

```text
create or clone profile
  -> configure skills/tools/memory/approval policy
  -> add profile as member to workspace or thread
  -> trigger run by mention, direct chat, task, or manual action
  -> persist run events and approvals
  -> persist final message, task update, or artifact
  -> summarize run for memory if allowed
```

The lifecycle should make agents understandable to users and recoverable for engineering.

### Agent Run

Every agent action creates a run record. Runs are the durable bridge between chat, tasks, tools, approvals, and final output.

```ts
type WorkspaceAgentRun = {
  id: string;
  workspaceId: string;
  threadId: string;
  agentProfileId: string;
  agentMemberId?: string;
  trigger: "mention" | "direct_chat" | "task_assignment" | "coordinator" | "manual";
  status: "queued" | "running" | "waiting_for_approval" | "completed" | "failed" | "cancelled";
  inputMessageId?: string;
  outputMessageId?: string;
  taskId?: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
};
```

Run events power inline activity, audit logs, and debugging.

```ts
type WorkspaceAgentRunEvent = {
  id: string;
  runId: string;
  workspaceId: string;
  threadId: string;
  type:
    | "status"
    | "todo"
    | "tool_start"
    | "tool_end"
    | "subagent_start"
    | "subagent_end"
    | "approval_request"
    | "artifact"
    | "message_delta";
  label: string;
  payload?: unknown;
  createdAt: number;
};
```

### Agent Approval

Approvals are product records, not only runtime interrupts. They must survive reloads and be visible in chat.

```ts
type WorkspaceAgentApproval = {
  id: string;
  workspaceId: string;
  threadId: string;
  runId: string;
  toolName: string;
  status: "pending" | "approved" | "denied" | "expired";
  requestLabel: string;
  requestPayload?: unknown;
  decisionReason?: string;
  requestedAt: number;
  decidedAt?: number;
};
```

Runtime interrupts can create approval records, but the UI should render from persisted approvals instead of from ephemeral runtime state.

### Agent Identity In Chat

Agent identity should be visible but not noisy.

Required visible fields:

- display name
- one-line purpose
- small agent/person type indicator
- status: available, working, waiting for approval, or unavailable

Avoid deriving agent-ness from display names such as "agent". The source of truth is `agentProfileId`.

Group membership examples:

```text
 Add
   People
     Alice
     Bo
   Agents
     Socratic Coach — asks questions before giving answers
     Visualizer — turns ideas into diagrams and mini apps
     Create your own agent
```

Direct chat examples:

```text
 New chat
   Alice
   Visualizer
   Project Mentor
```

The same picker pattern should work for people and agents. Agents are not second-class or hidden in a settings panel.

### Room-Level Agent Settings

Room automation should be separate from membership.

Recommended fields:

```ts
type WorkspaceThread = {
  agentTriggerMode: "mention_only" | "room_default" | "quiet_review";
  allowedAgentProfileIds?: string[];
};
```

V0 uses three room modes:

- `room_default`: named mentions run the named agent, and generic `@agent` / `@agents` / `@ai` can invoke one coordinator-selected agent.
- `mention_only`: only named agent mentions run; generic coordinator mentions stay quiet.
- `quiet_review`: group chat messages do not auto-run agents, even when mentioned. Users can still use direct agent chats, task assignment, and future manual review flows.

Direct chats with a single agent still auto-run that agent, because those chats are intentionally focused and low-noise.

If `allowedAgentProfileIds` is unset, every agent member visible in the room can respond according to the room mode. If it is set, only those agent profiles can answer named mentions or generic coordinator requests in that room. This allowlist is a product-owned routing boundary before DeepAgent receives a run, not a prompt instruction.

## Agent Templates

Start with a small set of learning-useful templates. Templates should be cloneable, not hard-coded identities.

- Socratic Coach: asks guiding questions before direct answers.
- Visualizer: turns concepts into diagrams, widgets, and simulations.
- Course Designer: creates structured paths, lesson blocks, and study plans.
- Examiner: creates quizzes, checks answers, and identifies weak points.
- Project Mentor: turns goals into tasks and reviews progress.
- Researcher: gathers source-grounded references and summaries.
- Peer: discusses ideas like a study partner and challenges assumptions.
- Code/Math Helper: works through code, formulas, and debugging step by step.

A user-created agent starts as:

```text
template clone
  -> edited name and handle
  -> edited behavior instructions
  -> selected skills
  -> selected tools and approvals
  -> selected memory scope
```

## Conversation Behavior

### Trigger Rules

- `@AgentName`: run only that agent.
- `@agent`, `@agents`, or `@ai`: run the coordinator, which may select one to three agents.
- Direct chat with an agent participant: run that agent by default.
- Task assigned to an agent: run that agent in the task context and write the result back to the task and thread.
- No mention: agents stay silent unless the room has explicit auto-assist enabled.

Trigger detection should return structured intent, not immediately execute tools:

```ts
type AgentTriggerDecision = {
  shouldRun: boolean;
  trigger: WorkspaceAgentRun["trigger"];
  agentProfileIds: string[];
  reason: "mention" | "direct_agent_chat" | "task_assignment" | "coordinator" | "none";
  confidence: number;
};
```

Hard rules should run before model routing:

1. explicit `@AgentName`
2. direct chat containing exactly one agent participant
3. task assigned to an agent member
4. room automation or coordinator mention

This keeps predictable actions deterministic and makes coordinator routing an enhancement instead of a hidden side effect.

### Private Chat Versus Group Chat

Private chat with an agent is for focused help and personal memory. Group chat is for shared context and visible collaboration.

Rules:

- A direct chat with one agent can auto-trigger that agent on each user message.
- A direct chat with a person should not auto-add agents unless mentioned.
- A group room only triggers agents through mention, assignment, or explicit room automation.
- Private chats should respect participant visibility. Agents should not search messages from rooms they cannot access.
- Run cards and approval cards should render in both private and group chat.

### Coordinator

The coordinator is a router, not a visible personality. It decides:

- whether an agent should respond
- which agent profile is relevant
- whether a request should become a task
- whether a long-running run is better than immediate chat
- whether a tool needs approval before continuing

The coordinator should usually pick one agent. Multi-agent orchestration is for work where different capabilities clearly matter.

Coordinator limits:

- default maximum selected agents: 1
- hard maximum selected agents: 3
- no recursive coordinator loops
- no agent-to-agent public debate unless user explicitly asks
- if uncertain, ask a clarifying question or pick the most relevant single agent

Coordinator output should be a routing decision, not a visible chat personality unless we later create a named coordinator profile.

### Message Density

Default group behavior:

- maximum one agent reply for a normal mention
- maximum two agent replies for coordinator mode
- concise answers first, artifacts second, long reasoning hidden in run detail
- long work becomes a task card or run card
- tool/subagent events are summarized unless the user opens details

### Failure And Cancellation Behavior

Agent runs should fail visibly but calmly.

Rules:

- If a run fails before producing output, show a compact failed run chip with retry/copy details.
- If a run is waiting for approval, show the approval card inline and keep the composer usable.
- If a user cancels a queued, running, or waiting run, mark pending approvals as expired.
- If a run is cancelled, do not generate a final agent answer unless the runtime already produced one before cancellation.
- Retrying should create a new run linked to the same input message or task.

Cancellation should be idempotent. Cancelling an already terminal run should not create duplicate timeline noise.

## Runtime Architecture

Keep storage, trigger detection, and agent execution separate.

```text
Workspace API route
  -> store persists human message or task
  -> trigger detector selects candidate agent profiles
  -> runtime creates WorkspaceAgentRun
  -> DeepAgent streams status, tool, approval, and output events
  -> run events and final messages persist
  -> realtime hub notifies clients
```

Suggested modules:

- `src/lib/workspaces/agent-profiles.ts`: profile CRUD, templates, capabilities.
- `src/lib/workspaces/agent-runtime.ts`: DeepAgent config, invocation, streaming, result mapping.
- `src/lib/workspaces/agent-tools.ts`: Primoria internal tools and guarded wrappers.
- `src/lib/workspaces/agent-mcp.ts`: MCP connection loading and guarded tool wrapping.
- `src/lib/workspaces/agent-events.ts`: run event persistence and realtime projection.
- `src/lib/workspaces/agent-triggers.ts`: mention, direct chat, task assignment, coordinator routing.
- `src/app/api/workspaces/[id]/agents/*`: profile and membership APIs.
- `src/app/api/workspaces/[id]/agent-runs/*`: run status, approval, cancellation, history.

`store.ts` should persist workspace data. It should not own agent reasoning. Deterministic placeholder replies are acceptable during early phases, but they should live behind the runtime boundary.

### Runtime Execution Modes

There should be three explicit runtime modes:

| Mode | Use | Behavior |
| --- | --- | --- |
| placeholder | local development, early UI | deterministic response behind runtime boundary |
| sync/streaming DeepAgent | V0 production path | run in request/worker process, persist events and final output |
| async worker | later long-running jobs | enqueue run, stream events, support resume/cancel |

The application should not mix modes accidentally. Use an explicit environment flag for Deep Agents, for example:

```text
PRIMORIA_WORKSPACE_DEEPAGENT=1
```

When the flag is off, code should still create real run records and run events. This lets the UI, API, approval, and realtime layers be tested without needing model credentials.

DeepAgent checkpointer/store persistence is also explicit:

```text
PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE=memory | postgres | disabled
```

Current contract:

- `memory` is the default development fallback. It creates real `MemorySaver` / `InMemoryStore` objects when available, so approval-capable configs are not faking checkpointers with booleans.
- `disabled` is allowed only when no `interruptOn` tools are configured. If approvals are possible, disabled persistence fails fast because Human-in-the-loop requires a checkpointer.
- `postgres` is the intended production mode and must not silently fall back to memory. It requires `DATABASE_URL`, loads `@langchain/langgraph-checkpoint-postgres`, creates `PostgresSaver` and `PostgresStore` through `fromConnString`, and calls adapter setup before returning them to Deep Agents.
- `PRIMORIA_WORKSPACE_DEEPAGENT_POSTGRES_SCHEMA` can select a dedicated schema for DeepAgent checkpoint/store tables; otherwise the adapter uses `public`.

Production gate:

When `NODE_ENV=production` and `PRIMORIA_WORKSPACE_DEEPAGENT=1`, the app now validates the runtime environment before returning a DeepAgent runner. Production must set:

```text
PRIMORIA_WORKSPACE_DEEPAGENT=1
PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE=postgres
DATABASE_URL=...
OPENAI_BASE_URL=...
OPENAI_API_KEY=...
```

For Anthropic-compatible deployments, set `AI_PROVIDER=anthropic-compatible` and `ANTHROPIC_API_KEY` instead of the OpenAI-compatible pair. Test-only harness variables such as `PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL`, `PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL`, and `PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_NAME` are rejected in production.

Operator checklist before flipping the flag in production:

- Database migrations are applied and `DATABASE_URL` points at the production workspace database.
- `PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE=postgres` is set; memory persistence is development-only.
- Optional `PRIMORIA_WORKSPACE_DEEPAGENT_POSTGRES_SCHEMA` is created or permitted by the DB user if a dedicated schema is used.
- Model provider credentials are present for the selected provider and have enough quota.
- External connection tools remain allowlisted per workspace/agent and approval-forced before they reach DeepAgent.
- Test harness variables are absent from the production environment.

Operators can dry-run the readiness gate without making a model call:

```bash
curl -H "Authorization: Bearer $PRIMORIA_WORKSPACE_OPERATOR_TOKEN" \
  https://your-host.example/api/workspaces/agent-runtime/health
```

The endpoint returns `200` when the active runtime is ready and `503` when `PRIMORIA_WORKSPACE_DEEPAGENT=1` is enabled but the production gate is incomplete. In production it requires `PRIMORIA_WORKSPACE_OPERATOR_TOKEN`; in non-production it is open for local diagnostics. The response includes runtime mode, persistence mode, and actionable missing checks, but never returns provider keys, database URLs, or operator tokens.

Route-level production smoke coverage is available as:

```bash
pnpm --filter @primoria/web workspace:agent-runtime:health-route
```

That smoke calls the actual Next route in `NODE_ENV=production` with controlled env values and verifies the missing-token `401`, misconfigured-runtime `503`, ready-runtime `200`, placeholder-runtime `200`, and no-secret-leak contracts.

### CI Health Route Smoke

Deployment CI should run two different checks because they protect different failure modes:

1. Route-level contract smoke:

```bash
pnpm --filter @primoria/web workspace:agent-runtime:health-route
```

This command is safe for pull requests because it uses controlled in-process env values and does not call a model provider. The expected status contracts are `401`, `503`, and `200`: missing operator token must be rejected, incomplete production DeepAgent config must fail readiness, and valid production config must pass. The test also asserts that provider keys, database URLs, and `PRIMORIA_WORKSPACE_OPERATOR_TOKEN` are never echoed back in health JSON.

The repository wires this pull-request-safe check through `.github/workflows/workspace-agent-runtime-health.yml`. The workflow also runs the broader quick agent bundle:

```bash
pnpm --filter @primoria/web workspace:agent:test
```

That bundle is the default PR gate for no-server workspace/agent behavior: trigger routing, internal tool policies, connection/MCP guards, skill storage, runtime assembly, client merge semantics, production health-route contracts, local store behavior, and UI/static contracts.

2. Deployed environment smoke:

```bash
curl --fail --silent --show-error \
  -H "Authorization: Bearer $PRIMORIA_WORKSPACE_OPERATOR_TOKEN" \
  "$PRIMORIA_WORKSPACE_HEALTH_BASE_URL/api/workspaces/agent-runtime/health"
```

Run the deployed smoke only after migrations and deployment environment variables are applied. The target environment should set:

```text
PRIMORIA_WORKSPACE_OPERATOR_TOKEN=...
PRIMORIA_WORKSPACE_DEEPAGENT=1
PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE=postgres
DATABASE_URL=...
OPENAI_BASE_URL=...
OPENAI_API_KEY=...
```

For Anthropic-compatible production, use `AI_PROVIDER=anthropic-compatible` and `ANTHROPIC_API_KEY=...` instead of the OpenAI-compatible provider pair. `PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL`, `PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL`, and `PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_NAME` must be absent from deployed production and staging smoke jobs.

Example GitHub Actions shape:

```yaml
name: Workspace agent runtime smoke

on:
  pull_request:
  workflow_dispatch:

jobs:
  route-health-contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @primoria/web workspace:agent-runtime:health-route

  deployed-health:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Check deployed workspace agent runtime
        env:
          PRIMORIA_WORKSPACE_HEALTH_BASE_URL: ${{ secrets.PRIMORIA_WORKSPACE_HEALTH_BASE_URL }}
          PRIMORIA_WORKSPACE_OPERATOR_TOKEN: ${{ secrets.PRIMORIA_WORKSPACE_OPERATOR_TOKEN }}
        run: |
          curl --fail --silent --show-error \
            -H "Authorization: Bearer ${PRIMORIA_WORKSPACE_OPERATOR_TOKEN}" \
            "${PRIMORIA_WORKSPACE_HEALTH_BASE_URL}/api/workspaces/agent-runtime/health"
```

Do not print or persist the health JSON as an artifact. It is intentionally scrubbed, but the safest CI posture is to treat runtime diagnostics as operator-only output.

Status: the persistence mode boundary and Postgres adapter wiring are implemented and unit-covered. Authenticated DB-mode workspace agent API/browser smoke coverage now exists for persisted agent creation, mention runs, task-assignment runs, approval decisions, first-class artifact indexing, retry, and rendered artifact cards. DB regression also runs a real DeepAgent HITL interrupt/resume path using the LangGraph Postgres checkpointer/store with a deterministic fake model, so the checkpoint resume contract is tested without external model credentials.

For server-level e2e coverage, non-production builds can enable an explicit fake runtime harness:

```text
PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL=1
PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL=external_approval
```

This injects a deterministic fake chat model and one fake external guarded tool only for tests. It must stay disabled in production; its purpose is to prove the real API route, DeepAgent stream adapter, HITL approval persistence, Postgres resume, and rendered UI path without external LLM or MCP credentials.

The server-level smoke is `apps/web/tests/workspace-deepagent-runtime.e2e.mjs`, exposed as `pnpm --filter @primoria/web workspace:agent:e2e:deepagent` and the compatibility alias `pnpm --filter @primoria/web workspace:deepagent:e2e`. It starts its own Next dev server with the required env and an isolated `NEXT_DIST_DIR=.next-deepagent-runtime-e2e` when no server is supplied, so it can run alongside a normal local `.next/dev` server without inheriting the wrong env. To run against an existing server, start that server with the env above plus `PRIMORIA_WORKSPACE_DEEPAGENT=1` and `PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE=postgres`, then pass `WORKSPACE_E2E_BASE`.

### Workspace Agent Test Matrix

Agent behavior should be tested at four levels because "the agent works" is otherwise too vague:

| Command | Environment | Proves |
| --- | --- | --- |
| `pnpm --filter @primoria/web exec tsx tests/workspace.agent-triggers.unit.ts` | no server | mention/direct/room trigger policy, room allowlist, and profile-backed agent identity |
| `pnpm --filter @primoria/web exec tsx tests/workspace.agent-tools.unit.ts` | no server | internal tool approval policy and tool payload contracts |
| `pnpm --filter @primoria/web exec tsx tests/workspace.agent-mcp.unit.ts` | no server | connection selection, MCP tool allowlists, guarded external tool wrapping, and recoverable connection failures |
| `pnpm --filter @primoria/web exec tsx tests/workspace.agent-skills.unit.ts` | no server, DB optional | workspace/user skill create, update, versions, restore, delete, and portable path resolution |
| `pnpm --filter @primoria/web exec tsx tests/workspace.agent-runtime.unit.ts` | no server | DeepAgent config assembly, persistence gate, stream event mapping, and approval resume payloads |
| `pnpm --filter @primoria/web exec tsx tests/workspace-client-merge.unit.ts` | no server | client-side realtime merge semantics for agent memories and archived records |
| `pnpm --filter @primoria/web exec tsx tests/workspace-agent-runtime-health-route.unit.ts` | no server | production health-route auth/readiness/no-secret-leak status contracts |
| `pnpm --filter @primoria/web exec tsx tests/workspace.unit.ts` | local store | end-to-end store behavior without DB, including agent runs, approvals, tasks, skills, memory, and room agent settings |
| `pnpm --filter @primoria/web exec tsx tests/workspace.db.ts` | `DATABASE_URL` | persisted workspace/agent behavior, DB migrations, visibility, approvals, artifacts, and retry state |
| `pnpm --filter @primoria/web workspace:agent:e2e:direct` | browser + local fallback | real UI/API direct chat with one agent, People-picker private chat without accidental agent runs, empty-chat/start-state Add person/Add agent/New task actions, room allowlist add flow, and inline run chip rendering |
| `pnpm --filter @primoria/web workspace:agent:e2e:approval` | browser + local fallback | approval artifact sharing and retry through the rendered run-detail UI |
| `pnpm --filter @primoria/web workspace:agent:e2e:auth-db` | browser + `DATABASE_URL` | authenticated DB workspace agent creation, mention runs, task assignment, approval, artifact indexing, retry, and rendered UI |
| `pnpm --filter @primoria/web workspace:agent:e2e:deepagent` | browser + `DATABASE_URL` + fake DeepAgent harness | real opt-in DeepAgent/HITL/checkpointer/store wiring without external model or MCP credentials |

The default browser smoke bundle is:

```bash
pnpm --filter @primoria/web workspace:agent:e2e
```

The default PR-safe no-server bundle is:

```bash
pnpm --filter @primoria/web workspace:agent:test
```

This intentionally excludes browser e2e and DB-required checks. The browser smoke bundle intentionally runs only the local direct-chat and approval/retry browser paths. DB and DeepAgent e2e checks should run in environments where `DATABASE_URL` and the explicit DeepAgent test harness are available. E2E scripts that start their own Next dev server must use an isolated `NEXT_DIST_DIR`, snapshot/restore `next-env.d.ts` and `tsconfig.json`, and delete their temporary `.next-*` directory before exiting so test runs do not create unrelated worktree churn.

### Run State Machine

Allowed status transitions:

```text
queued -> running
queued -> cancelled
running -> waiting_for_approval
running -> completed
running -> failed
running -> cancelled
waiting_for_approval -> running
waiting_for_approval -> completed
waiting_for_approval -> failed
waiting_for_approval -> cancelled
completed -> terminal
failed -> terminal
cancelled -> terminal
```

Rules:

- `startedAt` is set when the run is created or first starts executing.
- `completedAt` is set for `completed`, `failed`, and `cancelled`.
- Waiting for approval is not terminal.
- Denying an approval can either resume with a safe fallback or cancel the run; V0 should cancel for write actions.
- Pending approvals for a cancelled run should become `expired`.
- Terminal runs should not accept new tool events except support/debug annotations.

### Event Ordering

Run events are an append-only timeline.

Recommended event sequence:

```text
status: queued
status: running
todo/tool/subagent/message_delta...
approval_request? 
status: waiting_for_approval?
approval_decision?
status: running?
tool_end/message_delta...
status: completed | failed | cancelled
```

Clients should sort by `createdAt`, then stable id if needed. Final state should come from the run record, not by replaying events in the browser.

### Runtime Boundary

The runtime boundary should take a fully authorized request and return persisted-facing results.

```ts
type WorkspaceAgentRuntimeInput = {
  workspaceId: string;
  threadId: string;
  trigger: WorkspaceAgentRun["trigger"];
  profile: WorkspaceAgentProfile;
  agentMember?: WorkspaceMember;
  inputMessage?: WorkspaceMessage;
  task?: WorkspaceTask;
  recentMessages: WorkspaceMessage[];
  visibleMembers: WorkspaceMember[];
  allowedTools: WorkspaceAgentToolBinding[];
  allowedSkills: WorkspaceAgentSkillBinding[];
  deepAgentThreadId: string;
};

type WorkspaceAgentRuntimeResult = {
  run: WorkspaceAgentRun;
  events: WorkspaceAgentRunEvent[];
  outputMessage?: WorkspaceMessage;
  approvals?: WorkspaceAgentApproval[];
  task?: WorkspaceTask;
  error?: string;
};
```

The runtime should not reach into React state or infer authorization from display names. It should receive explicit profiles, members, messages, tools, and visibility scope from the store/API layer.

### Runtime Context Budget

The runtime should not blindly pass the whole workspace to the model.

Context construction order:

1. system prompt and profile purpose
2. current user message or task
3. current thread participants and recent messages
4. relevant task or artifact references
5. compact workspace summary if available
6. retrieved messages only through an allowed search/summarize tool

This is important for privacy, cost, and answer quality. Agents should not see direct chats or rooms where they are not a participant unless a tool policy explicitly grants broader workspace read access.

## DeepAgent Configuration Pattern

Each run builds a DeepAgent from:

- profile system prompt
- workspace, thread, task, and recent-message context
- allowed internal tools
- allowed MCP tools
- allowed subagents
- skill paths
- checkpointer and store
- filesystem backend or store backend
- approval interrupt rules

Shape:

```ts
const agent = await createDeepAgent({
  name: profile.handle,
  model,
  tools: allowedTools,
  systemPrompt: buildWorkspaceAgentPrompt(profile, context),
  subagents,
  skills: skillPaths,
  checkpointer,
  store,
  backend,
  interruptOn: {
    create_workspace_task: {
      allowedDecisions: ["approve", "reject"],
      description: "Create task requires workspace approval before changing workspace state.",
    },
  },
});

const stream = await agent.streamEvents(
  { messages },
  {
    configurable: { thread_id: runThreadId },
    version: "v2",
  },
);
```

The `thread_id` should be deterministic enough to resume approval flows:

```text
workspace:${workspaceId}:thread:${threadId}:agent:${agentProfileId}:run:${runId}
```

Use a new run id for each visible agent action. Use the same run id when resuming an approval.

Approval resume shape:

```ts
await agent.invoke(
  new Command({ resume: { decisions: [{ type: "approve" }] } }),
  { configurable: { thread_id: runThreadId } },
);
```

The decisions must be sent in the same order as the interrupted tool actions. Primoria should store enough interrupt metadata in the approval payload to resume safely, but the user-facing approval card should stay compact. Until Primoria has a durable edited-argument review flow, DeepAgent `interruptOn` configs must allow only `approve` and `reject`; do not expose LangChain's `edit` decision because edited tool args would bypass Primoria's current persisted approval payload. The protocol helper `buildWorkspaceDeepAgentApprovalResume(...)` maps persisted Primoria decisions to this shape: `approved` becomes `{ type: "approve" }`, `denied` becomes `{ type: "reject", message }`, and both require the persisted `deepAgentThreadId`. The execution helper `resumeWorkspaceDeepAgentApproval(...)` sends that command-like payload through the same stream adapter on the persisted thread id and records a `deepagent_resumed` run event.

Important implementation details:

- The resume payload must be wrapped in LangGraph `Command` before calling `streamEvents`/`invoke`. Passing `{ resume: ... }` as a plain object is treated as a new graph input by the real runtime; the interrupted tool call is cancelled instead of approved. The runtime adapter keeps Primoria's persisted resume payload as plain JSON, then constructs `new Command(resumePayload)` at execution time.
- When a `__interrupt__` stream event is seen, the adapter should record the waiting approval state but continue draining the stream until it ends. Returning immediately can close the iterator before async checkpointer writes settle, which makes immediate Postgres resume unreliable.

### DeepAgent Integration Checklist

Before enabling the real runtime for a tool or profile:

- stable `thread_id` is generated from workspace, thread, profile, and run ids
- checkpointer is configured when any approval/interrupt is possible
- every Primoria internal tool is wrapped with authorization and audit
- MCP tools are wrapped and allowlisted before being passed to Deep Agents
- custom subagents receive explicit `skills`
- tool approval rules are derived from Primoria policy, not model text
- DeepAgent HITL decisions are restricted to approve/reject until edited tool args can be persisted and audited
- filesystem backend is virtual or tightly scoped
- shell execution is disabled
- streaming events are persisted before being sent to the browser
- final output is persisted as a message, task update, or artifact

The DeepAgent harness can plan, use skills, delegate, and manage context. It should not be treated as the product permission boundary.

### Subagent Strategy

Subagents are useful for deep work, but should not be the first visible product abstraction.

Recommended layering:

```text
User sees: Workspace agents
Agent profile has: skills + tools + optional delegate agents
Runtime maps: delegate agents -> DeepAgent subagents
```

Subagents can be introduced for:

- a Researcher delegating source evaluation to a Citation Checker
- a Course Designer delegating quiz writing to an Examiner
- a Builder delegating review to a Critic
- a Project Mentor delegating search to a Researcher

Rules:

- A workspace agent can delegate only to profiles/capabilities it is allowed to use.
- Delegation should create run events so users can see that another agent helped.
- Public chat should not show every subagent message unless the result matters.
- Subagent tool sets should be intentionally smaller than the parent by default.
- Custom subagents must be given explicit skills because they do not automatically inherit parent skills.

V0 keeps custom subagents as explicit profile capabilities. The builder can select delegate agents, but runtime execution should still treat delegation as policy-controlled and only map those selected profiles into DeepAgent subagents once the real runtime path has production persistence and audit coverage.

## Skills

Skills should represent learning methods and workflows, not vague labels.

Good skill examples:

- `socratic-questioning`
- `visual-explainer`
- `quiz-generation`
- `course-outline-design`
- `misconception-diagnosis`
- `project-breakdown`
- `source-grounded-research`
- `code-debugging-guide`
- `math-step-checking`

Skill storage:

- System skills can live in repo or packaged skill folders.
- Workspace and user skills should be stored through a Primoria-controlled backend and exposed as scoped portable ids, not arbitrary filesystem paths.
- Skill metadata should be indexed for UI search.
- Subagent skills must be explicit.

Portable skill id conventions:

```text
/skills/{system-skill}
/workspace-skills/{workspaceId}/{skill-slug}
/user-skills/{ownerId}/{skill-slug}
```

Runtime rules:

- `/skills/*` resolves only to packaged system skills with a concrete `SKILL.md`.
- `/workspace-skills/*` resolves only when the current run belongs to the same workspace.
- `/user-skills/*` resolves only for the owning user.
- Unknown filesystem-like paths are dropped before calling Deep Agents.
- Stored skills must be materialized as a directory containing `SKILL.md` before being passed to Deep Agents.
- Public API responses must expose only portable ids and skill metadata, never server `directory` or `skillFile` paths.

In user-facing UI, describe skills as "ways this agent works" instead of exposing implementation details.

### Skill Authoring Rules

Each skill should have:

- specific `name`
- specific `description` that lets the model decide when to load it
- short instructions
- optional examples, templates, or scripts
- clear tool expectations
- clear output expectations

Avoid giant "learning assistant" skills. Prefer narrow skills that compose.

Example:

```markdown
---
name: misconception-diagnosis
description: Diagnose likely misconceptions from a learner answer and produce targeted feedback plus one follow-up question.
---
```

### System Skill Pack

The first Primoria skill pack should be small and learning-focused:

```text
apps/web/src/lib/workspaces/skills/
  socratic-questioning/
    SKILL.md
  visual-explainer/
    SKILL.md
  quiz-generation/
    SKILL.md
  misconception-diagnosis/
    SKILL.md
  project-breakdown/
    SKILL.md
  source-grounded-research/
    SKILL.md
  artifact-review/
    SKILL.md
```

Each skill should define:

- when to use it
- how to interact with the learner
- what tools are expected or forbidden
- desired output shape
- how to avoid giving away answers too early when learning is the goal

Example output contract for a Socratic skill:

```markdown
Return at most:
1. one short acknowledgement
2. one guiding question
3. one optional hint if the user is stuck
```

This prevents learning agents from turning every interaction into a long lecture.

### Skill Builder

User-created skills are valuable because they let people turn a learning preference or workflow into reusable agent behavior.

Current builder flow:

1. user describes how the agent should help
2. user provides a narrow skill name, description, and instructions
3. user chooses whether the skill is a shared workspace skill or a personal skill
4. skill is saved through the controlled workspace/user skill backend
5. skill appears beside system skills in the agent builder with a visible version
6. skill can be attached to custom agents or edited agent profiles
7. skill can be edited in place without changing its portable id; the edit form is prefilled from the real saved `SKILL.md` description and instructions
8. skill can be deleted, which also removes it from selected agent capability drafts
9. skill history can be reviewed and an older version can be restored as a new latest version

Later, the system can propose a narrow name, examples, and forbidden behavior from a short natural-language description.

Generated or user-authored skills must still be treated as untrusted configuration. They guide model behavior but do not grant tool permissions.

Stored skills should be versioned. Creating a new skill must allocate a unique slug inside its workspace/user scope so duplicate display names do not overwrite existing content or history. Updating a skill increments its version and keeps the portable id stable so existing agent profiles do not break. Each update should also preserve a controlled copy of the previous content so review/recovery UI can inspect earlier versions. Restoring an older version must create a new latest version instead of mutating history. Listing a stored skill should return the persisted description and instructions so editing never forces users to recreate hidden prompt text from memory. Public list/history responses should serialize away server-local `directory` and `skillFile` fields. Deleting a stored skill should make runtime resolution fail safely instead of preserving a stale filesystem path.

Durable storage contract:

- Local file-backed skills remain useful for development and tests.
- Production skills should live behind a durable backend, currently modeled by `workspace_agent_skills` and `workspace_agent_skill_versions`.
- The durable backend stores the materializable `SKILL.md` markdown plus structured name, description, instructions, slug, source, and version metadata.
- Runtime config must keep scoped portable skill ids alive long enough for async preparation. System skills can resolve synchronously to local directories, but `/workspace-skills/{workspaceId}/{slug}` and `/user-skills/{ownerId}/{slug}` should remain in the config when they match the current profile scope so the durable backend can materialize them before DeepAgent runs.
- Runtime still receives a materialized skill directory only after the portable id has passed workspace/user scope checks. Wrong-scope portable skill ids must be dropped before the runner sees them.
- Materialized DB skill directories are cache artifacts, not source of truth. They should be safe to delete. The agent-skills API still runs a once-per-process opportunistic cleanup, and production can now run `pnpm --filter @primoria/web workspace:agent-skills:maintenance` as an explicit cron/background maintenance command. `WORKSPACE_AGENT_SKILL_STORAGE_ROOT` can override the cache root and `WORKSPACE_AGENT_SKILL_MAINTENANCE_RETENTION_DAYS` can override the default 7-day retention.
- DB/API responses must expose portable ids and metadata, not local materialization paths.

## Internal Tools

Internal tools should be small, typed, authorized, and audited.

Initial tool set:

- `search_workspace_messages`
- `summarize_thread`
- `create_workspace_task`
- `update_workspace_task`
- `share_learning_app`
- `generate_course`
- `render_interactive_widget`
- `create_quiz`
- `save_learning_artifact`

Each tool declares a policy:

```ts
type ToolPolicy = {
  toolName: string;
  risk: "read" | "write" | "external" | "costly";
  approval: "never" | "on_risk" | "always";
  scopes: string[];
  visibleLabel: string;
  description: string;
};
```

Rules:

- Read-only tools can run without approval when the user already has access to the data.
- Write, costly, and external tools should require `on_risk` or `always` approval.
- Internal tools must enforce authorization themselves.
- Tool start, end, failure, and approval events must be persisted as run events.
- Every internal tool policy must have a typed executor. Adding a policy without an executor should fail tests/typecheck instead of surfacing as "approved but not implemented" after a user has already approved an action.
- Never rely on Deep Agents filesystem permissions to secure Primoria tools.

### Tool Risk Tiers

Use product-level risk tiers before mapping tools into Deep Agents.

| Tier | Examples | Default Approval |
| --- | --- | --- |
| read | search messages, summarize visible thread | never |
| low write | create one task in current workspace | on_risk |
| high write | modify course/app/artifact, bulk task creation | always |
| external | web/MCP/API call that sends data out | always |
| costly | expensive model/tool run | on_risk or always |

The model should not decide whether a tool is safe. The policy layer decides from tool metadata, user permission, workspace scope, and action payload.

### Initial Internal Tool Contracts

V0 tools should be boring, narrow, and easy to test.

#### `search_workspace_messages`

Purpose: retrieve messages visible to the current agent run.

Constraints:

- searches only authorized threads
- excludes private direct chats where the agent is not a participant
- returns snippets and ids, not unlimited full transcripts
- read-only; default approval `never`

#### `summarize_thread`

Purpose: create a compact summary of the current thread or a visible thread.

Constraints:

- read-only but still logged
- should identify uncertainty and missing context
- should not write memory by itself

#### `create_workspace_task`

Purpose: create a task in the current workspace/thread.

Constraints:

- write action; default approval `on_risk`
- payload must include title and optional assignee/member id
- no bulk creation in V0
- completion message should link the created task

#### `update_workspace_task`

Purpose: update status, assignee, or result summary for a task.

Constraints:

- write action; default approval `on_risk`
- must check task belongs to workspace
- reopening a task clears stale submitted/result fields

#### `share_learning_app`

Purpose: attach an existing app/card to the thread.

Constraints:

- first version should only share existing persisted apps, not generate mock data
- approval depends on whether it writes to shared workspace state

#### `save_learning_artifact`

Purpose: persist a reusable note, quiz, plan, diagram, or widget.

Constraints:

- write action; default approval `always` until artifact review UX exists
- artifact should be linked to the run and source thread

Every tool should return a structured result with a user-visible `summary` plus top-level ids for linked records. Draft-only tools that do not have durable records yet should still return explicit empty id arrays, so the runtime can distinguish "not persisted yet" from "the field was forgotten."

## MCP Connections

MCP should be phase two after internal tools are reliable.

Current status:

- Connections registry first slice is implemented for persistence and profile capability validation.
- Runtime preparation can now convert selected connections into guarded DeepAgent tools through LangChain's MCP adapter. The raw adapter tools are filtered through Primoria's profile allowlist, renamed to stable runtime-safe tool names, marked as external risk, forced through approval interrupts, and cleaned up after the run.
- When an external connection tool approval is approved and a DeepAgent runner is available, Primoria resumes the same persisted `deepAgentThreadId` with an approve decision, persists returned runtime events, and links the resulting agent message/run status. If no runner is available, it records a `deepagent_resume_required` event instead of falsely marking the run completed.
- The normal product label remains "Connections"; "MCP" should stay in advanced/developer language.
- A connection can be user-scoped or workspace-scoped. User-scoped connections are visible only to their owner; workspace-scoped connections are visible in that workspace.
- An agent `mcp_tool` capability is only valid when it references a visible connection and a tool name in that connection's allowlist.
- The agent builder/editor now lets users choose connection tools per agent through `Connections this agent can use`; selection creates explicit `mcp_tool` capabilities instead of granting every tool on a connection.

Connection model:

```ts
type AgentMcpConnection = {
  id: string;
  ownerId: string;
  workspaceId?: string;
  displayName: string;
  transport: "stdio" | "http" | "sse";
  configRef: string;
  allowedToolNames: string[];
  createdAt: number;
  updatedAt: number;
};
```

Runtime rule:

1. Load only connections allowed for the current agent profile.
2. Convert MCP tools to LangChain-compatible tools.
3. Wrap every MCP tool with Primoria policy checks.
4. Emit `tool_start`, `tool_end`, and failure run events.
5. Require approval for write, external, and costly tools.
6. Never expose a workspace user's MCP tools globally to every agent.

User-facing label should be "Connections", not "MCP", unless the user is in an advanced configuration area.

### MCP Product Rules

- A connection belongs to a user or workspace, never globally to all agents.
- Adding a connection does not automatically expose every tool to every agent.
- Each agent profile has an explicit allowlist.
- External data egress must be visible in approval copy.
- Tool names from MCP servers should be normalized into user-readable labels.
- Failed MCP calls should not collapse the whole chat; they should produce run events and a recoverable error state.
- Disabling a connection must stop future profile allowlisting and runtime tool use without deleting the connection record or historical run/approval events.

### MCP Threat Model For Product Design

MCP gives agents power outside the normal chat model, so it must be designed as a connection system, not a hidden developer hook.

Risks:

- data egress from private workspace messages to external tools
- write actions in third-party systems
- confusing ownership when one user's connection is used by a workspace agent
- prompt/tool descriptions that try to override Primoria policy
- expensive or long-running external calls

Required controls:

- connection ownership: user-owned or workspace-owned
- per-profile allowlist
- per-tool approval mode
- compact approval copy showing destination and data category
- audit log linked to run id
- revocation path that disables future use without deleting run history, plus a clear re-enable path when the owner intentionally restores access

Normal users should see "Connections". Advanced users can see MCP details such as transport and tool names.

### MCP Runtime Wrapping

Tool wrapping order should be:

```text
raw MCP tool
  -> normalize schema and label
  -> policy wrapper
  -> authorization wrapper
  -> audit/event wrapper
  -> approval interrupt wrapper
  -> LangChain tool passed to DeepAgent
```

Do not pass raw MCP tools directly to a DeepAgent.

## Memory

Memory should be explicit because this is a learning product.

Scopes:

- `none`: no persistence beyond the current run.
- `thread`: remembers this room or direct chat.
- `workspace`: remembers shared goals, project state, and learning context.
- `user`: remembers personal learning preferences and long-term goals.

Plain UI copy:

- "This agent does not remember after the run."
- "This agent remembers this chat."
- "This agent remembers this workspace."
- "This agent can remember my learning preferences."

First version:

- Persist run summaries and thread summaries.
- Do not write user-level memory without explicit approval.
- Show memory scope in the profile editor.

Later:

- Use a LangGraph Store-backed memory layer.
- Add memory review and deletion.
- Add workspace-level memory visibility controls.

### Memory Records

Memory should be stored as reviewable product data, not invisible prompt text.

Suggested table shape:

```ts
type AgentMemory = {
  id: string;
  workspaceId?: string;
  userId?: string;
  threadId?: string;
  agentProfileId: string;
  scope: "user" | "workspace" | "thread";
  title: string;
  summary: string;
  sourceRunId?: string;
  sourceMessageId?: string;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
};
```

Memory write rules:

- Thread memory can be automatic after a completed run if the thread permits it.
- Workspace memory should be visible to workspace members.
- User memory requires explicit user opt-in.
- Any memory can be reviewed and archived.
- An agent should cite memory use in run detail when it materially affects an answer.

For Deep Agents, LangGraph Store can back runtime memory, but Primoria should still keep product-visible memory summaries so users can understand and control what agents remember.

## Approval And Safety

Approvals should appear as compact chat cards or run cards.

Approval required for:

- external MCP write actions
- sending messages outside Primoria
- modifying user-created courses or apps
- creating many tasks at once
- expensive model or tool runs
- persistent user-scope memory writes

Approval states:

- requested
- approved and running
- denied
- expired
- completed

Approval resume rule:

- Resume the same run.
- Reuse the same DeepAgent `thread_id`.
- Persist the approval decision as a run event.
- If approval is denied, let the agent produce a safe fallback response.

Current implementation path:

- Approval requests are durable workspace records linked to runs and visible inline in chat.
- Denying an approval cancels the waiting run and records an audit event.
- Approving `create_workspace_task` executes the internal tool, creates the task, writes a final agent message, and completes the same run.
- Approving `update_workspace_task` updates the task, writes a final agent message, and completes the same run.
- Runtime now recognizes LangGraph/DeepAgent HITL stream chunks containing `__interrupt__` and converts their `actionRequests` plus `reviewConfigs` into Primoria `approval_request` events, using Primoria tool policy metadata for the persisted approval payload. Persisted approvals keep HITL `reviewConfig` and `actionDescription` under `approval.policy` for resume audit/UI, while `approval.input` stays limited to the tool args.
- The inline approval card now renders from persisted product metadata instead of raw runtime/tool details: it prefers `policy.visibleLabel`, uses `policy.actionDescription` for the explanation, summarizes the affected item from `approval.input`, and avoids dumping raw JSON in the default chat surface.
- A tested resume protocol helper maps a persisted Primoria approval decision back to the DeepAgent HITL command payload while reusing the same `deepAgentThreadId`; approved decisions resume with `approve`, denied decisions resume with `reject` and optional reviewer feedback. Approval decision audit events now include the `deepAgentThreadId` plus a compact `resumeDecision` summary in both local and DB-backed stores. A tested resume execution helper can stream that command-like payload through an agent on the persisted thread id and emit a `deepagent_resumed` status event.
- Approval decisions now have a stricter local/DB state machine: pending approvals can be approved or denied, repeating the same completed decision is idempotent and creates no duplicate audit events, and attempting to flip a decided approval returns a clear invalid-state error.
- Full DeepAgent graph resume should build on the same approval record and stable `deepAgentThreadId` once the real runtime is enabled end to end.

### Safety Copy Requirements

Approval cards should answer four questions in one compact surface:

- Which agent is asking?
- What action will happen?
- What data or object will be affected?
- What happens if I deny it?

Avoid raw JSON in the default card. Raw payload can live in a debug/detail affordance later.

### Approval Card Examples

Good compact copy:

```text
Project Mentor wants to create 1 task
"Draft practice plan for linear algebra"
[Approve] [Deny]
```

For external connections:

```text
Researcher wants to use Google Drive
It will search filenames and document snippets from your connected Drive.
[Approve once] [Deny]
```

For memory:

```text
Socratic Coach wants to remember a preference
"You prefer hints before full solutions."
[Remember] [Don't remember]
```

The card should not display implementation JSON by default. Debug payloads can be one click away for developers or support.

### Audit Requirements

Every approval and sensitive tool action should produce:

- run event id
- run id
- workspace id
- agent profile id
- requesting user id when available
- affected record ids
- decision status
- timestamp

This supports debugging, user trust, and later enterprise controls.

## UI Surfaces

### Member Add Flow

The current invite pattern should become a compact `+` flow.

- `+` opens a people and agent picker.
- Person and Agent can be tabs or a segmented control.
- The Agent tab shows templates and user-created agents.
- Agent rows show name, purpose, and small capability hints.
- "Create agent" opens a compact profile editor.
- Adding an agent should create or reuse an agent profile, then add a workspace member.

Agents should feel like selectable collaborators, not settings.

Suggested interaction:

```text
Click +
  -> popover opens
  -> segmented control: People | Agents
  -> search input filters both lists
  -> selecting a person starts invite/add flow
  -> selecting an existing agent adds it to the current room/workspace
  -> "Create agent" opens compact profile form in the same popover or modal
```

This directly addresses the desired mental model: inviting an agent is as natural as inviting a person.

### Agent Picker Information Density

The picker should be compact enough to use repeatedly:

- one row per person or agent
- avatar/status/type indicator
- display name and one-line purpose
- capability chips only when helpful
- no large marketing cards
- no default-open detail side panel

Advanced configuration belongs after selection, not in the first picker.

### Agent Profile Editor

Fields:

- name and handle
- purpose
- behavior instructions
- skills
- tools
- memory scope
- approval settings
- visibility: private or workspace

The default editor should be simple. Advanced model, MCP, and raw prompt controls can live behind an advanced section.

Default layout:

- identity: name, handle, purpose
- behavior: short instruction text
- ways of working: selectable skills
- allowed actions: tools and approval level
- memory: scope selector
- visibility: private or workspace

This editor should be available later from an agent member menu, a profile page, and the add-agent flow.

### Agent Builder UX

Agent creation should avoid raw prompt-first design. Suggested form:

1. Name: "Visualizer"
2. Purpose: "Turns hard ideas into diagrams and interactive explanations."
3. Ways this agent works: selectable skills
4. Allowed actions: selectable tools with approval labels
5. Memory: none, this chat, this workspace, my preferences
6. Behavior details: optional advanced instruction text

Default values should be safe:

- memory: `thread`
- external connections: disabled
- write tools: approval required
- group auto-assist: off

The editor can show a generated preview sentence:

```text
Visualizer can explain concepts visually, summarize this chat, and ask before creating tasks.
```

This is more understandable than showing a giant system prompt.

### Group Chat

Required states:

- agent member row with status
- mention shortcut
- run status chip in the message stream
- compact run card for long-running work
- inline approval card
- artifact card
- optional run detail drawer or popover opened by user intent

Right sidebar behavior:

- Do not default-open a dense detail sidebar.
- The right area should stay focused on useful contextual information.
- Run details should open from a specific run card or message chip.

### Empty Workspace

When a user has no members, rooms, or messages yet, the screen should not feel broken or half-empty.

Use a full-height first-run state:

- central action: start a chat or create a room
- secondary action: add people or agents
- optional template suggestions
- no mock messages
- no fake activity

### Empty Agent States

When there are no agents:

- show "Add an agent" as one of the first useful actions, not as an error state
- offer a few compact templates
- explain that agents can join group rooms or private chats
- do not show fake online agents

When an agent has no runs yet:

- show purpose and available actions
- suggest "Mention this agent in chat" or "Start a direct chat"
- avoid empty timelines or placeholder logs

### Run Detail

Run detail should be opt-in.

Default chat stream:

- status chip
- one-line latest event
- approval card if blocked
- final message or artifact

Opened detail:

- timeline of run events
- tool calls and results
- approval decisions
- final output links
- debug ids for support

Do not make a permanent right sidebar the default run detail surface.

### Mobile And Narrow Layout

On narrow screens:

- member/task sidebars collapse behind buttons
- the chat stream remains primary
- agent run details open as inline expansion or bottom sheet
- the `+` add flow becomes a full-screen sheet if needed
- approval cards keep primary actions visible without horizontal overflow

The agent system should not depend on a wide desktop sidebar to be usable.

## API Contract

Initial endpoints should be boring and explicit.

- `GET /api/workspaces/:id/agents`: list templates and existing agent profiles visible to the user.
- `POST /api/workspaces/:id/agents`: clone a template or create a custom profile, then add it as a workspace member.
- `PATCH /api/workspaces/:id/agents/:profileId`: update profile fields and capability settings.
- `GET /api/workspaces/:id/agent-runs/:runId`: fetch run, events, approvals, and linked outputs.
- `POST /api/workspaces/:id/agent-runs/:runId/cancel`: cancel queued/running/waiting run.
- `POST /api/workspaces/:id/agent-runs/:runId/retry`: create a new run from a failed or cancelled run's original input message or task.
- `PATCH /api/workspaces/:id/agent-approvals/:approvalId`: approve or deny an action.

Message and task APIs can trigger agents, but they should return agent run objects separately from the human-created message/task.

Example message response:

```ts
type CreateMessageResponse = {
  message: WorkspaceMessage;
  agentRuns?: WorkspaceAgentRun[];
  agentRunEvents?: WorkspaceAgentRunEvent[];
  agentApprovals?: WorkspaceAgentApproval[];
  agentMessages?: WorkspaceMessage[];
};
```

This keeps the UI from guessing whether a message was human-created or agent-created.

### API Response Rules

- Creation endpoints should return the created/updated records needed to merge client state.
- Message/task endpoints that trigger agents should return run objects separately from messages/tasks.
- Approval decisions should return updated approval, run, run events, and any resulting message/task/artifact.
- Cancel should return updated run, cancellation event, and expired approvals if any.
- API routes should never require the client to infer agent identity from `displayName`.
- Errors should be user-visible enough to avoid stale UI: not found, no access, invalid approval state, tool unavailable.
- Core workspace, join, member, chat/thread/task endpoints should return explicit validation JSON for malformed requests instead of throwing parser errors.
- Agent create/edit, connection registry, skill-library, memory review, approval decision, and run cancel APIs should return explicit JSON errors for validation, unsupported memory actions, missing profiles/connections/skills/memories/approvals/runs, and capability/connection/skill/review policy failures instead of leaking framework-level 500 responses.

Recommended cancel response:

```ts
type CancelAgentRunResponse = {
  run: WorkspaceAgentRun;
  agentRunEvents: WorkspaceAgentRunEvent[];
  agentApprovals?: WorkspaceAgentApproval[];
};
```

Recommended retry response:

```ts
type RetryAgentRunResponse = {
  agentRuns: WorkspaceAgentRun[];
  agentRunEvents: WorkspaceAgentRunEvent[];
  agentApprovals?: WorkspaceAgentApproval[];
  agentMessages?: WorkspaceMessage[];
  task?: WorkspaceTask;
};
```

Retry rules:

- Retry creates a new run; it does not mutate the source run.
- Retry is available for `failed` and `cancelled` runs.
- Chat retries reuse the source run's `inputMessageId`.
- Task retries reuse the source run's `taskId`.
- The new run should include a `retried` or equivalent audit event with the source run id.
- Retrying a run without a recoverable input message or task should return a clear API error.

Recommended approval response:

```ts
type DecideApprovalResponse = {
  approval: WorkspaceAgentApproval;
  run: WorkspaceAgentRun;
  agentRunEvents: WorkspaceAgentRunEvent[];
  message?: WorkspaceMessage;
  task?: WorkspaceTask;
  artifact?: WorkspaceArtifact;
};
```

### Artifact Records

Message artifact JSON can keep chat cards backward-compatible, but artifacts should also be indexed as first-class workspace records so they can power future artifact libraries, review pages, reuse flows, and agent references without scanning chat messages.

```ts
type WorkspaceArtifact = {
  id: string;
  workspaceId: string;
  threadId: string;
  kind: "app" | "task_result" | "course" | "saved_artifact";
  title: string;
  description: string;
  reviewStatus: "needs_review" | "reviewed";
  sourceMessageId: string;
  sourceRunId?: string;
  payload: WorkspaceMessageArtifact;
  createdAt: number;
  updatedAt: number;
};
```

Rules:

- Creating an artifact message also creates or updates one artifact record.
- Approval-generated artifacts link back to the source run.
- The chat message remains the visible collaboration event.
- `WorkspaceView.artifacts` is the reusable/library index.
- First-class kind should express product meaning even when the legacy chat card still uses `WorkspaceMessageArtifact.type === "task"`; for example generated courses become `course`, saved plans become `saved_artifact`, and completed task outputs become `task_result`.
- Run events should reference first-class artifacts by compact metadata, not by embedding full legacy snapshots or full `WorkspaceArtifact` payloads. Artifact/tool events should carry fields such as `artifactId`, `artifactKind`, `artifactTitle`, `sourceMessageId`, `sourceRunId`, and `outputMessageId`; consumers that need the full payload should read `WorkspaceView.artifacts` or the linked message.
- Migration/import code may read legacy `workspace_messages.artifact` snapshots to create missing first-class `workspace_artifacts` rows, but that is a compatibility backfill path. New feature code should write the artifact record and chat snapshot together through the artifact bundle helper, then read library/review state from `WorkspaceView.artifacts`.

## Data Tables

Likely tables:

- `workspace_agent_profiles`
- `workspace_agent_capabilities`
- `workspace_members.agentProfileId`
- `workspace_agent_runs`
- `workspace_agent_run_events`
- `workspace_agent_approvals`
- `workspace_artifacts`
- `workspace_agent_connections`
- optional `agent_memories`

Current memory persistence slice:

- `workspace_agent_memories` now exists as the first product-visible memory table.
- `WorkspaceView.agentMemories` exposes non-archived memories visible to the current workspace/thread scope.
- `createWorkspaceAgentMemory(...)` can create thread/workspace/user-scoped memory records with title, summary, agent profile, and optional source run/message links. Memory source provenance is validated before persistence: source runs/messages must exist, be visible to the current user, and match the memory thread when the memory is thread-scoped.
- `archiveWorkspaceAgentMemory(...)`, `archiveWorkspaceAgentMemories(...)`, `restoreWorkspaceAgentMemory(...)`, `deleteWorkspaceAgentMemory(...)`, `DELETE /api/workspaces/:id/agent-memories/:memoryId`, `POST /api/workspaces/:id/agent-memories/bulk-archive`, `POST /api/workspaces/:id/agent-memories/:memoryId?intent=restore`, and `POST /api/workspaces/:id/agent-memories/:memoryId?intent=delete` can archive, restore, or permanently delete memories. Archive hides memory from normal context while retaining audit history; restore returns it to normal context; explicit delete removes it from audit queries too.
- `listWorkspaceAgentMemories(...)` can load memory audit history with `includeArchived`, so archived memories remain inspectable even though normal workspace context hides them. Memory audit history also filters thread-scoped memories by visible threads and user-scoped memories by owner, so review/audit pages do not expose private direct-chat memories to non-participants.
- The workspace details surface now has a compact `Memory review` panel backed by `WorkspaceView.agentMemories`, with scope labels, agent/source metadata, a real empty state, and an `Archive memory` action. `/workspace/review?tab=memories` adds a real-data `Archive visible memories` bulk action for accumulated memories plus an archived-memory audit summary with recent archived entries, `Restore memory`, and explicit `Delete memory` actions. This keeps memory reviewable, reversible, and user-controllable without turning the default chat into a memory dashboard.
- `/workspace/review?tab=memories` provides a fuller real-data review page for accumulated memories, alongside artifacts and skills.
- Agent runtime prompt construction now receives visible `agentMemories` from the workspace view and injects only non-archived memories for the current agent, including workspace/user-scope memories and current-thread memories while excluding other thread memories.
- Completed profile-backed agent runs now conservatively create reviewable run-summary memories only for `thread` or `workspace` memory scopes. Failed, cancelled, approval-waiting, implicit legacy, `none`, and `user`-scope runs do not auto-write memory. The automatic scope boundary is a named store helper and has local/DB regression coverage proving completed user-scope agent runs return no automatic memories and do not create workspace-visible memory records. Message/task APIs return newly created `agentMemories` so the review surfaces can update without waiting for a full refresh.
- `save_agent_memory` is now a guarded internal tool policy for explicit memory writes. It always requires approval, including user-scope preferences, and approved decisions create reviewable memory records while returning the new memory to the client.
- User-scope memories are owner-visible only: DB workspace views, memory review lists, archive/restore/delete, and bulk archive paths filter `scope: "user"` records by `userId`, while workspace/thread memories remain visible according to workspace and thread access. Other workspace members cannot see or mutate someone else's personal memory by guessing the memory id.
- The agent builder/editor now exposes memory writing as a separate allowed action, `Can save reviewable memories`. Memory scope answers what context may persist; this allowed action answers whether the agent may request an explicit reviewed memory write through `save_agent_memory`.
- The agent builder/editor also exposes the core learning artifact actions as explicit toggles: create practice quizzes, generate course drafts, render interactive widgets, and save learning artifacts. These map to `create_quiz`, `generate_course`, `render_interactive_widget`, and `save_learning_artifact` capabilities, keeping tool power opt-in and visible instead of hidden inside prompt text.
- The agent builder/editor now exposes the base collaboration actions too: search workspace messages, summarize chat, create tasks, update tasks, and share learning apps. These map to `search_workspace_messages`, `summarize_thread`, `create_workspace_task`, `update_workspace_task`, and `share_learning_app`, so custom agents can be configured from the same explicit internal tool set used by templates.
- The action controls are now grouped in the compact builder/editor as Context actions, Task actions, Learning artifact actions, and Memory actions. This reduces density without hiding capability choices or moving agent setup into a default-expanded detail drawer.
- The agent builder now exposes the complete first system skill pack, including Socratic questioning, visual explanation, project breakdown, quiz generation, misconception diagnosis, source-grounded research, and artifact review. This lets custom agents compose the same learning methods that template agents use.
- Custom agent create/edit now exposes profile visibility as product language: `Workspace agent` or `Personal agent`. The value persists through the existing profile `visibility` field instead of being hard-coded to workspace visibility in the client.
- Creating a `Personal agent` now saves a profile without forcing it into the workspace member list. The shared `+` flow also has an `Add existing agent` path that can add a saved personal/workspace profile as a real member later. The same agent picker now lets the user choose between adding the agent to the workspace and starting a private direct chat; the direct-chat path ensures the selected agent is a real member, creates a persisted direct thread with that agent participant, and switches into that chat. This keeps "my agent library" distinct from "who is in this room/workspace" while still using the same collaborator picker.
- The personal-agent save path now uses explicit submit copy (`Save to my agents`) and a non-error success message (`Agent saved to My agents...`) so profile-only saves do not look like failed member invitations.
- The personal agent library follows the owner across workspaces. A saved personal agent can be added to another workspace without cloning the profile, so its identity, skills, and permission policy remain stable.
- Editing a saved personal agent from any workspace where the owner can see it updates the original profile record and every member reference to that profile, rather than creating a workspace-local shadow edit. Local and DB tests cover cross-workspace personal-agent edits.
- Private personal profiles stay hidden from other workspace members unless that profile is added as a member. Once added, collaborators can see the participating agent profile because the agent is now a visible workspace participant.
- DB workspace views load agent profile records referenced by current workspace members even when the profile's home `workspaceId` belongs to another workspace. This keeps reused personal agents understandable to collaborators after the owner explicitly adds them as visible members, while still hiding private profiles that are only in the owner's saved-agent library.
- When a personal agent is reused across workspaces, workspace-scoped skills are resolved against the current run workspace rather than the profile's original home workspace. User-scoped skills can follow the owner, but a workspace-shared skill from workspace A should not silently shape runs in workspace B.
- Delegate subagents are also scoped to the current run workspace. A personal agent reused in workspace B should not silently delegate to a workspace A agent unless that delegate profile is explicitly participating in the current workspace context.
- Core workspace create, workspace join, member create, thread, message, and task create/update routes now return explicit validation JSON for malformed requests so the main workspace UI does not see framework-level 500 responses for simple bad input. Workspace join and task update routes also return stable not-found JSON for missing invite codes and tasks. Agent create/edit routes now use explicit JSON error responses for invalid request bodies, malformed JSON, missing profiles, empty capability sets, and connection/capability policy failures. Connection create/update routes now do the same for invalid or malformed connection payloads and missing connection records. Skill create/update/restore/delete routes now return explicit JSON validation, persistence, and not-found errors for the agent builder and review surfaces. The artifact review-status route and queue UI are intentionally removed for now. Memory bulk archive, archive, restore, and explicit-delete routes now return explicit validation, unsupported-action, and not-found JSON for memory review workflows. Approval decision and agent-run cancel routes now return explicit validation and not-found JSON rather than exposing parser/store internals to the inline approval/run controls. `workspace-agent-api.e2e.mjs` covers the real HTTP 400/404 contracts without relying on Next route internals.
- Agent create/edit API error classification now treats approval-policy and capability-policy failures as validation errors. Downgrading an `always` approval capability through the real HTTP routes returns a 400 JSON error instead of a framework-level or persistence-looking 500.
- Agent run retry API coverage now includes the unrecoverable-run path: a failed/cancelled run without an input message or task returns a clear 400 JSON error instead of creating a misleading empty retry.
- Workspace details now include a lightweight `Agent library` panel backed by real `WorkspaceView.agentProfiles`, `WorkspaceView.members`, and `WorkspaceView.agentRuns`. It separates `My agents` and `Workspace agents`, marks whether a profile is already in the workspace, summarizes enabled skills, actions, connections, delegates, and memory scope from persisted profile capabilities, shows `No runs yet` from real run history instead of fake timelines, and offers first actions to mention an in-workspace agent or start a direct chat from the saved profile. The direct-chat action reuses the shared profile/member/thread path rather than creating a parallel bot surface.
- `GET /api/workspaces/:id/agents` now fulfills the full listing contract by returning templates, visible agent profiles, and visible agent members. The `+` agent picker consumes those profiles/members and merges them into workspace state instead of treating the endpoint as template-only.
- The shared `+` picker now has a search field. In agent mode it filters both template rows and saved-agent rows by name, purpose, key, visibility, memory scope, enabled skill paths, internal tool names, connection tool names, and delegate capability metadata; in people mode it filters existing real workspace people and also doubles as the invite name entry so the picker keeps one compact selection rhythm. Selecting an existing person from the People side creates or reuses a persisted private chat with that member, matching the agent direct-chat mental model without inventing contacts or mock data. Agent rows also show compact capability hints on both template rows and saved-agent rows. The hints are derived from real capabilities and memory scope, capped to a few product-level chips, and keep the picker usable without turning it into a profile dashboard. Adding an agent to the workspace also adds it to the current room when that room uses an explicit agent allowlist; default all-agent rooms stay broad instead of being narrowed by the add flow. Browser coverage now verifies that searching by a concrete action such as `generate_course` and a concrete skill such as `socratic-questioning` filters the picker to the expected real templates.
- The empty workspace/start-chat surface now treats people and agents as equal first actions: `Add a person` and `Add an agent` both open the same real member picker in the workspace panel, while creating a group/private chat remains available from the same start surface. The copy distinguishes a truly empty workspace from a narrower empty chat type such as `No private chats yet`, so users do not see misleading empty-workspace language after group rooms already exist. This keeps first-run onboarding real-data-only and avoids a broken half-screen or mock conversation.
- Empty active chats now use the same real-data first-action model instead of a passive half-empty message area: the `No messages yet` state offers `Add a person`, `Add an agent`, and `New task`, so a default new workspace with an empty `General` room still has clear next steps without mock messages or fake activity.
- Browser coverage now verifies that a new workspace's empty default room can create a custom agent through the same `Add an agent` path, without inventing extra fake threads or relying on mock data.
- Built-in templates now cover the documented learning archetypes: Socratic Coach, Visualizer, Examiner/Practice Builder, Project Mentor, Research Buddy, Course Designer, and Critic / Reviewer. Template defaults attach real system skills plus explicit internal tools, so adding a template from the `+` flow gives a useful profile without granting hidden capabilities.
- Connections registry first slice now exists as product-owned data. `workspace_agent_connections`, `WorkspaceView.agentConnections`, and `/api/workspaces/:id/agent-connections` can persist user/workspace connection records with transport, config reference, status, and explicit `allowedToolNames`. Agent profile create/update now rejects enabled `mcp_tool` capabilities unless the referenced connection is visible to that owner/workspace, not disabled, and the tool name is allowlisted. The opt-in workspace details surface now has a lightweight `Connections` panel for real connection records, allowlist setup, and disable/enable controls without making the default chat layout an MCP dashboard. Disabled connections stay visible as registry/audit records but cannot be selected for new agent profile capabilities or runtime MCP tool preparation; registry management intentionally includes disabled records so the owner can re-enable a connection without losing history. Custom agent create/edit now exposes `Connections this agent can use`, explains that external connection tools always need approval before use, and labels each selectable tool as external/approval-gated before writing selected connection tools into explicit `mcp_tool` capabilities with approval forced on. The DeepAgent runtime prepare path now has an `agent-mcp.ts` wrapper that converts selected connections through LangChain's MCP adapter only after Primoria allowlist checks, wraps raw MCP tools as external-risk guarded specs, adds approval interrupts, and closes the MCP client after the run. Connection loading is recoverable: adapter config ignores connection load errors, unavailable or disabled selected connections produce no wrapped tools instead of collapsing runtime preparation, and failed external tool invocations return structured `{ ok: false, summary, error }` results for the agent/run event stream instead of throwing through the whole chat. Approved external connection tool decisions now resume the same stable DeepAgent thread when a runner is available, persist the returned events/message/status, and only fall back to a visible `deepagent_resume_required` audit event when no runtime can resume. Local and DB tests also cover disabled-connection rejection, re-enable, and resume failure: the approval stays approved for audit, the run becomes failed, `deepagent_resume_failed` is recorded, and no misleading success message is created.
- Normal workspace views also filter `mcp_tool` profile capability metadata by the viewer's visible connections. A collaborator may see a workspace-visible agent profile owned by someone else, but if that profile references the owner's personal connection, the collaborator's ordinary `WorkspaceView.agentProfiles[*].capabilities` must not expose that hidden connection id or tool names. Historical run snapshots remain audit records of what the run started with; the normal live workspace view is the privacy boundary.
- Profile lookup and edit responses use the same visible-connection filter, so workspace owners/admins can manage another member's shared agent identity without receiving the member's private connection capability ids or tool names in mutation responses.
- Hidden delegate `subagent` capability rows follow the same rule: a shared agent can keep an owner-only private delegate without exposing that private profile id to other workspace members' normal views or profile edit responses.
- Capability edits preserve hidden personal-connection `mcp_tool` rows and hidden delegate `subagent` rows that the editor cannot see. This prevents an admin or workspace owner from accidentally deleting another member's private reference capability simply because the edit form rebuilt the visible capability list without that hidden row.
- The inline profile editor can save visible identity/purpose/behavior/scope fields for a shared agent whose capabilities are fully hidden from the current viewer by omitting `capabilities` from the PATCH payload, letting the store preserve hidden rows instead of blocking the edit as "empty".
- Agent create/edit payloads filter selected connection tools against the current real connection allowlist before saving, so a revoked or disabled connection tool does not linger in client state and block unrelated profile edits.
- This is intentionally a reviewable product record, not invisible prompt text. Better summarization quality remains follow-up work; archive, restore, and explicit delete controls now exist in the review surfaces.

Migration rule:

- Preserve existing agent-like members by creating default profiles for members whose role or name clearly indicates agent or AI behavior.
- Do not infer agent identity from display names after migration.

### Data Consistency Rules

- Agent profile id is stable.
- Member display name can mirror profile display name, but profile remains the source of truth.
- Member creation validates any `agentProfileId` before persistence, so workspace membership cannot point at a missing or hidden profile.
- Direct thread participant ids should be persisted and returned consistently. Local and DB thread creation now both return the owner participant plus requested participants for direct chats, and tests cover the invariant.
- Local fallback storage must not mix users or workspaces in production. Workspace local storage is now disabled when `NODE_ENV=production`; production must use `DATABASE_URL` with a persisted workspace owner instead of writing to process memory.
- DB failures should not silently write to a separate local store and then read from DB later.
- Store writes should emit realtime notifications only after durable state changes succeed.
- Run events are append-only; run records hold current status.
- Pending approvals should not outlive terminal runs. Approval decisions now expire sibling pending approvals when the run becomes completed, failed, or cancelled, return the affected approvals to the client, and record a `pending_approvals_expired` run event.
- Stale pending approval rows on terminal runs are rejected at the store boundary. This protects historical/imported bad state from appending new approval/tool events after a run is already completed, failed, or cancelled.
- The agent API error-contract smoke now covers stale terminal-run approvals through the real approval decision route, so this lifecycle guard is user-visible as clear 400 JSON rather than a hidden store-only invariant.

These rules prevent the UI from showing "successful" agent actions that disappear on refresh.

## Realtime Contract

Workspace realtime should not be a per-client DB polling loop long term.

Target contract:

- writes publish workspace events after commit
- clients receive incremental updates for messages, tasks, members, agent runs, run events, approvals, artifacts, memories, and connections. The current SSE route still sends a full `WorkspaceView` on initial connect and after workspace write notifications, but heartbeat pings no longer perform a full workspace read. Its version fingerprint includes the agent records that must trigger a workspace update, including member-to-agent-profile bindings through `member.agentProfileId`.
- The in-process workspace event hub has unit coverage for same-workspace fanout, cross-workspace isolation, and unsubscribe cleanup, so the write-notification path is not only protected by static route checks.
- reconnect fetches the latest view and resumes from a cursor when possible
- polling fallback is single-path and cancelled when streaming recovers. The client now keeps one named fallback interval, one reconnect timer, closes failed streams, retries EventSource, and clears fallback polling as soon as a `workspace` stream event arrives.
- workspace switching guards against stale stream or polling payloads from the previous workspace by comparing the payload workspace id with the current target workspace id before merging.

Agent run events should stream quickly enough to make tool use visible, but final state must always be recoverable from persisted run records.

### Event Types

The client should be able to merge these incrementally:

- `workspace.message.created`
- `workspace.thread.updated`
- `workspace.task.created`
- `workspace.task.updated`
- `workspace.member.created`
- `workspace.agent_profile.created`
- `workspace.agent_run.created`
- `workspace.agent_run.updated`
- `workspace.agent_run_event.created`
- `workspace.agent_approval.created`
- `workspace.agent_approval.updated`

Reconnect rule:

```text
stream disconnects
  -> close old stream and fallback timer
  -> refresh full workspace view once
  -> reopen stream
  -> cancel fallback when stream is healthy
```

### Agent Streaming Expectations

Agent runs have two different realtime needs:

- durable state: run, message, approval, task, artifact records
- ephemeral feel: message deltas and short progress updates

Durable state must be persisted before the client depends on it. Ephemeral deltas can be streamed for responsiveness, but refresh should recover the final state from records.

Client merge rules:

- merge runs by id
- append run events by id
- merge approvals by id
- merge members, agent profiles, and connections by id so API responses and SSE updates do not duplicate collaborator records
- merge messages/tasks/artifacts/memories by id. Message, task, retry, and approval responses can now carry first-class artifacts and reviewable memories so the artifact library and memory review surfaces update immediately instead of waiting for the next full stream refresh.
- full `WorkspaceView` stream/refresh payloads should merge by id for the same workspace instead of blindly replacing local mutation results; switching to a different workspace still replaces the view.
- stale full-view payloads from a previous workspace should be ignored after a user starts opening another workspace.
- archived memory records in mutation/SSE responses should remove the visible local memory by id, so review/archive actions update immediately instead of waiting for a hard refresh.
- never duplicate polling and SSE subscriptions after reconnect
- if stream errors, show a reconnecting state only when user-visible freshness is affected

Long term, use a shared event hub or pub/sub layer instead of each SSE connection polling the database.

## Implementation Phases

### Phase 1: Agent Identity Foundation

- Add agent profile and capability tables.
- Add built-in templates.
- Add `agentProfileId` on workspace members.
- Add APIs for listing templates and adding an agent to a workspace.
- Add API/store support for custom profiles without a template.
- Add API/store support for editing profile name, purpose, prompt, memory, visibility, and capabilities.
- Add member picker UI with people and agents.
- Keep placeholder replies behind `agent-runtime.ts`.

### Phase 2: Run Records And Runtime Boundary

- Add `workspace_agent_runs`.
- Add `workspace_agent_run_events`.
- Move placeholder agent reasoning out of `store.ts`.
- Return run records from message and task APIs.
- Show compact run status in the chat stream.

### Phase 3: Real DeepAgent Invocation

- Build DeepAgent config from profile, context, skills, and tools.
- Run real DeepAgent for mentions and direct chats.
- Persist streamed events.
- Persist final agent message.
- Add test coverage for prompt building, tool policy mapping, run id stability, and approval interrupts.

### Phase 4: Skills And Internal Tools

- Add system skill folders.
- Add guarded internal tools.
- Add tool event UI.
- Add task-assignment runs.
- Add artifact output support.

### Phase 5: Approvals

- Add approval cards.
- Add approve, deny, expire, and cancel APIs.
- Resume runs with stable `thread_id`.
- Require approval for risky internal tools.

### Phase 6: MCP Connections

- Add connection registry.
- Wrap MCP tools with policies.
- Add per-agent allowlists.
- Audit all tool calls.
- Add advanced configuration UI.

### Phase 7: User-Created Agent Builder

- Clone templates.
- Edit prompt, skills, tools, memory, and visibility.
- Share agents to workspace.
- Later: public or community templates.

Current implementation status:

- Template cloning is implemented.
- Custom profile creation is implemented at the store/API layer.
- Profile editing is implemented at the store/API layer.
- Custom agent create/edit now rejects empty or disabled-only capability sets instead of silently creating a fake `/skills/{agent-name}` capability. The builder shows a clear `Choose at least one way this agent can help.` error, and store-level local/DB tests enforce the same invariant for direct API/store calls.
- Custom agent purpose and behavior are now explicit guardrails, not hidden fallback text. Non-template profile creation requires a user-provided purpose and behavior instructions, profile updates reject blank purpose/behavior fields, purpose and behavior have shared store/UI length limits from a browser-safe guardrail module, and the client sends trimmed text instead of silently substituting generic copy or importing the server workspace store.
- Agent skill capability paths are validated before persistence. System skills must use `/skills/{slug}` and resolve to an existing Primoria system `SKILL.md`, workspace skills must use `/workspace-skills/{workspaceId}/{slug}`, and user skills must use `/user-skills/{ownerId}/{slug}` when an owner is available, so arbitrary filesystem-like paths, unknown built-in skill names, or mismatched source/path pairs cannot become durable profile capabilities.
- Agent internal tool capabilities are validated against Primoria's typed tool policy map before persistence. Unknown internal tool names such as shell/code execution strings cannot become profile capabilities; new internal actions must first be added to the policy/executor map and tests.
- Internal tool approval cannot be weaker than the tool policy default. Profiles can make an action stricter, such as changing an `on_risk` write action to `always`, but cannot downgrade costly/write/memory tools to weaker approval modes.
- External connection tool capabilities now require `always` approval before persistence. Runtime MCP wrappers already force external tools through approval interrupts; the store-level guard keeps persisted profile capabilities, picker summaries, and audit surfaces from ever claiming an external connection can run with weaker approval.
- The shared `+` add flow and inline profile editor are implemented for template agents, saved agents, custom agents, people, direct chats, workspace membership, profile field edits, skills, actions, delegates, memory scope, visibility, and connection-tool selections without introducing mock data.
- General agent run cancellation is implemented for waiting/running-style runs, including pending approval expiry and inline UI action.
- The first system learning skill pack exists under `apps/web/src/lib/workspaces/skills/*/SKILL.md` and is covered by `workspace.agent-skills.unit.ts`.
- Runtime resolves persisted portable skill ids such as `/skills/socratic-questioning` to concrete local skill directories, then stages the selected `SKILL.md` directories into a controlled temporary filesystem backend before calling Deep Agents. DeepAgent receives scan-friendly source paths such as `/skills/main/` and `/skills/{subagent}/`, not arbitrary absolute directories or raw portable ids.
- Workspace/user skill storage now has a controlled local backend for authoring `SKILL.md`, allocating unique portable ids for duplicate display names, listing stored skills with real saved descriptions/instructions, updating/deleting stored skills, preserving historical `SKILL.md` versions, and resolving scoped portable ids such as `/workspace-skills/{workspaceId}/{slug}` and `/user-skills/{ownerId}/{slug}` without passing arbitrary filesystem paths to Deep Agents. A durable DB backend now exists with `workspace_agent_skills` and `workspace_agent_skill_versions`; when `DATABASE_URL` is available, tests cover DB-backed create/list/update/history/restore/delete/resolve semantics while preserving portable ids and avoiding local directory leakage. DB-backed workspace skills resolve by workspace scope for collaborators, while mutation stays owner-scoped; this keeps shared workspace skills usable by profile/runtime configuration without letting another member overwrite or delete the creator's skill. The `/agent-skills` API now calls a backend selector that prefers DB storage in production and keeps local file storage as an explicit dev/test fallback. Runtime preparation now scope-checks DB-backed portable skill ids and materializes the saved markdown into controlled `.materialized/.../SKILL.md` directories before calling Deep Agents, while dropping raw filesystem-like paths. Materialized DB skill directories have a cleanup helper that removes stale cache directories while preserving fresh materializations, the agent-skills API triggers opportunistic maintenance once per server process, and `workspace:agent-skills:maintenance` provides an explicit cron/background command with configurable root and retention.
- The agent builder can create personal or workspace skills, edit, delete, review history, restore older versions, and view versions for stored skills through `GET/POST/PATCH/DELETE /api/workspaces/:id/agent-skills`, list them beside system skills with explicit Personal/Workspace source labels, prefill edits from persisted skill content, and attach them to new or edited agent profiles. `GET /agent-skills?path=...` exposes version history; `PATCH /agent-skills` with `restoreVersion` restores an older version as a new latest version; and `POST /agent-skills?intent=restore` supports review-page restore forms. Skill API responses are serialized to portable ids and metadata, without leaking server-local `directory` or `skillFile` paths. A dedicated Skill library review panel now surfaces stored skills, version history, edit entry points, and restore actions from the workspace details area so recovery is not trapped inside the compact agent builder controls; `/workspace/review?tab=skills` also provides a fuller real-data review page. That review page now loads real version histories, shows a compact latest-vs-previous comparison, and exposes restore actions for earlier versions so users can recover behavior directly from the full review surface.
- Agent profile create/edit now exposes a compact "Agents this agent can delegate to" capability control. Selected delegate profiles are persisted as explicit `kind: "subagent"` capabilities, keeping delegation opt-in and auditable.
- Delegate subagent capabilities are validated before profile persistence: missing profiles are rejected, self-delegation is rejected, and DB visibility checks prevent another workspace member from smuggling someone else's private saved agent into a workspace profile by profile id.
- DB-backed workspace-scoped agent connections require workspace-owner permission to create or manage. Personal/user connections remain owner-scoped and are invisible/unmanageable to other workspace members. Tests cover that non-owner members cannot create workspace connections, cannot disable workspace connections, and cannot manage another user's personal connection by id.
- The opt-in DeepAgent factory path is test-covered: `PRIMORIA_WORKSPACE_DEEPAGENT=1` enables it, guarded tools are converted, resolved skills are staged into a controlled `FilesystemBackend`, selected delegate profiles are mapped into explicit DeepAgent `subagents`, and approval-capable runs receive a real checkpointer object instead of a boolean placeholder. Runtime tests verify that main-agent skills are staged under `/skills/main/{skill}/SKILL.md`, custom subagent skills are staged under `/skills/{subagent}/{skill}/SKILL.md`, and DeepAgent receives source directories rather than individual skill directories. DeepAgent HITL `interruptOn` entries now use explicit product policy configs with `allowedDecisions: ["approve", "reject"]` plus visible action descriptions, so LangChain's edit decision is not exposed before Primoria can persist edited tool args safely. Runtime stream handling recognizes LangGraph `__interrupt__` chunks and maps HITL `actionRequests` / `reviewConfigs` into durable Primoria `approval_request` events with Primoria policy metadata; persisted approvals retain HITL review metadata in `approval.policy` without mixing it into tool input args. The runtime now also has unit-covered approval-resume helpers that convert Primoria approved/denied decisions into DeepAgent approve/reject resume commands tied to the stored `deepAgentThreadId`; approval decision audit events record the same `deepAgentThreadId` and compact `resumeDecision` in local and DB-backed stores. At execution time the stream adapter wraps the persisted JSON resume payload in LangGraph `Command`, which real DeepAgent requires to continue the interrupted tool call instead of treating resume as a new input. Runtime regression covers real DeepAgent HITL with `MemorySaver`, and DB regression covers the same interrupt/resume path through the real LangGraph Postgres saver/store using a deterministic fake model. DeepAgent persistence is now behind `PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE`; `memory` is the default dev mode, `disabled` fails fast when interrupts exist, and `postgres` loads `@langchain/langgraph-checkpoint-postgres` adapters, passes `DATABASE_URL` and optional schema, calls adapter setup, and never silently falls back to memory. The lower-level dependency factory now also refuses to create a DeepAgent when `interruptOn` is configured but no real checkpointer is provided, so test harnesses and future custom factories cannot bypass the HITL persistence invariant. Delegate subagents are selected only from enabled `kind: "subagent"` capabilities, exclude self/unselected profiles, receive explicit skills, convert their guarded tools instead of dropping them, keep read tools callable, and keep write/external tools approval-forced. DeepAgent `task` delegation stream events are mapped to `subagent_start` / `subagent_end` run events instead of generic tool events, and DeepAgent `write_todos` planning stream events are mapped to dedicated `todo` run events for inline planning visibility.
- `create_workspace_task` has guarded-tool integration coverage: invoking it from runtime context raises a durable approval payload, approved tool-layer execution returns a structured task payload for DeepAgent resume, approving that payload creates a real task/message, links the run, and records tool events in local and DB tests.
- `update_workspace_task`, `share_learning_app`, `render_interactive_widget`, and `save_learning_artifact` now participate in the same durable approval loop: guarded invocation raises approval, approved tool-layer execution returns structured task/artifact payloads for DeepAgent resume, approval creates or updates real workspace records/messages, links the run, and records tool/artifact events in local and DB tests. Approved widget renders become app artifact messages with an `html` or `generator` template snapshot. Reopening a previously submitted/done task now has local and DB regression coverage showing stale `resultSummary` and `submittedAt` are cleared.
- Read tools now keep source provenance and thread visibility tighter: runtime context passes structured visible message records into guarded tools, `search_workspace_messages` returns matching snippets with source message ids, and both search and summary filter structured records to the current thread so private/direct messages from other threads cannot leak through an over-broad runtime context. Tool tests cover source ids and cross-thread exclusion.
- `search_workspace_messages` and `summarize_thread` now both return structured JSON with a user-visible `summary` plus linked source ids (`sourceMessageIds`, and `openTaskIds` for summaries) instead of relying on unlabeled transcript text. The other internal learning tools now follow the same shape for provenance and draft links: quizzes expose `questionIds`, courses expose `moduleIds` and `relatedOpenTaskIds`, app/artifact tools expose `appIds`/`artifactIds`, task tools expose `taskIds`, and memory drafts expose `memoryIds` even when persistence still happens later through the approval flow.
- `create_quiz` is now a real low-risk internal learning tool rather than a placeholder policy entry: guarded invocation returns a structured quiz payload with topic, learning goal, source context, questions, expected answers, and rubrics without requiring approval.
- `generate_course` is now a real costly internal learning tool after approval: guarded invocation raises approval first, approved tool execution returns a structured course draft with modules, activities, deliverables, assessments, source context, related open tasks, and a review next step, and approved workspace decisions persist a visible course artifact card linked to the completed run.
- First-class artifact indexing has started: artifact chat cards still keep a `WorkspaceMessage.artifact` compatibility snapshot, but local and DB writes now create `WorkspaceArtifact` records exposed as `WorkspaceView.artifacts`; approval-generated artifacts link to their source run and message, with migration `0009_workspace_artifacts`. Artifact records now carry richer product kinds (`app`, `course`, `saved_artifact`, `task_result`) instead of only mirroring the legacy card type. Approved artifact creation and manual `createWorkspaceMessage` artifact writes now go through a bundle helper that builds one aligned first-class record plus one legacy snapshot. The `0009` migration also backfills missing first-class records from historical `workspace_messages.artifact` JSON using stable `wart_{sourceMessageId}` ids and `ON CONFLICT (source_message_id) DO NOTHING`, so legacy snapshots are compatibility import data rather than the long-term artifact index.
- Approval-generated artifact run events now publish compact first-class artifact metadata (`artifactId`, `artifactKind`, `artifactTitle`, `sourceMessageId`, `sourceRunId`, `outputMessageId`) instead of embedding the full `WorkspaceArtifact` record or treating legacy `message.artifact` as the event payload source. Local and DB tests cover this for generated courses and saved artifacts.
- The workspace details surface no longer includes the compact artifact library/review queue. First-class `WorkspaceArtifact` records remain for chat artifact rendering, source provenance, and compatibility with generated apps/courses, but there is no artifact review tab, queue filter, or review-status mutation surface.
- Task creation validates source artifact and source run visibility before persisting review provenance. A task cannot attach a hidden direct-thread artifact/run by id, and mismatched `sourceArtifactId` / `sourceRunId` pairs are rejected instead of creating misleading audit links.
- Chat artifact cards no longer label every non-app artifact as a temporary "Task card". Legacy task-shaped message artifacts are rendered with semantic labels and styling for course artifacts, saved artifacts, and task results while the underlying message payload remains backward-compatible. Chat rendering now normalizes display through a first-class `WorkspaceArtifact` record when one exists, prefers the record by `sourceMessageId` for kind, title, description, and payload, marks record-backed cards with artifact provenance, and uses legacy message payload inference only as a fallback.
- Client workspace merge behavior now has a focused unit test for reviewable memories: incoming records update by id, and incoming archived memories remove the local visible card immediately while preserving unrelated memories.
- The task assignee picker keeps people and agents in the same assignable member list, while labeling each option as a `Person collaborator` or `Agent collaborator` so agent assignment is visible without creating a separate workflow.
- Direct chat with a single agent auto-runs that agent without requiring an `@mention`, including DB-style direct threads that contain the current human participant plus the agent. Direct chats with multiple agents now stay silent unless an explicit agent mention routes the message.
- Personal/private agent profiles stay owner-scoped at the store boundary. Owners can reuse their saved personal agents across their own workspaces, but private saved agents cannot be added or edited by another workspace member via profile id before the owner explicitly adds that profile as a workspace member. DB tests cover that another joined member cannot see, add, or edit the owner's private saved agent by id.
- Shared workspace agent profile edits are owner/admin-scoped at the store boundary. Other workspace members can see and collaborate with a shared agent, but they cannot rename it or replace its skills/actions/connections by guessing the profile id; the profile creator or workspace owner must make those changes.
- Capability rows remain owned by the profile owner even when a workspace owner/admin edits a shared profile. Edit authority and profile ownership are separate: admin management should not rewrite capability audit ownership.
- Trigger detection now returns a structured decision for specific mentions, direct agent chats, generic `@agent` / `@agents` / `@ai` coordinator mentions, and silent room messages. Generic agent mentions route to one deterministic coordinator-selected agent by default, persist agent runs with trigger `coordinator` instead of being mislabeled as normal mentions, and run `started` events include the trigger decision reason/confidence plus selected agent ids for inline run detail/debugging.
- Agent run `started` events now carry an `agentProfileSnapshot` with the profile display name, handle, description, visibility, memory scope, model preference, template key, and enabled capability summary used at run start. This gives run detail and audit views a stable historical explanation even after the underlying agent profile is renamed or its skills/actions change.
- Room-level noise control now persists `WorkspaceThread.agentTriggerMode` and `allowedAgentProfileIds` through local and DB storage, API thread creation/update, and the create-chat plus room-header UI. `room_default` preserves the coordinator behavior, `mention_only` suppresses generic coordinator mentions while keeping named mentions active, and `quiet_review` suppresses automatic room chat runs so agents do not flood shared workspaces. Existing group rooms can change mode and allowed agents without recreating the chat. The store now validates allowlist profile ids before local/DB persistence so only agent profiles currently represented by members in that workspace can be selected. Default trigger/run execution is capped to one visible primary agent response per message, including generic coordinator requests and multiple named mentions.
- Failed and cancelled agent runs can be retried through store/API/UI. Retry creates a new run from the original input message or task and records a source-run audit event.
- Single-run detail is now an explicit store/API contract: `GET /api/workspaces/:id/agent-runs/:runId` returns the requested run, persisted events, approvals, linked input/output messages, linked task, first-class artifacts, and reviewable run memories. Single-run detail filters linked memories through the same user-scope owner visibility rules as `WorkspaceView`, so visible direct-chat participants do not see another user's personal memory attached to the run. Local and DB tests cover linked outputs so inline run detail does not have to infer everything from a full workspace view.
- Workspace-level agent run listing is scoped to visible threads before returning runs, events, or approvals. A workspace member who is not part of a private direct chat cannot discover that chat's run history by omitting `threadId` from the run-list request.
- Cancel and approval decision APIs now return explicit JSON errors for not-found or invalid requests instead of leaking framework-level failures, keeping recovery states visible to the client.
- Browser e2e now covers the combined agent collaboration path for direct agent chat, task-assignment runs, approved app artifact sharing, and retrying a failed run through the inline run detail UI.
- Authenticated DB-mode e2e coverage now signs up a real user, creates a persisted workspace/agent/thread through the API, verifies mention and task-assignment runs, approves a saved artifact, checks compact artifact event metadata plus first-class artifact indexing, retries a failed run, and confirms the rendered workspace UI shows the saved artifact card.
- A real opt-in DeepAgent approval/resume e2e smoke now exists as `workspace-deepagent-runtime.e2e.mjs`. It uses `PRIMORIA_WORKSPACE_DEEPAGENT=1`, Postgres persistence, and an explicit non-production fake-model/fake-external-tool harness so the API route, HITL approval card data, Postgres checkpointer resume, final message persistence, and browser rendering can be verified without external model or MCP credentials.

### TDD Plan

Each phase should have tests before or alongside implementation.

Minimum test slices:

1. Profile creation
   - clone template
   - create custom profile
   - add profile as member
   - update profile without changing member identity incorrectly
2. Trigger detection
   - mention one agent
   - direct chat with agent
   - task assignment to agent
   - no mention in group room stays silent
3. Run lifecycle
   - create run
   - persist status events
   - complete with final message
   - fail visibly
   - cancel queued/running/waiting run
4. Tools
   - read tool respects thread visibility
   - write tool requests approval
   - approved write creates record and event
   - denied write cancels or safely resumes
5. UI static/behavior
   - no mock data in empty state
   - `+` flow exposes People and Agents
   - task assignee picker labels people and agents explicitly
   - custom agent form works from an empty default room and does not create fake chat data
   - right sidebar is not default-open for run detail
   - approval and run detail are inline
6. Realtime
   - write emits workspace event
   - reconnect does not double-poll
   - client merges run/events/approvals without duplication

This keeps the feature aligned with product quality instead of only testing database shapes.

## V0 Acceptance Criteria

V0 is useful when:

- A user can add an agent through the same `+` pattern used for people.
- Agents appear in the member list and can be mentioned in a room.
- A custom agent profile can be created without a template.
- An agent profile can be edited without changing its identity or breaking member references.
- A direct chat with an agent works.
- Each agent action creates a run record.
- The UI can show whether an agent is queued, running, completed, failed, or waiting for approval.
- Placeholder replies are isolated behind runtime code and can be replaced by DeepAgent without changing workspace storage.
- No mock data appears in the workspace.
- The same `+` flow can add people and agents.
- Custom agents can be created when the workspace is otherwise empty.
- Agent run detail is inline/opt-in, not a default right sidebar.
- Pending approvals survive refresh.
- Cancelling a run expires pending approvals.

V0 does not need:

- user-created MCP connections
- public agent marketplace
- multi-agent debate mode
- async remote subagents
- advanced memory editor

## V1 Direction

After V0, the product should evolve toward user-created learning systems:

- personal agent library
- workspace-shared agent library
- skill builder
- reviewable memory
- MCP/connection allowlists
- artifact generation and review
- task-to-agent workflows
- lightweight coordinator routing
- reusable learning plans and practice loops

V1 should still avoid turning the workspace into an agent dashboard. The primary surface remains collaboration: rooms, direct chats, tasks, artifacts, and visible agent work.

## Risks

- Too many agents can make chat noisy. Use trigger rules, coordinator limits, and room settings.
- MCP can become unsafe if added before approval and audit. Add MCP after internal tools are reliable.
- DeepAgent approvals can break if `thread_id` is unstable. Define deterministic run thread ids early.
- Skills can become prompt sprawl. Keep skills narrow, searchable, and cloneable.
- Agent identity and workspace membership can get tangled. Keep profiles separate from members.
- Long-running tasks can block chat. Use run cards and async task execution.
- Memory can surprise users. Make scope explicit and require approval for user-level writes.

## Immediate Engineering Recommendation

Build in this order:

1. Agent profiles and capabilities.
2. Add-agent picker through the existing member `+` interaction.
3. Agent run and run event persistence.
4. Runtime boundary with deterministic placeholder behavior.
5. Real DeepAgent invocation for mention and direct chat.
6. Guarded internal tools.
7. Approval cards.
8. MCP connections.

This keeps the first version understandable while preserving the path toward a powerful learning agent system.

Near-term next engineering slices:

1. Continue adding real-data workspace review affordances only when accumulated artifacts/skills/memories make the current review surfaces too shallow. Artifact-to-task triage, skill version compare, and memory bulk archive are now implemented; likely next candidates are more selective filters or restore/audit views after real usage shows pressure.
2. Deployment-facing documentation and pull-request CI for the route-level health smoke are now implemented; next CI work should add the deployed environment smoke once deployment secrets and staging URLs are available.
3. A clearer room-settings surface is now implemented: the chat header keeps only summary and common actions, while agent mode and room agent access live in the opt-in workspace panel.

Do not start MCP until the internal tool and approval loop is boring and reliable.

## Next Design Questions

These questions should be answered before expanding the implementation beyond the current V0 slices.

### 1. What is the smallest useful custom-agent builder?

Recommended answer for V0:

- one text field for name
- one text field for purpose
- one behavior textarea
- skill selector with system, workspace, and personal sources
- allowed action selector with approval labels
- memory scope selector
- visibility selector: private or workspace

Do not start with model routing, raw JSON config, MCP transport setup, or deeply nested prompt sections. Those can live in an advanced surface later.

### 2. Which agents should ship as templates?

Start with a small learning-focused set:

- Socratic Coach
- Visualizer
- Course Designer
- Examiner
- Project Mentor
- Researcher
- Artifact Reviewer

Each template should be a profile seed plus explicit capabilities. Templates should not be runnable singleton agents.

### 3. How should agents speak in group chat?

Recommended answer:

- specific mention: one selected agent replies
- generic `@agent`, `@agents`, or `@ai`: coordinator chooses at most one by default
- direct chat with one agent: auto-run that agent
- task assigned to an agent: run in task context
- no mention in group room: stay silent

The product can add room-level light assist later, but that should be an explicit room setting.

### 4. What should be visible during agent work?

Default visibility:

- compact run chip
- latest human-readable status
- inline approval card if blocked
- final message, task update, or artifact card

Opt-in detail:

- tool events
- subagent events
- todos
- debug ids
- raw payload previews for support/developer mode

### 5. When should MCP be introduced?

Only after:

- internal tools are typed, audited, and approval-wrapped
- run/approval recovery works after refresh
- tool calls are visible in run detail
- per-agent capability allowlists are reliable
- data egress approval copy is designed

MCP should be presented as "Connections" in normal UI.

### 6. What should Deep Agents own?

Deep Agents should own:

- planning mechanics
- skill loading
- subagent delegation mechanics
- runtime memory/checkpoint mechanics
- streaming agent execution

Primoria should own:

- workspace identity
- authorization
- tool policy
- MCP connection ownership
- approval records
- product-visible memory
- run/event persistence
- UI state and recoverability

This boundary is more important than any single runtime option. If the runtime changes later, the product model should still hold.

API JSON errors should survive to the workspace client. Agent create/edit, connection registry, skill-library, memory review, approval decision, run cancel, and related workspace mutations must preserve explicit server error messages instead of collapsing them into generic client failures.

## Agent OS Capability Roadmap

Primoria should implement the full agent operating layer, not only a chat-time
assistant. LobeHub is the reference for the surrounding product/runtime shell;
Primoria should keep Deep Agents as the default execution engine while owning a
stable external agent interface.

The invariant:

```text
runAgent(input) -> AgentEvent stream
```

The UI, API routes, DB persistence, approvals, and artifact surfaces should
depend on this stable event protocol, not on a concrete engine. Internally,
`runAgent` may use LangChain DeepAgent first, and later swap to another runtime
without changing the product contract.

Agent OS is not a centralized Decision Engine. The agent/runtime owns planning,
tool choice, delegation, response strategy, and teaching-action selection.
Primoria owns the operating boundary around that intelligence: context assembly,
tool manifests, activation policy, approval, ask-user/resume, event contracts,
memory review, artifact/task persistence, and audit. Product code should avoid a
separate "god decision layer" that tries to pre-decide what the agent should do.

### Required capabilities

| Capability | Product meaning | Primoria status | Target contract |
| --- | --- | --- | --- |
| Agent Signal | Agent activity becomes stable semantic events, not raw logs | `workspaceAgentRunEvents` exists but is run-log shaped | `AgentSignal` contract for runtime start/end, step, tool, memory, action result, artifact, approval |
| Tool Activator | Agents can choose and activate tools for the current turn | Tools are mostly pre-bound by profile | `activate_tools` chooses from a visible capability catalog and records why |
| Agent Builder / Management | Agents can create, edit, invite, and maintain other agents | Profiles/templates exist, but no agent-operated lifecycle tools | `create_agent`, `update_agent`, `invite_agent`, `manage_agent_capabilities` with approvals |
| Group Orchestration | Multi-agent rooms have an explicit supervisor protocol | DeepAgent `task` and subagent capability exist, but no group loop | Supervisor decisions: `speak`, `broadcast`, `delegate`, `execute_task`, `finish` |
| Heterogeneous Agents | External agents such as Claude Code or Codex can participate | Not modeled as workspace members/runs | Adapter interface normalizes external streams into `AgentEvent` |
| Ask User Bridge | An agent can ask the user a question and resume | Approval exists, but only for tool decisions | `ask_user` event + persisted pending interaction + resume command |
| Memory Extraction Pipeline | Conversations become reviewable structured memory | Memory tables/tools exist in early form | GateKeeper + LayerExtractor writes scoped, reviewable memory candidates |
| Context Engine | Context assembly is a tested pipeline | Prompt/context still lives inside runtime code | Providers + processors + token accounting produce model input |
| Tool Manifest + UI Registry | Tool schema, executor, approval, artifact, renderer are one contract | Tools and UI artifacts are split manually | `ToolManifest` with params, returns, side effects, policy, renderer hints |
| Task Tool | Long-running work is first-class and resumable | Workspace tasks exist, but agent task tooling is shallow | create/list/run/edit/comment/status/dependency/schedule task APIs |

### Implementation order

The right sequence is to build the shell before expanding behavior:

1. **Stable event protocol.** Define `AgentEvent`, `AgentSignal`, and `runAgent`
   output types first. Map existing DeepAgent stream events into this protocol.
2. **Tool manifest registry.** Move tool definitions behind manifests before
   adding more tools. A tool should declare its schema, executor, side effects,
   approval policy, and UI rendering hints in one place.
3. **Context engine.** Build `buildAgentContext()` as providers and processors:
   workspace/thread history, visible artifacts, memory, active tasks, profile,
   skills, and token budget.
4. **DeepAgent adapter.** Make LangChain DeepAgent the first engine behind the
   stable runner. The adapter owns runtime-specific stream parsing,
   checkpointing, HITL resume, and subagent event normalization.
5. **Memory as tools.** Add `search_memory` and `save_memory` as normal tools,
   then add the extraction pipeline after review UI and memory permissions are
   reliable.
6. **Tool activator.** Introduce dynamic tool activation only after the registry
   can explain available tools and enforce per-agent permissions.
7. **Agent management tools.** Let agents create and edit profiles only through
   approval-wrapped product tools, never by direct DB mutation.
8. **Group orchestration.** Add a supervisor loop once single-agent runs,
   activation, approvals, and task persistence are stable.
9. **Ask user bridge.** Generalize approval into resumable user interaction.
   The same resume mechanism should support approvals and clarifying questions.
10. **Heterogeneous adapters.** Add external agent adapters last, because they
    depend on the event protocol, ask-user bridge, task model, and security
    policy being stable.

### Boundary rules

- Deep Agents is an engine adapter, not the product interface.
- Agent/runtime decides what to do from the supplied context; Primoria decides
  what actions are allowed, how they are recorded, how they are rendered, and
  how execution resumes after user input.
- `packages/domain/src/agent` should stay an Agent OS/domain-policy layer:
  runner contracts, routing signals, tool/context/memory/task schemas, and
  product authorization primitives. It should not own a monolithic learning
  Decision Engine.
- Agent tools never bypass Primoria authorization, approval, memory visibility,
  or workspace ownership checks.
- Product events are semantic. Raw runtime payloads can be attached for debug
  mode, but UI and persistence should not depend on runtime-specific shapes.
- User-created agents and groups are product objects. The agent may propose
  changes, but risky lifecycle changes require explicit approval.
- External agents must be normalized into the same run, event, approval, task,
  and artifact contracts as native DeepAgent runs.

## Agent OS Migration Status

Current implementation status:

- Shared contracts live under `packages/contracts/src/agent`, with typed events, signals, profiles, context, tools, memory candidates, task operations, ask-user payloads, and orchestration adapters.
- Domain runner APIs live under `packages/domain/src/agent`, with `runAgent`, engine adapter types, signal derivation, context support, tool registry, and the opt-in memory extraction pipeline.
- Web Agent OS facade lives under `apps/web/src/lib/agent-os`. It is the boundary for AI implementation imports, artifact/chat compatibility exports, workspace event mapping, tool activation, context building, memory extraction, ask-user questions, task-tool contracts, and orchestration adapters.
- Workspace runtime still uses DeepAgent by default, but product/API code sees stable `AgentEvent` and `AgentSignal` views in addition to legacy `agentRunEvents`.
- Workspace APIs preserve legacy fields such as `agentRunEvents` and `agentApprovals` while adding `agentEvents` and `agentSignals` so clients can migrate incrementally.
- Tool manifests now describe source, risk, approval, scopes, side effects, execution availability, inspector metadata, and renderer hints. Runtime activation filters profile capabilities per run before DeepAgent receives tools.
- Context assembly flows through `buildWorkspaceAgentContext`, which combines workspace/thread messages, visible messages, open tasks, memories, connections, delegate profiles, processors, and token accounting metadata.
- Memory extraction is default-off. Tests can enable a fake extractor and observe `memory.candidate`; explicit `save_agent_memory` remains an approval-wrapped tool path.
- Ask-user questions use `ask_user.requested` events and resume tokens. They are intentionally separate from tool approval rows and approval decision APIs.
- Task tooling has typed create/list/run/edit/comment/status/dependency/schedule contracts. Current workspace adapters support the existing create/list/run/status and safe edit subset; unsupported operations return typed unsupported results.
- Orchestration contracts cover supervisor actions (`speak`, `broadcast`, `delegate`, `execute_task`, `finish`) and external-agent sessions (`spawn`, `streamEvents`, `askUser`, `cancel`) without importing or spawning Claude Code, Codex, or other CLIs by default.

Implementation-internal exceptions:

- `apps/web/src/lib/agent-os/ai.ts`, `artifacts.ts`, `chat.ts`, and `model.ts` are allowed to import `apps/web/src/lib/ai/*` because they are compatibility facades around the legacy AI implementation.
- Files inside `apps/web/src/lib/ai/**` may import other `lib/ai` implementation modules.
- App components, hooks, API routes, workspace store code, and tests should consume contracts or `agent-os` exports for migrated artifact/chat/widget/attachment/agent surfaces.
