# Primoria

Primoria is a two-part Flutter system for building and consuming interactive STEM courses.

- **Builder**: a Flutter Web authoring tool to compose courses via drag-and-drop blocks and export JSON.
- **Viewer**: a Flutter Web learning experience inspired by Brilliant.org to consume course content and run interactive lessons.

This repository contains both apps plus the shared course schema and product docs.

## System Architecture

```
[Builder (Flutter Web)]
        |
        |  export Course JSON
        v
[Course Schema (Course/Page/Block)]
        |
        |  load/preview in Website
        v
[Viewer (Flutter Website)]
```

Backend: **Supabase (Postgres)** — accounts, cloud course saving/publishing, search/recommendation.

## Repository Layout

```
Primoria/
├── Builder/                     # Course authoring app (Flutter Web)
├── Viewer/                      # Learning app (Flutter Web)
├── supabase/                    # Supabase backend (migrations, config)
├── docs/                        # Project documentation
├── Design/                      # UI design mockups (PNG)
├── Builder_temple/              # HTML templates/prototypes
├── img/                         # Project images/assets
├── CLAUDE.md                    # Claude Code project guidance
└── .env.example                 # Environment variables template
```

## Environment Setup

### Prerequisites
- **Flutter SDK**: 3.35.0 or higher
- **Dart SDK**: 3.9.0 or higher
- **IDE**: VS Code with Flutter extension or Android Studio with Flutter plugin

### Installation

1. **Install Flutter**: Follow the [official guide](https://docs.flutter.dev/get-started/install).

2. **Verify Installation**
   ```bash
   flutter doctor
   ```

3. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/ZhangJunQiu-Alan/primoria.git
   cd primoria
   cd Builder && flutter pub get
   cd ../Viewer && flutter pub get
   ```

4. **Run the Apps**
   ```bash
   # Builder (Flutter Web)
   cd Builder && flutter run -d chrome

   # Viewer (Flutter Web)
   cd Viewer && flutter run -d chrome
   ```

## Builder Overview

**Routes:** `/` (Landing) → `/dashboard` (Dashboard) → `/builder` (Editor) → `/viewer` (Preview)

**Key features:**
- Landing page with sign-in modal (Supabase auth: email/Google)
- Dashboard with course management, data overview, and income/comments cards
- Drag-and-drop block editor with searchable categorized module panel
- Block selection + property editing
- JSON export/import and AI course generation (Gemini)
- Code playground (stubbed execution)

**Source layout:**
```
Builder/lib/
├── app/                         # GoRouter navigation
├── features/landing/            # Landing page + sign-in modal
├── features/dashboard/          # Course management dashboard
├── features/builder/            # Block editor UI
├── features/viewer/             # In-app preview
├── models/                      # Course schema (Riverpod)
├── providers/                   # State management
├── services/                    # Supabase, AI, export/import
└── widgets/                     # Panels, canvas, blocks
```

## Viewer Overview

**Key features:**
- Home, search, courses, lesson, profile screens
- Interactive components (sliders, feedback, animations)
- Local persistence and basic services
- Light and dark theme support

**Source layout:**
```
Viewer/lib/
├── components/                  # UI components
├── models/                      # Data models
├── providers/                   # State management (Provider)
├── screens/                     # App screens
├── services/                    # App services
└── theme/                       # Design system
```

## Docs Index

| File | Purpose |
|------|---------|
| `docs/prd.md` | Product Requirements Document |
| `docs/database-schema.md` | PostgreSQL table design |
| `docs/course-json-guide.md` | Course JSON authoring guide |
| `docs/dashboard.md` | Dashboard architecture |
| `docs/test-checklist.md` | MVP manual test checklist |
| `docs/changelog.md` | Change log |
| `docs/todo.md` | Task backlog |

## Contributing

Contributions are welcome. Open issues or submit PRs with clear descriptions.

## License

See `Viewer/LICENSE` for the current license file.

## Acknowledgments

- Design inspiration: Brilliant.org
- Built with Flutter
