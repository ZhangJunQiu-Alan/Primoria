# Primoria PRD (Current Baseline)

Last updated: 2026-03-06

## 1. Product Definition

Primoria is a creator-to-learner platform with two apps:
- Builder: author courses with structured interactive blocks
- Viewer: consume published lessons with gamified progression

Primary focus:
- Fast course authoring
- Reliable publish/playback path
- Data-informed creator dashboard

## 2. User Roles

1. Learner (`user`): learns courses in Viewer
2. Subscriber (`subscriber`): future paid-learning extensions
3. Author (`author`): can access Builder dashboard/editor
4. Admin (`admin`): full platform operation

## 3. Current Functional Scope

### 3.1 Builder

- Landing + auth (email/password + OAuth callback flow)
- Role-gated access to `/dashboard` and `/builder`
- Dashboard tabs:
  - Home (redesigned)
  - Course Manage (redesigned workspace, core flow preserved)
  - Data Center (redesigned)
  - Fans Management (redesigned)
- Course editor:
  - block insertion/reorder/delete
  - inline editing for `text`, `code-block`, `code-playground`
  - save/publish/import/export
  - AI generation (including agentic pipeline and quality improvements)

### 3.2 Viewer

- Login/register and protected navigation
- Home / Library / Community / Profile flows
- Enrollment and lesson completion
- Markdown lesson text rendering
- XP/streak/achievement systems
- Profile avatar + cover image update

### 3.3 Shared Schema & Compatibility

- Canonical top-level key: `lessons`
- Legacy `pages` input is still accepted and auto-migrated
- Schema version: `1.0.0`
- Import migrator normalizes legacy block aliases and visibility aliases

## 4. Dashboard Redesign Requirements (Delivered)

### Home
- Personalized greeting
- quick actions
- learning overview KPIs and trend line
- top 3 courses
- recent activity timeline
- reserved income module

### Data Center
- KPI row
- trend chart with range selector
- course performance comparison
- geographic distribution
- learning time heatmap
- detail table + export

### Fans Management
- fan overview and growth trend
- searchable/filterable paginated fan list
- engagement hub
- learner tag manager
- reserved messaging module

### Course Manage
- dedicated course-management workspace tab
- header actions (create / AI generate / refresh)
- summary strip + search/filter/sort controls
- enhanced course cards with status and metadata
- integrated lesson management tiles per course
- improved loading/empty/no-results/error state handling
- preserve existing create/edit/delete/open/add-lesson/delete-lesson behaviors

## 5. Non-Functional Requirements

1. Responsive layout: desktop/tablet/mobile
2. Reusable UI componentization for dashboard modules
3. Graceful loading/empty/error states
4. i18n coverage for newly added dashboard copy
5. Backward compatibility for old imported JSON

## 6. Data & Backend Requirements (Pending)

To complete full analytics fidelity, add backend support for:
1. event-level daily/weekly analytics facts
2. revenue/settlement tables
3. fan engagement actions (reply/mark/export/notify)
4. dashboard-specific aggregation endpoints or materialized views

## 7. Release Acceptance Criteria

1. Home/Course Manage/Data/Fans tabs available and responsive
2. Course Manage redesign is live while preserving core production behaviors
3. Dashboard analyze passes in Builder module
4. Docs and TODO/changelog synchronized
5. No regression in core Builder edit/save/publish loop

## 8. Out of Scope (Current Iteration)

1. Real-time collaboration editing
2. Fully real revenue settlement
3. Full private messaging system
4. Multi-tenant enterprise controls
