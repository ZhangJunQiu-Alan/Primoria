# 1. Executive Summary

**Assessment: the architecture is appropriate, but this revision should not yet receive approval for an unrestricted production launch.** The main risks are concrete authorization, concurrent-write, persistence, and recovery defects. They can be addressed within the current architecture; a rewrite or migration to distributed infrastructure would make the immediate work harder.

Primoria is a personalized learning application with an AI Tutor, knowledge-graph positioning, generated courses, interactive teaching components, quizzes, mastery tracking, learner facts, progression rewards, and course sharing. It already has substantial production engineering: server-side sessions, shared contracts, durable PostgreSQL job queues, lease fencing, immutable share versions, migration ownership, regression layers, container hardening, and backup/restore tooling.

The most consequential findings are: cross-owner chat updates; stale course saves that can overwrite progress or delete newly inserted lessons; executable lesson code running with the application's origin privileges; incomplete production environment forwarding; Agent runs stranded after a rapid restart; and unbounded admission to expensive AI work. Generated courses also reach a static-only graph lookup during post-quiz progression, and streamed chat history can persist only an early fragment.

This report contains **17 findings: 10 P1 and 7 P2**. One P1 is conditional on enabling internal analytics. No P0 or exposed production secret was established. Severity reflects demonstrated code paths and realistic conditions, not a claim that every scenario was reproduced against a running deployment.

**Scope and evidence.** Audit date: **2026-09-26**, Asia/Singapore. Revision: `127fd070b54dc20b03192660b02cbea1852b1825`. The working tree was clean at inspection. Inventory: 1,009 tracked files, 682 TypeScript/TSX/ESM/SQL files under application and package directories, 46 API route files, 111 native Web test specification files, and 47 legacy Web unit scripts. Critical paths and representative modules were read; this is not a line-by-line proof of every file.

**Execution limits.** Dependencies are absent in the root, Web, and Agent workspaces. The available runtime is Node 24.19.0 with pnpm 11.19.0; the repository pins pnpm 10.28.1. No packages were installed. No database, browser, provider, deployment, or destructive tests were run. Section 14 records the limited checks that did run and the gates that remain unverified. Historical passing results in repository documents are not presented as passing results for this audit.

**Audit-only outcome.** This report is the only repository file created. Application code, configuration, dependencies, schemas, migrations, tests, and deployment state were not changed. No commit or push was performed.

# 2. Current System Architecture

```text
Browser: Next.js / React application
  |  HttpOnly session cookie; JSON APIs; CopilotKit streaming UI
  v
Caddy: public HTTPS endpoint
  |
  v
Next.js Web server
  |-- authentication, ownership checks, onboarding and learner settings
  |-- knowledge-graph positioning and course orchestration
  |-- catalog component configuration and shared-course publication/import
  |-- App/Auth/Course/KG reads and writes through PostgreSQL
  |
  |  /api/copilotkit -> PrimoriaHttpAgent
  |  internal authenticated AG-UI request
  v
Node Agent -> LangGraph / deepagents -> configured model provider
  |-- tutor tools and shared artifact contracts
  |-- durable runs, events, leases, cancellation and checkpoints
  v
PostgreSQL + pgvector
  |-- public application/auth/course/KG schemas and data
  |-- isolated agent_runtime schema
  |-- durable lesson, learning-progress, extractor and profile-intake jobs
  ^
  |  claim / lease / execute / publish
Web-owned workers: lesson generation, learning progress, extractor

External services:
  chat model; KG embedding provider; optional image generation / Mem0;
  Tencent SES password-reset email; optional Turnstile;
  browser visualization/Pyodide CDNs; COS backup storage
```

| Area | Actual implementation |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript, application CSS, CopilotKit, registered React interactive components, structured renderers, and sandboxed HTML widgets. |
| Backend | Next route handlers and server-side libraries. Plain ESM Node Agent is a separate internal process. Three worker processes handle durable background work. |
| Database | PostgreSQL 16 with pgvector; Drizzle and the `postgres` driver for application data; separate KG SQL ownership and Agent runtime migrations/checkpoints. |
| Authentication | Email/password identities, salted password hashes, opaque server-side sessions, hashed session tokens, expiry, logout, and password reset. OAuth callback scaffolding is not an implemented OAuth product flow. |
| Contracts | Shared artifact schemas, widget dependency allowlist, and compact interactive catalog in `packages/contracts`. Agent code does not depend on Web implementation modules. |
| AI | Server environment credentials for OpenAI-compatible or Anthropic-compatible providers; no BYOK path. Utility/content tiers are distinct. KG embeddings have separate configuration. |
| Deployment | Single-host Compose: PostgreSQL, migration/grant jobs, Web, Agent, three workers, and Caddy. Only Caddy is public; PostgreSQL has a loopback administration binding. |
| Build/test | pnpm workspace and lockfile; TypeScript, ESLint, Vitest plus a legacy test bridge, Agent ESM tests, DB integration suites, Playwright journeys, bundle budgets, and Compose smoke tooling. |

The principal learner flow is signup/login, confirmed curriculum and goal intake, KG positioning, exact-scope course reuse or creation, concept-frontier outline generation, asynchronous lesson materialization, quiz evidence, rules-based mastery, and a next-step/remediation decision. Facts extraction runs separately. XP is an append-only reward ledger, not a mastery score.

The Tutor path is browser CopilotKit → Web API → internal Agent. Catalog interactive tools signal the browser, which calls the authenticated Web configuration endpoint; the Agent does not own component configuration. Specialized artifacts and sandbox widgets cover other visualization needs.

The runtime catalog contains 31 graphs. Runtime registration and source approval differ: ten China/Singapore graphs remain `needs_review`. Current code includes an optional `PRIMORIA_REQUIRE_APPROVED_KG` routing filter, defaulting to permissive behavior; registration is not proof of approval. Source, curriculum mapping, pedagogy approval, and runtime import must remain distinct.

Sharing now uses a link parent and immutable `course_share_versions`. Public access and import operate on sanitized stored snapshots. This is more precise than older descriptions that mention only `course_share_links`.

# 3. Production Readiness

## Must fix before production

- **F01–F03:** close cross-owner chat writes, protect course updates against stale aggregate replacement, and isolate untrusted executable lesson code from authenticated application APIs.
- **F04:** make the production environment contract match the selected authentication/email/model features. The documented Compose path currently omits required values.
- **F05–F08:** make rapid-restart recovery continuous, enforce admission limits for expensive work, persist complete chat history, and support generated graphs through post-lesson progression.
- **F17:** complete the documented release evidence and external authorization gates. A passing deterministic fixture check does not close a blocked real-model or embedding-snapshot gate.
- **F15, if analytics is enabled:** require a trusted operator identity. Keeping analytics disabled is an appropriate launch mitigation until that condition is met.

## Strongly recommended before production

- **F09:** move production off the end-of-life Node 20 line and align the tested runtime.
- **F10–F12:** enforce atomic reset-token consumption, separate worker liveness from job duration, and preserve supported image attachments through the Tutor protocol.
- **F16:** stop sending raw learner goals to general operational logs by default.
- Obtain release-candidate evidence for real HTTPS signup/login/reset, selected provider connectivity, restore success, queue recovery, and failure alerts. Their absence is an evidence gap, not proof that an external deployment is currently misconfigured.

## Safe to address after launch

- **F13:** remediation failure UI, provided the launch scope accepts a refresh workaround and the issue is tracked promptly. Fix before launch if this journey is a launch acceptance criterion.
- **F14:** summary overfetch and pagination, with conservative initial course/history limits and monitoring.
- Narrow component extraction, dependency footprint work, end-to-end trace enrichment, and measured performance tuning. These should follow behavioral fixes rather than become prerequisites for a rewrite.

The recommendations describe future remediation. No feature was disabled, gate waived, or product scope changed during this audit.

# 4. Top Engineering Risks

| ID | Severity | Risk | Principal impact |
|---|---|---|---|
| F01 | P1 | Chat upserts authorize insertion but not conflict updates | Another user's chat data can be overwritten when its identifier is known. |
| F02 | P1 | Whole-course replacement after an unlocked read | Progress/content can revert; concurrently added lessons can be deleted. |
| F03 | P1 | Runnable lesson code shares the application origin | Malicious runnable content can act with the learner's authenticated browser privileges. |
| F04 | P1 | Production environment values are not forwarded | Password reset fails, IP throttling is absent, selected providers can fail. |
| F05 | P1 | Agent stale-run recovery executes only at startup | A rapid restart can leave a run permanently marked running. |
| F06 | P1 | Expensive AI work lacks general admission budgets | One account can consume queue capacity, storage, and provider spend. |
| F07 | P1 | History records an assistant message only once | Reload can restore a fragment or lose a message after a transient failure. |
| F08 | P1 | Progression resolves only static topic graphs | Generated courses fail after quiz completion. |
| F15 | P1, conditional | Internal analytics trusts an unverified email string | A first registrant can claim an unused allowlisted operator address. |
| F17 | P1 | Required release gates remain explicitly incomplete | Critical model/routing behavior and deployment readiness lack required signoff evidence. |
| F09 | P2 | Production Node 20 is end-of-life | Unsupported runtime and CI/production drift. |
| F10 | P2 | Reset token validation and consumption are not atomic | One reset token can succeed concurrently more than once. |
| F11 | P2 | Busy workers stop refreshing liveness | Healthy long jobs can make readiness fail. |
| F12 | P2 | Multimodal input is flattened to text | Tutor answers without receiving the learner's image. |
| F13 | P2 | Remediation dialog recognizes success only | Terminal generation failures leave an uncloseable waiting state. |
| F14 | P2 | Summary and history reads are unbounded | Course JSON and old chat content produce avoidable latency/memory use. |
| F16 | P2 | Raw learning goals enter console logs | Personal learner disclosures spread into operational log storage. |

The first three deserve the earliest review because they affect trust boundaries and durable data. Findings below state their exact conditions and limitations.

# 5. Architecture Review

The current modular monolith plus a dedicated Agent and database-backed workers is a sound fit. Web ownership of application writes, explicit cross-runtime contracts, and worker separation are useful boundaries. There is no demonstrated requirement for microservices, Kafka, Kubernetes, Redis, or CQRS.

The unsafe boundaries are narrower: a repository upsert omits authorization on its update branch; a generic aggregate persistence API is used for unrelated mutations; history persistence is tied to a transient UI effect; and graph resolution differs between lesson generation and progression. These are repairable seams within the existing design.

The Agent's database ownership is primarily enforced by code and schema organization. The production runtime role is shared across services and receives broad runtime DML grants. Separate least-privilege service roles would reduce blast radius later, but the immediate access-control defects should be corrected first. Removing runtime DDL privileges was a useful existing improvement.

## F08 — Generated graphs cannot complete the normal learning-progress pipeline

**Severity:** P1

**Category:** Bug / Architecture / Reliability

**Location:** [learning-progress-processor.ts](D:/Github/Primoria/apps/web/src/lib/courses/learning-progress-processor.ts:64), [topic-graph.ts](D:/Github/Primoria/apps/web/src/lib/knowledge-graph/topic-graph.ts:126), and [lesson-generation-context.ts](D:/Github/Primoria/apps/web/src/lib/courses/lesson-generation-context.ts:180).

**Evidence:** `processLearningProgressJob` calls synchronous `getTopic(graphId, topicId)` before mastery processing. That function calls `getTopicGraph`, which reads only the compiled `TOPIC_GRAPHS` registry and throws for an unknown graph. Generated `gen_*` graphs are persisted separately. Lesson generation explicitly falls back to `getGeneratedGraphById`; progression does not. The decider also uses static graph helpers. This is a source-confirmed mismatch; no database-backed generated-course journey was executed in this audit.

**Why it matters:** Generated courses are an intentional supported outcome of healthy KG coverage misses. Their materialization and their post-quiz progression currently resolve graph identity differently.

**Realistic failure scenario:** A learner creates a course outside the source catalog, reads its generated lesson, and submits the quiz. The progress worker throws on the generated graph ID before computing mastery and next-step/course-completion decisions. Quiz submission itself can already have succeeded.

**Recommended solution:** Resolve a persisted or static graph at the orchestration boundary using one shared graph-resolution contract, and pass resolved graph data into deterministic progression logic. Cover generated courses from quiz evidence through remediation/next-step and completion; preserve KG infrastructure-failure distinctions.

**Estimated effort:** Medium

**When to fix:** Before production

# 6. Code Quality Review

The codebase generally has meaningful domain names, typed schemas, explicit owner parameters, and explanations of non-obvious race/retry decisions. Shared runtime Zod schemas plus declaration drift tests are a pragmatic solution for the ESM/TypeScript split. Generated data and dictionaries account for some large files and should not be confused with oversized business logic.

The more difficult areas to modify safely are the course store and generation pipeline, Tutor UI/history adapter, large lesson/block renderers, and worker lifecycle code. Their risk comes from interacting responsibilities and failure states, not line count alone. The course detail component, for example, contains navigation, recommendation resolution, polling, and modal behavior; F13 shows an actual missing terminal state there.

Three patterns merit focused remediation:

- Broad read-modify-save helpers obscure the mutation being authorized and protected (F02).
- Loose `any` protocol handling and text conversion hide loss of structured input (F12).
- Best-effort catch blocks are appropriate for nonessential enrichment, but inappropriate as the only durability behavior for chat history (F07).

No circular-dependency or unused-package elimination was proven by a complete dependency graph. No cleanup recommendation here assumes that a package or module is dead merely because one search did not find it. Extract small domain boundaries when fixing these behaviors; defer sweeping file splits and stylistic rewrites.

# 7. Frontend Review

The application has deliberate loading/empty states, code-edit dirty-state protection, reusable focus handling, server-authoritative mutations, and route-specific UI. Those are good foundations. Browser responsiveness, screen-reader behavior, and visual layouts were not exercised in this audit; source inspection does not establish WCAG conformance or Core Web Vitals.

The main frontend risks concern persistence and asynchronous state transitions rather than a need for a different state-management library.

## F07 — Chat history can persist only the first streamed fragment and silently miss writes

**Severity:** P1

**Category:** Bug / Reliability

**Location:** [copilot-chat-surface.tsx](D:/Github/Primoria/apps/web/src/components/tutor/copilot-chat-surface.tsx:463) and [copilot-thread-history.ts](D:/Github/Primoria/apps/web/src/lib/copilot-thread-history.ts:173).

**Evidence:** `CopilotThreadHistoryRecorder` observes `OnMessagesChanged`, takes the first nonempty content for each message ID, adds the ID to `recordedMessagesRef`, and starts an unawaited persistence request. Later content with that ID is skipped. The persistence helpers ignore HTTP success/failure status and swallow network errors. Restore uses the chat-message repository; durable Agent events are not a replacement for this product-history path. The exact streaming timing needs a browser regression, but the recorder has no final-content update or acknowledgement path.

**Why it matters:** A stream changing content under a stable message ID is normal. A one-time snapshot does not provide message durability, and a failed request is treated as permanently recorded by the mounted component.

**Realistic failure scenario:** An answer first emits a short phrase and later finishes several paragraphs. The phrase is saved; the remainder is skipped. Refresh restores the phrase. Alternatively, a 500 response or connection loss leaves no message and no visible retry state.

**Recommended solution:** Persist finalized messages from a durable source, or upsert evolving content with an explicit completion/acknowledgement policy and bounded retries. Keep message identifiers idempotent. Test delayed multi-chunk output, reload, failed saves, and resumed history.

**Estimated effort:** Medium

**When to fix:** Before production

## F12 — Supported image attachments are lost before reaching the model

**Severity:** P2

**Category:** Bug / Reliability

**Location:** [copilot-attachments.ts](D:/Github/Primoria/apps/web/src/lib/ai/copilot-attachments.ts:112), [Copilot API](D:/Github/Primoria/apps/web/src/app/api/copilotkit/route.ts:88), and [runner.mjs](D:/Github/Primoria/apps/agent/src/runtime/runner.mjs:10).

**Evidence:** The attachment normalizer produces `image_url` content parts and checks vision capability. Web context injection can flatten structured content; independently, Agent `contentToText` always retains only strings or `.text`. `toLangChainMessages` creates a text-only `HumanMessage`. A read-only probe of the actual converter, with message-class imports stubbed, converted text plus a synthetic image into text plus a newline; the image was absent.

**Why it matters:** The UI can accept an image for a vision-capable model while the transport adapter removes it. This creates misleading answers rather than a clear unsupported-input error.

**Realistic failure scenario:** A learner attaches a geometry diagram and asks for an explanation. The model sees the question but never the diagram.

**Recommended solution:** Preserve typed multimodal parts through context injection, AG-UI validation, and model-message conversion. Define history behavior for attachments explicitly. Assert the actual provider request contains the image using a scripted vision-provider integration test.

**Estimated effort:** Medium

**When to fix:** Before production for advertised image support

## F13 — Failed remediation generation leaves a waiting dialog without an exit

**Severity:** P2

**Category:** Bug / Reliability

**Location:** [course-detail-client.tsx](D:/Github/Primoria/apps/web/src/components/course/course-detail-client.tsx:150), `LearningProgressPopup`.

**Evidence:** While `generatingLessonId` is set, polling only clears it when the lesson becomes `generated`. Non-success HTTP responses are ignored. Terminal job failure is not inspected. The generating dialog contains no close/retry action, and its Escape handler is explicitly absent. Interval cleanup exists; terminal-state handling does not.

**Why it matters:** A durable background failure becomes an indefinite foreground wait. Accessibility is also affected because a modal has no actionable exit in this state.

**Realistic failure scenario:** The learner accepts remediation, the provider fails permanently, and the job exhausts its attempts. The dialog continues polling until the learner reloads or leaves through browser controls.

**Recommended solution:** Observe the generation job's terminal state, expose a safe exit and appropriate retry, handle expired sessions explicitly, and cancel obsolete requests. Keep an elapsed-wait explanation distinct from a failed job.

**Estimated effort:** Small

**When to fix:** Soon after launch, or before launch if remediation is a required acceptance journey

# 8. Backend / API Review

Route handlers usually delegate to domain libraries and authenticate server-side. Course ownership and share-import idempotency are substantial existing controls. JSON/Zod validation is common, but error handling is inconsistent: for example, thread routes use throwing `parse` without mapping malformed input to a stable 400 response. That is secondary to the authorization flaw in the same path.

Existing lesson jobs use database claims and leases; interactive-component generation has an especially useful owner-based budget with concurrency, timeout, and idempotency controls. That implementation is a precedent for the wider AI surface.

## F06 — Concurrency limits do not bound admission or spending on expensive AI work

**Severity:** P1

**Category:** Security / Performance / Reliability

**Location:** [Copilot API](D:/Github/Primoria/apps/web/src/app/api/copilotkit/route.ts:252), [Agent run store](D:/Github/Primoria/apps/agent/src/runtime/run-store.mjs:34), [course creation API](D:/Github/Primoria/apps/web/src/app/api/learning/course/route.ts:57), and [interactive request budget](D:/Github/Primoria/apps/web/src/lib/interactive/request-budget.ts) for comparison.

**Evidence:** New Agent run IDs are durably inserted without an owner/global pending-run budget. Claims are globally ordered and concurrency defaults to two. Authentication does not limit admitted work. Course creation/positioning can perform model work and create jobs for distinct requests without the general budget used by interactive components. Web JSON normalization reads the body before the Agent's later body-size check; no equivalent early bound was found on this Web path. No repository-provided external admission control closes these gaps.

**Why it matters:** Limiting simultaneous execution protects only active work. It does not bound queued payload storage, queue waiting time, cumulative provider cost, or fairness between owners. Session authorization alone does not prevent account-based resource abuse.

**Realistic failure scenario:** One valid account sends many new run IDs or distinct learning goals. Other learners wait behind its work, PostgreSQL retains queued inputs, and provider charges continue as jobs drain. This can happen with very few users.

**Recommended solution:** Apply per-owner and global admission budgets before expensive parsing/provider work or queue insertion; bound pending work, request bytes/history, execution deadlines, and retry budgets. Return explicit backpressure, preserve idempotency, and add provider-spend alerts. Extend the existing PostgreSQL budget approach before adding another queue technology.

**Estimated effort:** Medium

**When to fix:** Before production

# 9. Database Review

The schema expresses ownership, relationships, queue state, and important uniqueness constraints. Owner-plus-course-scope reuse, reward dedupe keys, share-import uniqueness, and immutable share versions are appropriate database-enforced invariants. Transactions are used for significant writes. Migration responsibilities are explicit.

Transactions alone do not make an earlier read safe against concurrent changes. The highest-impact database defect is the generic course save. The principal query concern is overfetch, not a demonstrated N+1 problem. No production `EXPLAIN`, cardinality distribution, lock-wait measurement, or index-usage statistics were available; blanket index recommendations would be speculative.

## F02 — A stale course snapshot can overwrite independent writes and delete new lessons

**Severity:** P1

**Category:** Database / Bug / Reliability

**Location:** [store.ts mutation callers](D:/Github/Primoria/apps/web/src/lib/courses/store.ts:71) and [saveCourseToDb](D:/Github/Primoria/apps/web/src/lib/courses/store.ts:335).

**Evidence:** Code edits, block mutations, archive, and unarchive read a whole course and later call `saveCourse`. The transaction upserts course fields and all snapshot lesson fields, including blocks, status, progress, title, and version. Version is written without an expected-version predicate. It then deletes every lesson absent from the snapshot's `keepIds`. The initial read is outside this transaction. The description field has a dedicated protection, but other fields and the lesson set do not share that protection.

**Why it matters:** Atomic replacement can still be a lost update. The final delete treats an incomplete old snapshot as authority over newly inserted rows; lesson deletion can also cascade to job/checkpoint children.

**Realistic failure scenario:** A code-save request reads a course while a worker generates another lesson or a recommendation inserts remediation. The worker commits; the code-save commits its older aggregate. New content/progress is reverted, or the remediation lesson and its dependent records are removed. Archive can trigger the same class of race.

**Recommended solution:** Use narrow owner-scoped updates for the intended field or block, with optimistic versions or an appropriate shared lock. Reserve full aggregate replacement for operations that genuinely require it, and coordinate lesson-set replacement with inserts. Add deterministic competing-transaction tests for publish, progress, code edit, archive, and remediation insertion.

**Estimated effort:** Medium

**When to fix:** Before production

## F14 — Summary and history endpoints load unbounded data

**Severity:** P2

**Category:** Performance / Database

**Location:** [listCourseSummariesFromDb](D:/Github/Primoria/apps/web/src/lib/courses/store.ts:408) and [thread-repository.ts](D:/Github/Primoria/apps/web/src/lib/copilot/thread-repository.ts:16).

**Evidence:** Course summaries select every matching course and all columns of all its lessons, including full `blocks` JSON, then construct summaries in application memory. This is two bulk queries rather than N+1, but payload grows with all lesson content. Thread and message lists also have no cursor/limit. Polling and navigation can repeat large course reads.

**Why it matters:** A compact UI response can still require large database transfer, allocation, and serialization work. Per-owner growth can cause a problem before the service has many users.

**Realistic failure scenario:** A frequent learner accumulates hundreds of generated lessons and long chats. Opening the library or restoring history fetches far more data than is initially visible; concurrent users amplify memory pressure and database bandwidth.

**Recommended solution:** Select only summary fields and aggregate counts/status in the database, paginate course/history lists, and fetch lesson blocks on demand. Measure query bytes and latency before introducing caches or speculative indexes.

**Estimated effort:** Medium

**When to fix:** Soon after launch; earlier if initial cohorts import large libraries

# 10. Security Review

The strongest existing controls are server-side authentication, origin checks on state-changing traffic, opaque session cookies, parameterized database access, internal Agent authentication, widget sandboxing, bounded widget dependencies, sanitized share snapshots, and production container hardening. Browser route hiding is not the primary authorization mechanism.

The audit considered broken object authorization, resource consumption, CSRF, script execution, unsafe upload handling, injection, and secret exposure. It did not establish a SQL-injection, shell-injection, path-traversal, or arbitrary backend-URL fetch exploit in the reviewed paths. This is a bounded inspection result, not a penetration-test certification. Attachments have count/size checks, but parsing large or compressed documents still belongs inside the resource-admission work in F06.

A limited pattern scan of **976 tracked text files** found no PEM private keys or the selected GitHub/AWS/OpenAI credential patterns. Tracked environment files were examples. The scan did not inspect all Git history, external secret stores, or untracked private environment files, and does not prove the repository is secret-free. No secret values are included in this report.

## F03 — The code runner is an execution worker, not an account-privilege sandbox

**Severity:** P1

**Category:** Security / Architecture

**Location:** [code-runner/index.ts](D:/Github/Primoria/apps/web/src/lib/code-runner/index.ts:28), [worker.ts](D:/Github/Primoria/apps/web/src/lib/code-runner/worker.ts:17), and [next.config.ts](D:/Github/Primoria/apps/web/next.config.ts:9).

**Evidence:** The page creates a same-origin Worker. JavaScript source is passed to `AsyncFunction` with only `console` replaced. Python uses unrestricted `exec` in Pyodide with only `input` replaced. No separate origin or credentialless API boundary is established. Workers can use network APIs; same-origin requests normally include same-origin credentials. Pyodide exposes JavaScript through its `js` bridge. These platform properties are documented in [MDN's worker guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers), [MDN's credentials reference](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials), and [Pyodide 0.26.4's interoperability documentation](https://pyodide.org/en/0.26.4/usage/type-conversions.html).

**Why it matters:** Moving code off the UI thread limits UI blocking; it does not remove the browser session's origin authority. HttpOnly prevents directly reading a cookie, but does not prevent authenticated requests. Course code can originate from generated or imported content. A user Run action is required; this is not automatic execution or server remote-code execution.

**Realistic failure scenario:** A learner imports a malicious runnable lesson and clicks Run. If execution is available, the code requests same-origin course APIs with the learner's session and performs an unauthorized-by-the-learner action, such as deleting content or publishing a share. Origin/CSRF checks see same-origin traffic. The actual production-browser exploit chain was not executed.

**Recommended solution:** Execute untrusted lesson code in an origin isolated from authenticated APIs, using a tightly bounded message protocol and network capabilities. Retain execution/load watchdogs. Verify isolation with a production-build browser test. The production CSP omits JavaScript `unsafe-eval`, so the current JavaScript runner may instead fail under CSP; enabling it application-wide would not be a safe fix. Test Python and JavaScript separately under actual response headers.

**Estimated effort:** Medium

**When to fix:** Before production exposure of runnable generated/shared code

The existing HTML-widget iframe has a different and stronger boundary: `allow-scripts` without same-origin privileges, dependency validation, and message source/channel checks. F03 should not be used as a reason to discard that design.

# 11. Authentication & Authorization Review

Sessions are server-side, use hashed opaque tokens, expire, and are represented by HttpOnly/SameSite cookies with production Secure settings. Password verification uses salted hashing and timing-safe comparison. Signup handles duplicate identity conflicts. Password reset hashes its token and revokes sessions after changing the password. DB failures are generally distinguished from signed-out state. These are useful controls.

There is no completed email-verification challenge in the signup path, despite setting `verifiedAt`. Ordinary self-service signup does not automatically require an enterprise identity system, but treating the supplied email as an operator credential is unsafe. The production IP-rate-limit omission is covered by F04.

## F01 — Chat conflict updates do not enforce the authenticated owner's scope

**Severity:** P1

**Category:** Security / Database

**Location:** [thread-repository.ts](D:/Github/Primoria/apps/web/src/lib/copilot/thread-repository.ts:35), [thread POST route](D:/Github/Primoria/apps/web/src/app/api/copilot-threads/route.ts:23), and [message POST route](D:/Github/Primoria/apps/web/src/app/api/copilot-threads/[id]/messages/route.ts:28).

**Evidence:** Both POST routes accept caller-supplied IDs. Inserts include the authenticated owner, but `onConflictDoUpdate` targets globally unique thread/message IDs and updates fields without an owner predicate. `upsertCopilotMessage` first upserts its parent thread without establishing ownership. Read paths do filter by owner; those checks do not authorize the update branch.

**Why it matters:** Knowing another object's ID must not confer write access. Random identifiers reduce guessing but are not an authorization boundary. The message-parent relationship can also become inconsistent with owner metadata.

**Realistic failure scenario:** An authenticated user who obtains a victim thread ID overwrites its title/preview; with a victim message ID, the user can overwrite its content/role/metadata. This report establishes a write-isolation flaw, not a demonstrated cross-owner read leak or an unauthenticated exploit.

**Recommended solution:** Enforce owner scope on both insert and conflict paths, verify parent ownership before message creation, and make the relevant ownership invariant atomic. Reject conflicting foreign identifiers. Add a two-user database/API test covering new IDs, foreign threads, foreign message conflicts, and idempotent same-owner retries.

**Estimated effort:** Small

**When to fix:** Before production

## F10 — A password-reset token can be consumed successfully by concurrent requests

**Severity:** P2

**Category:** Security / Database

**Location:** [password-reset.ts](D:/Github/Primoria/apps/web/src/lib/auth/password-reset.ts:77), `confirmPasswordReset`.

**Evidence:** Validity and `consumedAt IS NULL` are checked outside the write transaction. Password hashing introduces an asynchronous gap. The transaction then changes the password, deletes sessions, and marks the token consumed by ID without a conditional unconsumed/expiry check or row-lock revalidation.

**Why it matters:** Token consumption is intended to be single-use. Two callers can validate the same token before either transaction consumes it; both can report success and the later password wins.

**Realistic failure scenario:** Two overlapping submissions of one valid reset link set different passwords. The first success screen no longer reflects the account's password. Exploitation requires possession of a valid token; this is not arbitrary account takeover.

**Recommended solution:** Atomically claim/consume a still-valid token inside the password-change transaction and require that claim to succeed. Ensure failures roll back the claim. Add a real two-request concurrency test, including an expired or superseded token.

**Estimated effort:** Small

**When to fix:** Before production

## F15 — Email allowlisting is not a trusted operator identity with current signup

**Severity:** P1, conditional on enabling production internal analytics

**Category:** Security

**Location:** [accounts.ts](D:/Github/Primoria/apps/web/src/lib/auth/accounts.ts:22) and [internal-access.ts](D:/Github/Primoria/apps/web/src/lib/telemetry/internal-access.ts:3).

**Evidence:** Signup accepts an email string, creates the identity, sets `verifiedAt` immediately, and creates a session without proving mailbox ownership. Production analytics authorizes an authenticated user by feature flag plus matching `user.email` against `PRIMORIA_INTERNAL_EMAILS`.

**Why it matters:** A self-asserted email must not become an administrative permission. The default disabled flag is a meaningful mitigation and should remain closed until a trusted operator path exists.

**Realistic failure scenario:** Before an operator registers, someone registers the operator's unused allowlisted address. If analytics is enabled, that account satisfies the gate and gains cross-user operational analytics access. This does not bypass the password of an already registered operator account.

**Recommended solution:** Use a provisioned immutable operator identity/permission, or verify mailbox control before granting the allowlisted privilege. Do not rely on the current `verifiedAt` value as evidence of verification. Test the first-registrant scenario.

**Estimated effort:** Medium

**When to fix:** Before production enablement of internal analytics; leaving it disabled is an acceptable interim mitigation

# 12. Performance Review

**No production latency, throughput, memory, Core Web Vitals, or query-plan benchmark was measured.** The findings are code-derived risks. Historical bundle results recorded on 2026-08-28 belong to that verification record, not this audit's revision.

| Area | Assessment | When it matters |
|---|---|---|
| AI admission and queueing | Likely first capacity/cost bottleneck; two Agent execution slots do not cap waiting work (F06). | Even 10 users if one submits aggressively; more visible with 100 active learners. |
| Course summary overfetch | Source-confirmed unnecessary database payload; latency magnitude unmeasured (F14). | Heavy individual libraries; likely more material at 1,000–10,000 active users. |
| Chat histories and serialized inputs | Unbounded retained/read content amplifies memory, storage, and provider context cost. | Long-lived users and growing run volume. |
| Event/checkpoint writes | Durable streaming naturally creates write volume; no current throughput failure established. | Investigate under measured 1,000+ active-user workloads before tuning event batching. |
| Lesson worker capacity | Provider latency and bounded worker slots determine time-to-first-lesson. | Bursty cohort onboarding, independent of total registered-user count. |
| Browser bundles | Bundle-budget CI and deferred external visualization runtimes are useful. No current bundle build ran. | Slow devices/networks and first use of large renderers/Pyodide. |
| Polling | Whole-course polling during generation multiplies work; F13 also lacks a terminal error path. | Long generations and many simultaneously open learner sessions. |
| Visualization CDNs | Cold-load latency and availability are external dependencies, not an established local CPU bottleneck. | Regions with unreliable CDN access; measure before changing delivery. |

The next useful measurements are admitted/running/queued work by owner, oldest queue age, provider duration and token counts, database response bytes, course-summary p95, first-lesson latency, and client LCP/INP/CLS on realistic devices. Capacity should be expressed in simultaneous active journeys and request mix, not guessed from registered-user counts.

Do not add cache layers until correctness and invalidation requirements are clear. Narrow summary queries and bounded admission are lower-risk improvements than distributed caching.

# 13. Reliability Review

Several failure policies are already careful: KG infrastructure failures do not silently become generated courses; mastery-read failure falls back to a cold outline; outline enrichment is best effort behind a write fence; workers use durable jobs and lease tokens; and Agent retry is restricted once user-visible/tool output exists. Preserve those decisions.

The highest risks are uncovered transitions: reads racing writes (F02), network failure during history persistence (F07), generated-graph resolution (F08), and terminal failures that the UI never consumes (F13).

## F05 — Rapid Agent restart can strand runs whose leases expire after startup

**Severity:** P1

**Category:** Reliability

**Location:** [runner.mjs](D:/Github/Primoria/apps/agent/src/runtime/runner.mjs:163) and [run-store.mjs](D:/Github/Primoria/apps/agent/src/runtime/run-store.mjs:249).

**Evidence:** Worker startup calls `recoverStaleRuns()` once. Recovery selects only `running` rows whose leases have already expired. Subsequent loops call `claimNext`, which only claims queued rows; they do not recover expired running rows. Shutdown deliberately leaves interrupted leases intact. A source-extracted probe with a stub store observed one recovery call while multiple claim polls continued. It is not a PostgreSQL crash test.

**Why it matters:** A restart before the previous lease expires is normal with process supervisors. The row is valid-looking during the startup scan and becomes abandoned later, without another scan to transition it.

**Realistic failure scenario:** The Agent crashes just after renewing a 30-second lease and restarts within a few seconds. The run remains `running` after expiry indefinitely. Readiness can still pass, the client can keep waiting, and terminal-only retention pruning does not resolve the row. A manual recovery command exists but is not automatic recovery.

**Recommended solution:** Periodically perform bounded stale-run recovery or integrate it into the claim lifecycle. Preserve lease fencing and the rule against replaying persisted side effects. Expose stale-running counts and test crash/restart before expiry followed by time advancing past expiry.

**Estimated effort:** Small

**When to fix:** Before production

## F11 — Worker health becomes stale while healthy jobs are running

**Severity:** P2

**Category:** Reliability / DevOps

**Location:** [lesson worker](D:/Github/Primoria/apps/web/src/workers/lesson-generation-worker.ts:148), [extractor worker](D:/Github/Primoria/apps/web/src/workers/extractor-worker.ts:252), [worker-health.ts](D:/Github/Primoria/apps/web/src/lib/courses/worker-health.ts:9), and [Compose worker healthcheck](D:/Github/Primoria/docker-compose.prod.yml:229).

**Evidence:** Process health is refreshed in claim loops before awaiting job processing. It is not refreshed independently during that processing. Lease renewal is a separate mechanism. Both the ready-file check and default DB worker-staleness threshold use 30 seconds, while legitimate model/planner calls can exceed that duration. If all lesson slots, or the single extractor loop, are busy, process health stops advancing.

**Why it matters:** Work duration is being mistaken for process death. Aggregate Web readiness treats stale workers as unready, potentially disrupting release startup or an external readiness monitor despite progressing work.

**Realistic failure scenario:** Two lessons are generating slowly, or Facts extraction takes more than 30 seconds. Readiness returns unhealthy until the loop returns. Docker Compose does not itself restart a container merely because its healthcheck fails, but dependent startup and external routing/monitoring can still be affected.

**Recommended solution:** Refresh process liveness on an independent bounded heartbeat and observe job leases/queue age separately. Test a slow successful job, genuine worker death, and a stuck provider call under production health thresholds.

**Estimated effort:** Small

**When to fix:** Before production

| Failure assumption | Current behavior / remaining concern |
|---|---|
| Database unavailable | Auth and KG paths have deliberate failures; queue claims cannot proceed. Verify reconnect/recovery under actual runtime configuration. |
| Provider fails before output | Agent bounded retry is appropriate; persistent overload still needs F06. |
| Provider fails after output/tool effects | Explicit failed run avoids replaying side effects; retain that policy. |
| Browser disconnects or refreshes | Agent events persist, but product chat restoration is undermined by F07. |
| Duplicate share import or reward | Database uniqueness/idempotency is useful and should remain. |
| Duplicate reset confirmation | Atomicity gap in F10. |
| Concurrent edits/generation | Aggregate replacement gap in F02. |
| Generated course completes a quiz | Static graph resolution gap in F08. |
| Remediation fails terminally | Missing visible failure/exit in F13. |

# 14. Testing Review

The repository already goes well beyond a minimal unit suite: Vitest, a bridge for legacy scripts, shared-contract checks, auth-boundary assertions, DB queue/progression/share tests, Agent lifecycle tests, scripted-provider browser journeys, multi-browser nightly coverage, bundle checks, and a production-Compose smoke runner. Existing tests should be extended around the exact failure boundaries, not replaced or diluted.

Some tests inspect source strings, which is useful for preventing accidental architectural drift but insufficient for authorization or transaction semantics. For example, finding an auth guard in a route does not prove its conflict update is owner-scoped; checking reset-token source structure does not prove single-use consumption under concurrent requests.

## Checks executed in this audit

| Check | Result | What it establishes |
|---|---|---|
| `node --check` across all 37 tracked Agent `.mjs` files | Passed | Parseable ESM syntax only; imports and runtime behavior were not loaded. |
| `node scripts/validate-visualization-catalog.mjs` | Passed | 19 implemented catalog entries and registry coverage validated. |
| Agent `internal-auth.unit.mjs` | Passed | Existing isolated internal-auth checks. |
| Agent `course-store-schema.unit.mjs` | Passed | Existing bounded course-read schema checks. |
| Web `auth-password-reset-static.unit.ts`, run from Web using local Node | Passed | Static source assertions only; no email or concurrent DB reset. |
| Web `code-block-runner.unit.ts`, same method | Passed | Language normalization checks; no Worker/Pyodide security validation. |
| Source-extracted Agent converter/worker probe with import stubs | Reproduced image loss; one recovery call across repeated claim polls | Narrow function behavior; not a full Agent integration test. |
| Limited tracked-file secret-pattern scan | No matches for selected patterns across 976 text files | Limited scan only; no assurance about Git history or external/untracked secrets. |
| `node scripts/audit-prod-bulk.mjs --audit-level high` | **Failed to execute: `spawnSync pnpm ENOENT`** | No vulnerability result. Do not interpret this as a clean audit or a discovered package advisory. |
| Full typecheck, lint, unit, build, DB, browser, Compose and live-provider gates | **Not run / unverified** | Dependencies absent; no installation, DB mutations, or external execution were authorized in this audit-only phase. |

The local pnpm major differs from the pinned version and reports that the root `pnpm.overrides` field is ignored under that local version. Use the repository-pinned toolchain for subsequent verification; do not update the lockfile or dismiss overrides to make this audit environment pass.

## Highest-value behavioral tests

| Priority | Behavior to test | Findings addressed |
|---|---|---|
| Critical | Two users attempt foreign thread/message insert and conflict update; owner data remains unchanged. | F01 |
| Critical | Deliberately interleave block save/archive with lesson publish, quiz progress, enrichment and remediation insert. | F02 |
| Critical | Production-build runnable Python/JS attempts authenticated API access from the execution context; it must be denied. | F03 |
| Critical | Render production service environment with synthetic values and assert selected provider/email/IP-limit contracts; then controlled login/reset smoke. | F04 |
| Critical | Restart Agent before lease expiry, advance past expiry, and verify output-aware recovery without operator intervention. | F05 |
| Critical | One owner floods distinct requests; queue/storage/spend budgets hold and another owner can make progress. | F06 |
| Critical | Delayed multi-chunk assistant reply plus a failed persistence request, then reload and restore complete acknowledged history. | F07 |
| Critical | Generated `gen_*` course: materialize, submit quiz, update mastery, resolve next/remediation, finish course. | F08 |
| Valuable | Concurrent confirmation of one reset token; exactly one succeeds. | F10 |
| Valuable | Busy but healthy workers remain ready; dead or expired workers do not. | F11 |
| Valuable | Vision request reaches a scripted provider with the actual image part intact. | F12 |
| Valuable | Permanent remediation error and expired session show retry/exit without endless modal polling. | F13 |
| Valuable | First registrant of an unused allowlisted email cannot become an operator. | F15 |
| Valuable | Operational logs omit learner free text by default. | F16 |
| Growth | Summary payload/query bytes and history pagination stay bounded with large owner libraries. | F14 |

There is no payment flow in the reviewed product, so payment test recommendations would be irrelevant. New Web tests should follow the repository's native Vitest policy; use DB/browser layers where mocks cannot establish the invariant.

## F17 — The repository's required external release gates remain incomplete

**Severity:** P1

**Category:** Testing / DevOps

**Location:** [integration-regression-testing.md](D:/Github/Primoria/docs/integration-regression-testing.md:66), [.github/workflows/ci.yml](D:/Github/Primoria/.github/workflows/ci.yml), and [nightly-regression.yml](D:/Github/Primoria/.github/workflows/nightly-regression.yml).

**Evidence:** The current regression document explicitly distinguishes implemented deterministic tests from planned formal snapshot publication/download and 100-case nightly / 1,718-case release real-model gates. The named `embedding-snapshot-authorization.json` record is absent in this checkout. Current workflows do not implement those planned live gates. The document also records earlier missing Compose/branch-protection evidence. Their present remote status was not queried and must not be inferred from that older record.

**Why it matters:** The permanent corpus and synthetic/scripted checks guard important policies, but do not establish actual provider routing quality or authorized fixed-vector coverage. The repository itself defines these as release requirements.

**Realistic failure scenario:** A deterministic green build is treated as full readiness, while a changed model misroutes school curriculum or goal scope, or production topology has never received an accepted passing run. Existing tests can stay green because they do not run the missing evaluation.

**Recommended solution:** Obtain the explicitly required authorization evidence, reviewed vectors and scored baseline; implement and execute the documented gates; retain artifact identity and actual release-candidate results. Confirm remote branch protection and Compose evidence. Do not fabricate approvals, publish unauthorized artifacts, reduce the 1,718-case floor, or weaken gold policies. Any launch-scope exception needs an explicit product decision outside this audit.

**Estimated effort:** Large, including external dependencies

**When to fix:** Before production under the current release contract

# 15. DevOps & Deployment Review

The production topology is appropriately simple. Migration and runtime responsibilities are separated; the Agent waits for checkpoint schema initialization and runtime grants; Web waits for Agent readiness. Runtime processes run as non-root with read-only filesystems, dropped capabilities, and no-new-privileges. Internal services are not publicly published. These are valuable controls.

Compose is a deployment description, not proof of a running staging environment. The repository contains a synthetic-provider topology smoke, backup/restore scripts, and runbooks. This audit did not verify a live host, TLS certificate, scheduler, backup object, alert receiver, external CI result, or provider account.

## F04 — Production Compose does not pass several required runtime settings

**Severity:** P1

**Category:** DevOps / Security / Reliability

**Location:** [docker-compose.prod.yml](D:/Github/Primoria/docker-compose.prod.yml:87), [tencent-ses.ts](D:/Github/Primoria/apps/web/src/lib/email/tencent-ses.ts:40), [rate-limit.ts](D:/Github/Primoria/apps/web/src/lib/auth/rate-limit.ts:49), and [model.ts](D:/Github/Primoria/apps/web/src/lib/ai/deepagent/model.ts:70).

**Evidence:** Services enumerate `environment` and do not use an environment file to inject the example wholesale. Web receives SES secret ID/key but not `TENCENT_SES_FROM_EMAIL` or `TENCENT_SES_PASSWORD_RESET_TEMPLATE_ID`, both required by `isTencentSesConfigured`. It receives none of the auth client-IP header settings; the default is no trusted header, producing only account-based limit keys. AI services receive `AI_PROVIDER` and OpenAI variables but omit Anthropic credentials/settings. Other capability/tier settings also differ across services. Compose's `.env` interpolation does not automatically put every variable inside containers, as explained by [Docker's environment documentation](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/).

**Why it matters:** Following the example environment setup can look complete while the running service cannot see essential values. The problem is both functionality and protection drift.

**Realistic failure scenario:** Password-reset requests return service unavailable despite completed SES values in the host `.env`. Authentication attempts across many email addresses avoid the intended IP bucket. Selecting `anthropic-compatible` leaves model construction without its key and can prevent AI services from working.

**Recommended solution:** Define and validate an explicit per-service environment contract for enabled capabilities, including trusted proxy/IP behavior. Check it with nonsecret sentinel values in production-topology tests, then verify selected services. Pass only required secrets to each service rather than exposing the entire environment indiscriminately.

**Estimated effort:** Small

**When to fix:** Before production

## F09 — Production uses an end-of-life Node release and differs from CI

**Severity:** P2

**Category:** DevOps / Security

**Location:** [app.Dockerfile](D:/Github/Primoria/docker/app.Dockerfile:6) and [CI runtime](D:/Github/Primoria/.github/workflows/ci.yml:26).

**Evidence:** Both Docker base/runtime stages use `node:20-bookworm-slim`; CI uses Node 22. The official schedule records Node 20 end-of-life as **2026-04-30**, before this audit's 2026-09-26 date. See the [Node.js release schedule](https://github.com/nodejs/Release/blob/main/README.md). This is a support-lifecycle finding, not an asserted exploitable CVE.

**Why it matters:** Production is on an unsupported runtime line, and normal CI exercises a different major. Container rebuilds alone do not move to a maintained Node major.

**Realistic failure scenario:** A runtime security fix lands only on supported releases, or a runtime-specific behavior succeeds in CI but fails in the production image. The team discovers the mismatch during an incident or deployment.

**Recommended solution:** Select a maintained LTS major, align CI/build/runtime expectations, and run the actual production image through Web, Agent, native dependency, and worker smoke tests. Keep pnpm pinned and rebuild reproducibly.

**Estimated effort:** Small

**When to fix:** Before production

## Dependencies and configuration

The lockfile, frozen installs, production audit gate, and targeted overrides are useful supply-chain controls. Main dependencies have concrete roles: Next/React for the app, CopilotKit/AG-UI for Tutor integration, LangChain/deepagents for orchestration, Drizzle for data access, and schema libraries for contracts. Multiple Zod versions in the transitive tree are not automatically a defect. Browser visualization libraries are deliberately loaded from a shared allowlist rather than all bundled as application dependencies.

The optional memory package brings a sizable provider ecosystem through `mem0ai`; no measured bundle/runtime benefit from replacing it was established. Keep optional integrations disabled unless needed, and measure installed production/image reachability before removing packages. No maintained/unmaintained package claim is made from version numbers alone. The production vulnerability scan did not complete, so dependency security remains unverified.

Server credentials remain server-side; no BYOK/client-secret path should be added. Public app URL and Turnstile site key are intentional browser configuration. The HTTP-only Caddy mode is documented for pre-domain testing; release signoff must use the intended HTTPS domain and production secure cookies.

## Partial deployments, migration and rollback

One-shot migration dependencies provide fail-closed startup for a new deployment, but cannot undo a migration that has already committed. The course-share versioning migration removes legacy columns after conversion. That is not compatible with arbitrary old application images, so image-only rollback must be checked against the actual schema transition.

Use the existing preflight/runbook to record the prior image/revision, take and verify the pre-deploy backup, define the maintenance window, and specify whether recovery is a forward fix or a database restore. Do not assume a rolling mixed-version deployment is safe across that migration. Database restoration can lose writes after the backup and needs an explicit operational decision.

Backup tooling uses PostgreSQL dumps, off-host COS storage, checksums, and an isolated restore drill. The documented daily/weekly schedule and RPO/RTO are targets, not measured guarantees from this audit. Before launch, retain a successful restore record and evidence the actual scheduler and alert path are active. A single host remains a shared failure domain; that can be acceptable for a bounded initial launch with realistic recovery expectations.

# 16. Observability Review

Useful observability already exists: JSON worker lifecycle logs, job/run identifiers, request-ID propagation, LLM duration/token/cache-use logs, queue-age checks, worker heartbeat state, Agent administration commands, and persisted run events. These are enough to build a small actionable operational view.

The gaps are practical: Agent readiness can miss abandoned running rows (F05); worker readiness can falsely fail (F11); chat save errors disappear (F07); and LLM usage logs do not enforce a spend ceiling (F06). Request, Agent run, course/job, and provider-call identifiers should be connected for the affected workflows. The reviewed Compose file does not establish log rotation or an alert destination; these may be host-managed and were not verified.

Start with alerts for stale/oldest work, terminal job failure rates, provider error/latency spikes, unusual admitted work or token use, disk capacity, failed backups, and restore-drill age. A large tracing platform is unnecessary before those signals work.

## F16 — KG positioning logs include raw learner free text

**Severity:** P2

**Category:** Security / Maintainability

**Location:** [positioning-log.ts](D:/Github/Primoria/apps/web/src/lib/knowledge-graph/positioning-log.ts:30) and [position API](D:/Github/Primoria/apps/web/src/app/api/knowledge-graph/position/route.ts:41).

**Evidence:** `buildPositioningLog` includes `rawQuery` and `coreQuery`; the position API passes it to `logPositioning`, which serializes the full record to `console.log`. There is no content-redaction or diagnostic opt-in at that call site. This observation concerns code, not an inspected production log dataset.

**Why it matters:** Learning goals can include school context, personal struggles, names, or other disclosures. General console ingestion creates additional copies and access paths outside the intended learner-data controls.

**Realistic failure scenario:** A learner describes a personal difficulty in a goal. It appears in operational logs exported to a support/logging system with broader access or longer retention than the application record.

**Recommended solution:** Default to structured routing diagnostics without raw learner text. If content sampling is needed for authorized evaluation, separate it from operational logs with explicit access, retention, and redaction rules. Verify the default log payload in tests.

**Estimated effort:** Small

**When to fix:** Before production

# 17. Scalability Review

Registered-user totals are not capacity measurements. These are planning ranges under increasing simultaneous use, not throughput claims.

| Approximate scale | Most likely pressure | Appropriate response |
|---|---|---|
| 10 users | F01/F02 correctness defects already matter; one account can overwhelm AI admission. | Fix correctness and admission first; retain the single-host design. |
| 100 users | Bursty Tutor/lesson demand exceeds a few provider-bound execution slots; fairness and waiting experience dominate. | Measure active/queued work, enforce budgets, tune bounded concurrency to provider/DB capacity. |
| 1,000 users | Provider throughput/cost, worker backlog, connection budgets, and large owner histories become material. | Add worker capacity using existing lease semantics; optimize F14; load-test realistic request mixes. |
| 10,000 users | Shared-host CPU/RAM/disk, durable event/checkpoint volume, logs/media, and database I/O become likely constraints. | Separate measured bottlenecks, enforce retention, consider a dedicated database and independent Web/worker scaling. |
| 100,000 users | High availability, independent deployment capacity, tenant fairness, operational staffing, and recovery objectives become architectural requirements. | Plan horizontally replicated stateless services, appropriately operated PostgreSQL, object/CDN delivery, and robust admission/observability. |
| 1,000,000 users | Provider economics and partitioning of workload/data lifecycles become major system concerns. | Reassess from measured distributions and business SLAs; current code alone cannot justify a concrete architecture at this scale. |

**Probable first bottleneck:** external-model latency and cost combined with global small worker capacity and unbounded admission. **Probable second bottleneck:** database/storage work from persisted runs, course payloads, histories, and aggregate mutation patterns. CPU and network conditions may change their order; no benchmark establishes a hard threshold.

What scales naturally: stateless HTTP handlers, separate workers, database claims with `SKIP LOCKED` and fencing, immutable snapshots, server-owned rewards, and shared pure contracts. What eventually needs operational change: the single-host failure domain, database availability/backups, aggregate connection budgets, long-lived SSE connection handling, media/log retention, and provider quotas.

Do not build multi-region replication, sharding, Kafka, or Kubernetes for a hypothetical million users now. The valuable near-term work remains correctness, bounded work, failure visibility, and a measured capacity baseline.

# 18. Technical Debt

| Class | Actual examples | Treatment |
|---|---|---|
| Dangerous debt | Unscoped conflict writes (F01); aggregate stale saves (F02); code execution boundary (F03); split graph resolution (F08); UI-only history durability (F07). | Repair with explicit invariants and targeted regression tests before expanding these surfaces. |
| Dangerous operational debt | Environment drift (F04), one-shot recovery (F05), unbounded admitted work (F06), incomplete release contract (F17). | Close before unrestricted production use; capture release evidence. |
| Normal debt | Large Tutor/course components, legacy test bridge, optional integration footprint, repeated polling, broad runtime DB role, incomplete end-to-end correlation. | Address during nearby work or measured operational need. Do not turn them into a rewrite project. |
| Growth debt | Full-content summary reads (F14), history paging, retention/capacity tuning, single-host availability. | Address at explicit data-volume or service-level thresholds. |
| Cosmetic debt | Naming preferences, file ordering, formatting, choice of equivalent libraries. | No audit finding; defer unless it aids a concrete behavioral change. |

The legacy `.unit.ts` bridge is a migration mechanism, not a reason to delete coverage. Preserve the permanent bilingual learning-goal corpus, current gold policies, catalog sync checks, and separate mastery/facts/progression semantics.

# 19. Things That Are Already Well Engineered

- **Appropriate deployment shape.** A modular application, internal Agent, PostgreSQL, and bounded workers are a maintainable starting point. Keep this architecture unless measured requirements demand more.
- **Cross-runtime contracts.** Shared artifact schemas, an allowlisted dependency source, and catalog synchronization tests reduce Web/Agent drift. Preserve the plain-ESM Agent boundary.
- **Domain separation.** Mastery is evidence-driven, facts describe the learner, and XP records effort/completion. Combining these would weaken product correctness.
- **Deterministic course scope and outline.** Exact owner/scope reuse, concept-frontier grouping, stable authored ordering, and cold fallback on mastery-read failure are thoughtful decisions.
- **Explicit infrastructure failures.** KG coverage miss is distinguished from unavailable infrastructure, avoiding silent scope changes when the database/provider fails.
- **Durable work and side-effect awareness.** PostgreSQL claims, lease tokens, checkpoints, cancellation, and output-aware retry policies are a strong foundation. Fix F05/F11 without discarding them.
- **Fenced optional enrichment.** Best-effort title/description enrichment behind equality checks is appropriate; it should remain separate from authoritative user edits.
- **Reward idempotency.** Unique append-only XP awards and transactionally applied totals are substantially safer than client-authored rewards.
- **Immutable sanitized sharing.** Versioned snapshots, explicit revocation, owner isolation, and repeat-import controls are the right sharing model.
- **HTML-widget isolation.** Sandboxed iframes, source/channel validation, dependency control, and restricted bridges should be retained. They are distinct from the code runner defect.
- **Production foundations.** Server-side sessions, internal Agent authentication, runtime/migrator role separation, non-root hardened containers, backup/restore tooling, and migration preflight are meaningful engineering work.
- **Regression intent and honesty.** Broad deterministic layers, scripted integration tests, bundle budgets, and documentation explicitly marking external blockers provide a useful foundation. Keep blocked gates visibly blocked.

These parts are currently appropriate and should not be rewritten without a concrete reason.

# 20. Recommended Engineering Roadmap

## Phase 1 — Production Blockers

1. **Protect durable data and trust boundaries:** fix F01 and F02; isolate F03 before runnable generated/shared code reaches production. Add two-user and concurrent-transaction tests alongside the changes.
2. **Repair critical learner lifecycle failures:** fix F05, F07, and F08 with restart, delayed-stream/reload, and generated-course end-to-end tests.
3. **Make the deployed system match its contract:** fix F04, align the maintained runtime in F09, and resolve F10/F11. Validate a production image using synthetic configuration first, then authorized real service checks.
4. **Bound production exposure:** implement F06 admission budgets, remove default raw-goal logging in F16, and leave internal analytics disabled until F15 is resolved or a trusted operator provisioning path is in place.
5. **Close release evidence:** satisfy F17, run the full deterministic regression on the release candidate, verify actual selected-provider and HTTPS auth/reset journeys, and retain backup/restore and rollout/rollback evidence. Preserve every permanent routing case and gold policy.

For an initial launch that advertises image input, F12 is also part of this phase. No feature-scope reduction is assumed or approved by this report.

## Phase 2 — High-Value Improvements

- Fix the remediation failure experience (F13) and add visible handling for session expiry during long operations.
- Remove summary overfetch and introduce bounded history/course paging (F14).
- Connect request/run/job/provider identifiers; turn existing logs and health data into a small set of actionable alerts.
- Extract narrow graph-resolution, course-mutation, and history-persistence boundaries while fixing their behaviors. Keep unrelated component structure stable.

## Phase 3 — Growth Improvements

- Establish a repeatable load profile covering onboarding bursts, simultaneous Tutor streams, quiz completion, and large libraries.
- Tune worker concurrency and aggregate database pools against measured provider limits and database capacity.
- Introduce independent service/database capacity, retention policies, media delivery changes, and stronger availability only when operational objectives justify them.
- Revisit service-specific DB privileges and dependency/image footprint as attack surface and team size grow.

## Phase 4 — Optional Engineering Polish

- Gradually migrate remaining legacy tests when touched, preserving behavior and coverage.
- Split large presentation components where that demonstrably clarifies ownership or testability.
- Consolidate minor error-response conventions and improve developer-toolchain diagnostics.
- Defer naming/style cleanup and fashionable infrastructure changes.

# Final Questions

## 1. Is there anything that could cause data loss?

Yes. F02 can overwrite generated content/progress and delete lessons inserted after a stale read, including dependent job/checkpoint data. F07 can lose the complete product-visible chat record or retain only a stream fragment. F01 allows a user with another record's identifier to overwrite that record. Backup restoration also has its normal post-backup write-loss tradeoff; no current restore was executed.

## 2. Is there anything that could realistically cause a security breach?

Yes. The strongest paths are cross-owner chat writes (F01), same-origin privileges for untrusted runnable code (F03), and unverified-email operator access if analytics is enabled (F15). F04 weakens intended IP throttling; F06 exposes service resources and spend; F16 unnecessarily spreads learner free text into logs. No production exploit or exposed secret was demonstrated.

## 3. Is there anything that could cause major downtime?

Yes. Selecting a provider whose credentials are not forwarded can disable AI services (F04); unbounded admitted work can exhaust practical capacity (F06); a host/database failure affects the single-server stack. F11 can falsely fail readiness. F05 causes stuck individual runs while health may remain green, rather than necessarily taking the whole service down. Actual recovery time remains unmeasured.

## 4. What is most likely to break first as usage grows?

AI queue waiting time, fairness, and provider cost are the leading risks. Database transfer/storage and worker backlog follow as histories, course blocks, events, and checkpoints accumulate. Correctness bugs can occur before any scale threshold is reached.

## 5. Which areas of the codebase would concern a senior engineer most?

The generic course persistence API; chat upsert authorization; code execution origin boundary; Tutor history/protocol conversion; Agent recovery lifecycle; generated-graph progression; and production environment/release-gate drift. These need precise invariants and tests more than broad refactoring.

## 6. Which areas are already well engineered and should not be rewritten?

The modular monolith/worker topology, shared contracts, catalog routing, widget sandbox, deterministic concept-frontier outline, mastery/facts/XP separation, immutable share snapshots, durable lease-based jobs, output-aware Agent retry, hardened runtime containers, and layered regression structure.

## 7. What are the five highest-ROI engineering improvements?

1. Close ownership and mutation invariants: F01 plus narrowly scoped, concurrency-safe course writes in F02.
2. Isolate runnable code from account privileges: F03.
3. Repair durable learner workflows: F05, F07, and F08 with focused lifecycle tests.
4. Make production configuration and health reliable: F04, F09–F11, with the actual production image tested.
5. Bound AI admission and make release approval evidence-based: F06 and F17, using existing PostgreSQL and regression infrastructure.

## 8. If this were your responsibility in a real company, what would you fix before allowing the product to launch?

I would require the Phase 1 trust-boundary, data-integrity, recovery, history, generated-course, configuration, and admission fixes; a maintained runtime; atomic reset consumption; and reliable worker health. I would keep analytics closed until operator identity is trustworthy, remove raw learner text from operational logs, and require image-path correction if image input is advertised. I would then require passing release-candidate regression, the documented authorized routing gates, production-image auth/provider smoke, and a demonstrated restore/rollback plan. I would approve a bounded launch after that evidence, without requiring a new architecture or speculative scale infrastructure.
