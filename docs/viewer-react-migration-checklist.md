# Viewer React Migration Checklist

This checklist records the delivered React viewer implementation against the original migration scope.

| 交互ID | 模块 | 目标实现 | 依赖 | 状态 | 测试类型 |
| --- | --- | --- | --- | --- | --- |
| VR-001 to VR-002 | Public | Landing page with learner-first hero and auth CTAs | Router, copy layer | Implemented | RTL + Playwright |
| VR-003 to VR-008 | Auth | Supabase email/OAuth auth, forgot-password, verification state, WeChat placeholder | Supabase client, auth provider | Implemented | RTL + Playwright |
| VR-009 to VR-010 | Home shell | URL-driven learner shell with nav synchronization and continue-learning card | Auth guards, shell layout, enrollments query | Implemented | RTL |
| VR-011 to VR-013 | Library | Search, subject filters, course cards, empty/loading states | Catalog API, subject queries, router | Implemented | RTL + Playwright |
| VR-014 to VR-015 | Course | Enrollment CTA and lesson launch from course detail | Course detail query, enroll mutation | Implemented | RTL + Playwright |
| VR-016 to VR-019 | Lesson runtime | Runtime parser, page navigation, correctness, completion RPC, result route | Schema parser, learner renderer, `complete_lesson_and_award_xp` | Implemented | RTL + Playwright |
| VR-020 to VR-023 | Community | Persisted dashboard/rooms/messages/trending/notes MVP with explicit fixture path only for dev/test | Community tables, RLS, room/message/discussion RPCs | Implemented (persisted MVP) | RTL + Playwright + DB migration checks |
| VR-024 to VR-026 | AI Tutor | Agent-service-backed tutor chat, backend-managed threads, and backend tool generation | `agent-service`, Supabase auth, copy layer | Implemented (production path) | RTL + Playwright + agent-service smoke |
| VR-027 to VR-030 | Profile + achievements | Profile hub, achievement wall, manage mode, service-side unlock rendering, pinning | Stats queries, achievement queries, pinned mutations, lesson completion RPC | Implemented (real backend path) | RTL + Playwright |
| VR-031 to VR-034 | Settings | Profile form, browser preferences, binding code, sign-out | Preferences slice, profile mutation, parent RPCs, auth provider | Implemented (real backend path) | RTL + Playwright |
| VR-035 to VR-037 | Parent | Parent-only dashboard, child selection, report refresh, bind/unbind | Parent RPC queries and mutations | Implemented (real backend path) | RTL + Playwright |
| VR-038 to VR-040 | Platform | Route guards, role redirects, strict env guards, explicit fixture test hook | Auth slice/provider, router, strict Supabase env bootstrap | Implemented (strict mode) | RTL + Playwright + build guard |
| VR-041 to VR-044 | Release ops | CI gate, Cloudflare preview/prod workflows, operations runbook, recovery path, preview smoke | GitHub Actions, Cloudflare Pages, runbook | Implemented + cloud smoke passed (2026-03-31) | Workflow checks + deployed preview smoke |
| VR-045 to VR-049 | Enterprise hardening | Bundle budgets, feature flags, observability hooks, route error boundaries, black/gray/white-box matrix | Vite chunking, Sentry/PostHog env, router boundaries, test harness | Implemented (enterprise baseline) | RTL + Playwright + bundle gate |

## Unified Builder Integration

The original Viewer migration has now been extended into a single-app architecture:

- Builder dashboard/editor are now served from `packages/viewer-react`
- canonical Builder routes are `/builder/dashboard`, `/builder/editor`, and `/builder/editor/:courseId`
- Viewer auth is now the only public auth surface for both learner and Builder flows
- Builder access now checks only for authenticated session state
- cross-app Builder handoff and the standalone `packages/builder` app have been removed
- Flutter `Viewer/` implementation has been fully removed from the repository
