# Primoria Product Architecture

The system-level design for Primoria as an adaptive learning platform. The
current deployment shape is a **modular monolith plus**: the Next.js Web app
owns product data and policy, the self-hosted Agent runtime owns durable model
runs, and PostgreSQL is the shared infrastructure boundary.

Status note, July 2026: the active product implementation is focused on the
Ring 1 personal learning loop. The former collaborative workspace-agent runtime
was removed from the codebase to reduce scope. Workspace/classroom and
collective-intelligence sections below describe future product direction, not
current runtime capability.

README and AGENTS.md cover current commands, package boundaries, and runtime
constraints. This document covers **what the system does** — the engines, data
flows, agent ecosystem, and evolution mechanisms that make learning adaptive.

---

## 1. Core identity

Primoria is a long-horizon adaptive learning system. The near-term product is a
personal learning loop where goals, courses, memory, and feedback improve the
next teaching step. Classroom, marketplace, and collective-intelligence concepts
remain future expansion layers.

The system operates as three nested rings:

```
┌──────────────────────────────────────────────────────────────┐
│  Ring 3: Collective Intelligence (ecosystem evolution)         │
│  Agent Marketplace │ Shared Courses │ Shared Apps │ System    │
│  Learning — aggregate feedback improves the whole ecosystem   │
└────────────────────────────────┬─────────────────────────────┘
                                 │ good agents/courses/apps rise
                                 │ poor ones sink
┌────────────────────────────────▼─────────────────────────────┐
│  Ring 2: Social / Workspace (group learning)                  │
│  Group chat │ Agent bidding │ Teacher assignment │ Collab │    │
│  User-created agents — multi-person interaction feedback      │
└────────────────────────────────┬─────────────────────────────┘
                                 │ observation flows in
                                 │ decision flows out
┌────────────────────────────────▼─────────────────────────────┐
│  Ring 1: Personal Loop (individual learning)                  │
│  Course → Observation → Memory → Agent Action → Course/Agent/App │
│  — the core engine, foundation of everything                  │
└──────────────────────────────────────────────────────────────┘
```

Ring 1 is the heart and the current implementation focus. Ring 2 is an
amplifier. Ring 3 is a flywheel.

---

## 2. The four engines and one pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                      Event Pipeline                            │
│  (single pipe: all observations flow in, all projections out) │
└────┬──────────────┬──────────────┬──────────────┬────────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
┌─────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐
│ Learning │  │  Agent    │  │ Content  │  │  Collective   │
│ Engine   │  │  Routing  │  │ Engine   │  │  Intelligence │
│          │  │  Engine   │  │          │  │  Engine       │
│ personal │  │ who       │  │ generate │  │ system        │
│ loop     │  │ answers   │  │ what     │  │ evolution     │
│ memory   │  │ route     │  │ block/app│  │ aggregate     │
└─────────┘  └───────────┘  └──────────┘  └───────────────┘
     │              │              │              │
     └──────────────┴──────────────┴──────────────┘
                          │
                          ▼
                   Agent Pool / Actuators
              (built-in + user-created agents)
```

One pipeline, four engines, one agent pool.

---

## 3. Course as adaptive teaching surface

Courses are not static documents. They grow on demand. Each block type is the
materialization of a teaching method — a deliberate pedagogical action an agent
can choose from the current course, learner, goal, and session context.

### Block types and their adaptive triggers

| Block Type | Teaching Intent | When to use (trigger) |
| --- | --- | --- |
| `explanation` | Direct exposition | Concept is new to the learner |
| `analogy` | Transfer via familiar domain | Abstract concept resists direct explanation |
| `visual` | Interactive visualization | Spatial/intuitive understanding needed |
| `worked_example` | Step-by-step solution | Can understand but cannot yet do |
| `drill` | Retrieval practice / quiz | Needs memory consolidation |
| `socratic` | Guided questioning | Can reason but is uncertain |
| `transfer` | Cross-domain application | Grasps concept but cannot generalize |
| `project` | Applied task | Needs synthesis across concepts |
| `review` | Spaced repetition | Likely to forget (decay signal) |
| `reflection` | Metacognitive recap | End of a learning segment |

Key design: block type is not a display format. It is an **agent action
contract**. An agent may decide "use drill now"; Primoria validates the action,
persists the event, and generates/inserts the drill block. This is what
"adaptive" means — blocks grow on demand, not pre-authored in a fixed arc.

---

## 4. Four-layer memory model

This is the target memory model. Its July 2026 implementation state is:

| Layer | Current state |
| --- | --- |
| User Memory | Implemented through onboarding, learner profiles/facts, learning events, concept mastery, and extractor/mastery workers |
| Course Memory | Partially implemented through course/lesson state, KG positioning, generation decisions, and progress; a separate semantic memory object is not exposed |
| Agent Memory | Future; the current Tutor has durable run/checkpoint state, not a marketplace agent memory lifecycle |
| System Memory | Future; no cross-user pedagogy model is used for routing |

### Layer overview

```
User Memory       ← about the learner (one per user)
Course Memory     ← about what a course should teach (one per course)
Agent Memory      ← about an agent's experience (one per agent instance)
System Memory     ← about what methods work universally (one global)
```

They are not isolated. Agent context assembly can read multiple layers
simultaneously:

> "This user (User Memory) is learning recursion (Course Memory). Visual Agent
> (Agent Memory) was accepted last time in a similar context. System data
> (System Memory) shows beginner + recursion + visualization = 78% success."
> → Give the active agent enough context to call the Visual Agent or generate an
> animation block.

### User Memory (per learner)

- Preferences: visual > text, likes analogies, fast/slow pace
- Weak concepts: which concepts have low mastery
- History: what was learned, time spent, where stuck
- Source: extracted from observations, confirmed through review

### Course Memory (per course)

- Knowledge structure: concept graph + prerequisite edges
- Per-block teaching intent and target concept
- Completion criteria: what evidence counts as "learned"
- Source: initialized at generation, updated dynamically during learning

### Agent Memory (per agent instance)

- Knowledge Base: user-injected notes, expertise (static, set at creation)
- Interaction Memory: "user A likes my analogies", "formal proofs rejected 3×"
  (dynamic, auto-extracted from feedback events)
- Self-Model: "I'm good at visual explanations, weak at pure proofs"
  (aggregated from confidence data)
- Style / Persona: patience level, analogy-first vs example-first
  (set at creation + fine-tuned by feedback)

Agent memory read/write permissions:

| Operation | Who can | Why |
| --- | --- | --- |
| Read own memory | The agent itself | Informs response decisions |
| Write interaction memory | System (auto-extracted from events) | Agent cannot self-inflate |
| Read agent's memory | Creator (user) | Transparency |
| Correct memory | Creator | "You misunderstood, my agent isn't like that" |
| Delete / reset | Creator | Full ownership |

### System Memory (global, P2/P3)

- Teaching method effectiveness by learner-type × concept-type
- Source: cross-user aggregation of feedback events
- Used for: cold-start recommendations, course template evolution

---

## 5. Observation layer and multi-path consumption

A single user interaction produces one event that is consumed by multiple paths:

```
Future example: 小明 in group chat asks "Why does recursion need a base case?"
         Visual Agent answered (animation). Math Agent answered (formal).
         小明 adopted Visual Agent's answer, ignored Math Agent.

Event produced → consumed 5 ways:

├─► User Memory: 小明 is a visual learner (preference accumulation)
├─► Course Memory: recursion block needs visualization (course improvement)
├─► Agent Memory: Visual Agent +1 confidence, Math Agent -1 in "recursion"
├─► Marketplace: Visual Agent ranking rises (collective signal)
└─► System Memory: for "recursion + beginner", visual > formal explanation
                   (benefits all future users)
```

One feedback event, five layers of improvement. This is how feedback flows into
the total system.

---

## 6. Multi-agent ecosystem (future product direction)

The active Tutor may delegate bounded work to internal subagents and tools, but
Primoria does not currently expose a user-owned agent pool, bidding protocol, or
agent marketplace. The rest of this section defines the future product model.

### Agent specialization

Each agent has three defining properties:

- **Capability**: what it can do (declared skills)
- **Confidence Model**: when it should act (boundary awareness, learned from feedback)
- **Track Record**: how well it has performed historically (from event aggregation)

Example agent pool:

```
Math Agent       ← reasoning, proofs, formulas
Code Agent       ← programming, debugging, algorithms
Visual Agent     ← visualization, diagrams, interactive demos
Socratic Agent   ← guided questioning, never gives direct answers
Review Agent     ← spaced repetition, memory strengthening
Language Agent   ← language learning, translation, writing
```

### Future bidding protocol in group chat

This is future classroom/collaboration scope, not current runtime behavior.
When a user asks a question in a group workspace:

```
User asks a question
        │
        ▼
┌─ Math Agent:     relevance score 0.9 → raises hand
├─ Code Agent:     relevance score 0.3 → stays silent
├─ Visual Agent:   relevance score 0.7 → raises hand
└─ Socratic Agent: relevance score 0.6 → raises hand

Orchestrator sees: Math(0.9) + Visual(0.7) + Socratic(0.6) raised hands
Decision: Math answers primary, Visual supplements with visualization
```

Three trigger modes:
- **Self-nomination (bidding)**: agent judges "I should speak" — for group chat
- **Delegation**: main agent or user explicitly requests "let Math Agent handle this"
- **Composition**: main agent calls multiple agents to synthesize one answer

### Feedback signals from group interaction

| User behavior | Signal meaning | Updates what |
| --- | --- | --- |
| Adopts/likes an agent's answer | Agent effective in this context | Agent confidence ↑ |
| Ignores an agent's answer | Should not have spoken here | Agent confidence ↓ |
| Follows up with same agent | Right direction, not deep enough | Agent: remember to elaborate |
| Explicitly rejects "not like that" | Misunderstood the question type | Confidence model corrected |
| Asked A, but B solved it | B was the right agent | A's routing was overestimated |

### User-created agents

Users are not just consumers — they are agent creators:

```
User action:
  "I'm great at calculus, I want to create an Agent to help others learn it"
  → Define capability (what I know)
  → Set persona (how I teach)
  → Inject knowledge base (my study notes)
  → Publish to marketplace

System behavior:
  → New agent enters marketplace (initial confidence = 0)
  → Someone asks a calculus question in group chat
  → Agent participates in bidding
  → If adopted → confidence rises → ranking rises → more visibility
  → If always ignored → confidence drops → naturally sinks
```

### Agent fork and inheritance

- Fork: "I like this agent's knowledge base but want a different persona"
  → fork it, keep knowledge, reset interaction memory
- Inheritance: agent can inherit another's knowledge base as a starting point
- Like GitHub fork for repos — the agent ecosystem has version/lineage

---

## 7. Classroom and collaboration (future)

Future classroom/collaboration features should extend the personal adaptive loop
to group dimensions:

- Teacher sees aggregated User Memory view (class-level weak concepts)
- System suggests assignments based on class weakness distribution
- Different students get different difficulty/type assignments (personalized)
- Student collaboration → produces observations → feeds back into individual memory

This layer is built on top of Ring 1. If personal memory + observation + agent
action feedback is not working, classroom features are hollow. Therefore
classroom/collaboration remains P1/P2 after the personal loop is dependable.

---

## 8. Application generation (evolved sedimentation)

Current state: the Tutor can open one of 19 reviewed declarative interactive
components or generate a sandboxed HTML widget as fallback. Catalog components
are reusable code assets, but generated sandbox widgets are not automatically
saved as user applications or published to a capability library.

Future: the agent observes a learner struggling on a concept → **proactively
generates a specialized practice app** → saves it with an explicit review and
persistence contract → recommends it where policy allows.

Applications are not one-off byproducts. They are **outputs of the adaptive
loop** — an agent can choose "generate a standalone app for this user's
weakness" when the memory/context signals support it.

CopilotKit generative UI is the execution layer here. The agent proposes
"generate an interactive recursion visualization exercise for this user";
Primoria applies policy, approval, artifact, and persistence contracts around
the generated app.

---

## 9. Collective intelligence mechanisms

The marketplace is not a static app store. It is a natural selection system:

| Mechanism | Analogy | Purpose |
| --- | --- | --- |
| Feedback-driven ranking | Natural selection | Good agents rise, poor ones sink |
| User-created agents | Mutation / innovation | Ecosystem diversity |
| Agent collaboration/composition | Symbiosis | Solve what no single agent can |
| System Memory cross-user aggregation | Collective wisdom | Platform gets smarter |
| Context-aware routing | Ecological niche | Each agent finds its best-fit zone |

---

## 10. System-level learning (platform improves itself)

The platform is not static infrastructure. It learns from aggregate feedback:

| What the platform learns | How | Benefit |
| --- | --- | --- |
| Routing strategy | Aggregate which agent wins in which context | Better matchmaking over time |
| Teaching method effectiveness | "learner-type × concept × method → success rate" | Evidence base for pedagogy |
| Course template evolution | Which block combinations/orderings → good outcomes | New courses use winning patterns |
| Agent quality standards | What capability/persona/knowledge → high adoption rate | Advise agent creators |

---

## 11. Priority and dependency chain

```
Must have first ───────────────────────────────► Before this can work

Event Log + User Memory                         → Personal adaptive loop
Personal adaptive loop                          → Agent specialization (no loop = no signal)
Agent specialization + group chat + feedback    → Agent confidence / bidding
Agent confidence model                          → High-quality self-nomination
All of the above                                → Future workspace classroom (teacher view)
Cross-user aggregation                          → Community (recommend agent/app)
```

### Implementation priority

```
Current baseline:
  Course/lesson generation, structured lesson blocks, quizzes, learning events,
  concept mastery, learner facts, KG positioning, durable Tutor runs, 19 reviewed
  interactive components, sandbox fallback, and read-only course sharing.

P0 (close the personal loop):
  Convert mastery/fact signals into dependable remediation and resume decisions
  Improve content accuracy, observability, failure recovery, and evaluation
  Use visualization.render analytics to deepen high-value components

P1 (loop enhancement):
  Spaced repetition and cross-session review scheduling
  Explicit user review/correction of inferred facts
  Persisted, policy-reviewed generated practice applications

P2/P3 (future ecosystem):
  Agent memory/confidence, group bidding, classroom views, System Memory,
  community discovery, user-created agents, and marketplace evolution
```

---

## 12. Relationship to code architecture

This product architecture maps onto the current codebase as follows:

- `packages/contracts` defines shared artifact, chat, and stream contracts used
  by the web app and agent runtime.
- `packages/memory` contains optional memory-provider integration helpers.
- `data/visualization-components` is the canonical declarative component
  catalog and JSON Schema. The Agent consumes its compact projection from
  `packages/contracts`; the Web app validates and renders full configurations.
- `apps/web/src/lib/db` hosts app-owned Postgres schema and server-side data
  access: auth/session tables, knowledge graph tables, course/lesson state,
  learning events, mastery, learner profiles/facts, background jobs, media
  assets, and rate-limit state.
- `apps/agent` executes the active `primoria_tutor` LangGraph/deepagents graph.
  Its self-hosted Node/AG-UI runtime owns only the isolated `agent_runtime`
  schema for durable runs, streamed events, leases, cancellation, retries, and
  LangGraph checkpoints. It does not import from `apps/web`; bounded
  course-card reads are handled through explicit agent-side DB code, while all
  product writes remain Web-owned.
- The main visualization route is catalog-first:
  `open_interactive_component` → frontend tool signal → authenticated Web API →
  `InteractiveComponentCard`. Specialized structured artifacts and
  `plan_visualization` → `widgetRenderer` provide progressively more flexible
  fallbacks.

Current implementation work should stay grounded in the active personal
learning loop unless a new architecture decision reopens classroom or
marketplace scope.

---

## 13. Eight search spaces and their compression

The fundamental problem: for any learner at any moment, give the agent enough
compressed context to choose a useful next teaching action. The raw space is
combinatorial:

```
all possible actions =
  (which concept) × (which method) × (who teaches) × (when) × (what depth)
  × (what form) × (which goal scope) × (what feedback means)
```

We decompose this into 8 independent spaces, each with its own compression
operator. Agent context and policy should expose these compressed spaces to the
runtime, so the agent acts over a bounded state instead of the raw product.

| # | Space | Question | Compression Operator | Compressed form |
| --- | --- | --- | --- | --- |
| 1 | Knowledge Space | What exists to learn | Concept Graph (prerequisite DAG) | Finite graph; can judge readiness |
| 2 | Goal Space | What scope am I in | Folder/project (scope container) | Trim infinite knowledge to a finite subgraph |
| 3 | Learner State Space | Where is this person now | Mastery Model + Memory layers | Low-dim mastery + preference vector |
| 4 | Method Space | How to teach this | Block Type Taxonomy (10 types) | 10 discrete scorable strategy slots |
| 5 | Agent Space | Who teaches | Confidence Model (per-agent per-context) | One 0–1 score per agent given context |
| 6 | Timing Space | When to intervene | Decay model + trigger rules | Discrete trigger points |
| 7 | Content Space | What to actually generate | Capability Library + schema constraints | Reuse or constrained generation |
| 8 | Feedback Space | What does user behavior mean | Event taxonomy + multi-path rules | Behavior → finite signal types → memory update |

### Space dependency chain

```
Knowledge Space (concept graph)
     │ "what is ready"
     ▼
Goal Space (folder scope)
     │ "what subset matters now"
     ▼
Learner State Space (mastery vector)
     │ "where is weak"
     ▼
Method Space (10 strategies)  ←── Timing Space ("act now?")
     │ "which strategy"
     ▼
Agent Space (who executes)
     │ "who is best"
     ▼
Content Space (what to render)
     │ "show what"
     │
     │────── user interaction ──────►  Feedback Space
     │                                      │
     └──────────────────────────────────────┘  (loop: update state + confidence)
```

### Goal Space in detail (future explicit product object)

Today, onboarding goals plus courses provide most of this scope. A first-class
hierarchical Goal/Folder entity, Goal Memory, sharing rules, and cross-course
aggregation are not yet implemented.

Goal ≈ a folder/project. It is the lightest possible scope container:

```
Goal: "Become a full-stack engineer"
├── Sub-goal: "Master frontend basics"
│   ├── Course: HTML/CSS
│   ├── Course: JavaScript core
│   └── Course: React
├── Sub-goal: "Master backend"
│   ├── Course: Node.js
│   └── Course: Database design
└── Sub-goal: "Ship a project"
    └── Project: Full-stack todo app
```

Design rules for Goal:
- Goal provides **scope**, not path. Path is chosen by the agent from bounded
  context and user feedback.
- No forced ordering inside a Goal — ordering is adaptive.
- Progress = aggregated mastery of courses within.
- Goals can be shared (teacher creates → students enroll).
- Goal Memory persists across semesters (teaching experience reuse).
- A Course can be referenced by multiple Goals.

What Goal compresses:
- Raw: all possible learning paths = all subgraphs of concept graph × orderings
- After: a bounded subgraph + time rhythm + clear "what's next within scope"

### Five-layer memory target (updated with future Goal Memory)

```
System Memory     global: what methods work universally (P2/P3)
  │
User Memory       person-level: pace, habits, cross-domain traits
  │
  └── Goal Memory    domain-level: "in React I prefer analogies, in math I prefer formal"
        │
        └── Course Memory  course-level: concept structure + progress within this course
              │
              └── Agent Memory  agent-level: when is this agent effective
```

Each layer answers a different question:
- System: "what works in the world"
- User: "who is this person"
- Goal: "how is this person in this domain"
- Course: "what should this course teach next"
- Agent: "who should teach it"

Read rule: Agent context loads User + active Goal + current Course memory.
Inactive Goal memory is not loaded — scope isolation prevents signal pollution.

---

## 14. What is NOT in scope

- Primoria is not *only* a course builder, chat UI, quiz engine, or agent
  marketplace. Those are useful surfaces but subordinate to the adaptive loop.
- This design does not prescribe UI layout or visual design.
- This design does not specify exact LLM prompts or model choices.
- System Memory and collective intelligence (Ring 3) are explicitly deferred to
  P2/P3 — they require data volume that only exists after Ring 1 is live.
