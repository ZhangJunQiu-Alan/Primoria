# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Primoria is a two-part Flutter system for interactive STEM courses:
- **Builder** (`Builder/`) — Flutter Web course authoring tool (drag-and-drop block editor, Riverpod state management, GoRouter)
- **Viewer** (`Viewer/`) — Flutter multi-platform learning app (Brilliant.org-inspired, Provider state management)
- **supabase/** — PostgreSQL backend (migrations, auth, course storage, gamification)

The apps share a **Course JSON schema** (`Course → Pages → Blocks`) but are independent Flutter projects with separate dependencies and state management.

## Common Commands

```bash
# Builder
cd Builder && flutter pub get
cd Builder && flutter run -d chrome
cd Builder && flutter build web
cd Builder && flutter analyze
cd Builder && flutter test

# Viewer
cd Viewer && flutter pub get
cd Viewer && flutter run -d chrome
cd Viewer && flutter build web
cd Viewer && flutter analyze
cd Viewer && flutter test

# Supabase (requires Docker for local dev)
cd supabase && supabase start
cd supabase && supabase db push          # apply migrations
cd supabase && supabase migration new <name>  # create migration
```

## Architecture

```
Builder (Flutter Web) --export JSON--> Supabase (PostgreSQL) <--fetch-- Viewer (Flutter)
```

### Builder (`Builder/lib/`)
- **State**: Riverpod (`providers/builder_state.dart`, `providers/course_provider.dart`)
- **Routing**: GoRouter (`app/router.dart`) — routes: `/` (landing), `/dashboard`, `/builder`, `/viewer`
- **Models**: `Course → Page → Block` hierarchy (`models/`)
- **Block types**: text, image, codeBlock, codePlayground, multipleChoice, fillBlank, video — registered in `services/block_registry.dart`
- **Backend**: `services/supabase_service.dart` — auth (email/Google/GitHub), course CRUD, versioned content storage
- **AI**: `services/ai_course_generator.dart` — Gemini API for PDF-to-course generation
- **Design tokens**: `theme/design_tokens.dart` — `AppColors`, `AppSpacing`, `AppBorderRadius`, `AppShadows`, `AppFontSize`

### Viewer (`Viewer/lib/`)
- **State**: Provider (`providers/user_provider.dart`, `providers/theme_provider.dart`)
- **Screens**: home, search, courses, course detail, lesson, profile, login, demo
- **Services**: audio (sound effects), notifications (daily reminders), storage (SharedPreferences + SQLite)
- **Theme**: `theme/colors.dart`, `theme/typography.dart`, `theme/spacing.dart`

### Database (`supabase/migrations/`)
Key tables: `profiles`, `courses`, `course_versions`, `chapters`, `lessons`, `content_blocks`, `enrollments`, `lesson_completions`, `user_stats`, `achievements`, `xp_transactions`

Courses use versioned content: `courses.current_draft_version_id` / `current_published_version_id` → `course_versions.content` (JSON).

## Key Patterns

- Builder screens often define a private `_C` class with color constants matching CSS variables from HTML templates in `Builder_temple/`
- Design mockups are in `Design/` — reference these when asked about visual styling
- Supabase credentials are hardcoded in `Builder/lib/main.dart` as compile-time constants (anon key only)
- Builder tests are in `Builder/test/` — 26 model unit tests pass; `widget_test.dart` fails due to Supabase init requirement
- Course JSON format is documented in `Builder/docs/course-json-guide.md`

## Requirements

- Flutter SDK ≥ 3.9.0, Dart ≥ 3.9.0
- Supabase CLI + Docker for local backend development
- Chrome for Builder web development
