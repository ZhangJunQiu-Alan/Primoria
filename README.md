# Primoria

Primoria is a two-part Flutter system for building and consuming interactive STEM courses.

- **Builder**: a Flutter Web authoring tool to compose courses via drag-and-drop blocks and export JSON.
- **Viewer**: a Flutter Web learning experience inspired by Brilliant.org to consume course content and run interactive lessons.

This repository contains both apps plus the shared course schema and product docs.

## Screenshots

<!-- Add screenshots here -->

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

### Key Concepts
- **Course Schema**: `Course → Pages → Blocks`, with metadata + settings. Defined in Builder models and exported as JSON.
- **Blocks**: `text`, `image`, `code-block`, `code-playground`, `multiple-choice` (plus planned types).
- **Flow**: Builder creates → validates → exports JSON → Viewer renders and previews.
- **Storage**: Builder uses local persistence (SharedPreferences) and supports JSON export for sharing.

## Repository Layout

```
Primoria/
├── Builder/                     # Course authoring app (Flutter Web)
├── Viewer/                      # Learning app (Flutter Web)
├── STEM-Course-Builder-PRD.md   # Product requirements doc
├── todolist.md                  # Builder task tracking & progress
└── README.md                    # This file
```

## Environment Setup

### Prerequisites
- **Flutter SDK**: 3.35.0 or higher
- **Dart SDK**: 3.9.0 or higher
- **IDE**: VS Code with Flutter extension or Android Studio with Flutter plugin

### Installation

1. **Install Flutter**

   Follow the official Flutter installation guide for your operating system:
   - [Windows](https://docs.flutter.dev/get-started/install/windows)
   - [macOS](https://docs.flutter.dev/get-started/install/macos)
   - [Linux](https://docs.flutter.dev/get-started/install/linux)

2. **Verify Installation**

   ```bash
   flutter doctor
   ```

   Ensure all checkmarks are green (or address any issues shown).

3. **Clone the Repository**

   ```bash
   git clone https://github.com/ZhangJunQiu-Alan/primoria.git
   cd primoria
   ```

4. **Install Dependencies**

   ```bash
   cd Builder
   flutter pub get
   cd ../Viewer
   flutter pub get
   ```

5. **Run the Apps**

   ```bash
   # Builder (Flutter Web)
   cd Builder
   flutter run -d chrome

   # Viewer (Flutter Web)
   cd ../Viewer
   flutter run -d chrome
   ```

## Builder Overview

```bash
cd Builder
flutter pub get
flutter run -d chrome
```

### Viewer (Flutter Web)

```bash
cd Viewer
flutter pub get
flutter run -d chrome
```

**Key features:**
- Drag-and-drop blocks onto a canvas
- Block selection + property editing
- Multi-page course editing
- JSON export (Course schema)
- Code playground (stubbed execution)

**Primary paths:**
```
Builder/lib/
├── features/builder/            # Builder UI
├── features/viewer/             # In-app preview
├── models/                      # Course schema
├── providers/                   # Riverpod state
├── services/                    # Export/storage/utils
└── widgets/                     # Panels, canvas, blocks
```

## Viewer Overview

**Key features (current):**
- Home, search, courses, lesson, profile screens
- Interactive components (sliders, feedback, animations)
- Local persistence and basic services

**Primary paths:**
```
Viewer/lib/
├── components/                  # UI components
├── models/                      # Data models
├── providers/                   # State management
├── screens/                     # App screens
├── services/                    # App services
└── theme/                       # Design system
```

## Project Structure

### Viewer Structure

```
lib/
├── main.dart                 # App entry point
├── components/               # Reusable UI components
│   ├── common/              # Common widgets (bottom nav, etc.)
│   ├── course/              # Course-related components
│   ├── feedback/            # Feedback dialogs
│   ├── game/                # Game container components
│   ├── home/                # Home screen components
│   └── interactions/        # Interactive elements (slider, etc.)
├── models/                   # Data models
├── providers/                # State management (Provider)
├── screens/                  # App screens
├── services/                 # Business logic services
└── theme/                    # App theming (colors, typography, etc.)
```

## Dependencies (Viewer)

| Package | Version | Purpose |
|---------|---------|---------|
| provider | ^6.1.1 | State management |
| shared_preferences | ^2.2.2 | Local data persistence |
| sqflite | ^2.3.0 | SQLite database |
| lottie | ^3.1.0 | Lottie animations |
| confetti | ^0.7.0 | Celebration effects |
| audioplayers | ^6.0.0 | Sound effects |
| flutter_local_notifications | ^17.0.0 | Local notifications |
| intl | ^0.19.0 | Internationalization |
| uuid | ^4.2.1 | UUID generation |

## Completed Features (Viewer)

### UI/UX Design
- [x] Brilliant-style design system
- [x] Light and dark theme support
- [x] Custom color palette with gradients
- [x] Consistent typography system
- [x] Spacing and radius constants
- [x] Shadow presets

### Screens
- [x] **Home Screen** - Daily challenge, continue learning, course recommendations
- [x] **Search Screen** - Category browsing, course discovery, search functionality
- [x] **Courses Screen** - Course list with filtering tabs (All, In Progress, Completed, Favorites)
- [x] **Course Detail Screen** - Learning path visualization with chapter nodes
- [x] **Lesson Screen** - Interactive lesson content with multiple question types
- [x] **Profile Screen** - User stats, achievements, streak display, settings
- [x] **Login Screen** - Email/password authentication with registration

### Components
- [x] Bottom navigation bar with animated active state
- [x] Daily challenge card
- [x] Streak widget (standard and large variants)
- [x] Course cards with progress indicators
- [x] Chapter nodes for learning path visualization
- [x] Interactive slider component
- [x] Feedback dialog with success/failure animations
- [x] Game container for lesson interactions
- [x] Course header with stats

### Services
- [x] **Storage Service** - Local data persistence with SharedPreferences
- [x] **Audio Service** - Sound effects for interactions
- [x] **Notification Service** - Daily reminder notifications

### State Management
- [x] **User Provider** - User authentication state, profile data, progress tracking
- [x] **Theme Provider** - Theme mode management (light/dark/system)

## Roadmap / TODO

### Builder
- [ ] Import workflow
- [ ] Block reorder/insert refinement
- [ ] More block types
- [ ] Robust schema validation

### Viewer
- [ ] RESTful API integration
- [ ] User authentication with JWT
- [ ] Cloud data synchronization
- [ ] Real-time progress updates

### Content & Curriculum
- [ ] Course content management system
- [ ] Multiple subject categories (Math, Science, Logic, etc.)
- [ ] Difficulty levels
- [ ] Prerequisites and learning paths

### Interactive Elements
- [ ] Multiple choice questions
- [ ] Drag and drop interactions
- [ ] Drawing canvas
- [ ] Code editor for programming courses
- [ ] 3D visualizations

### Gamification
- [ ] Achievement system with badges
- [ ] Leaderboards
- [ ] XP and leveling system
- [ ] Daily/weekly challenges
- [ ] Streak rewards

### Social Features
- [ ] User profiles
- [ ] Friends and following
- [ ] Course discussions
- [ ] Share progress on social media

### Additional Features
- [ ] Push notifications
- [ ] Offline mode with content caching
- [ ] Analytics and learning insights
- [ ] Accessibility improvements
- [ ] Multi-language support (i18n)
- [ ] Onboarding tutorial
- [ ] Subscription/payment integration

### Performance & Quality
- [ ] Unit tests
- [ ] Widget tests
- [ ] Integration tests
- [ ] Performance optimization
- [ ] Error tracking and reporting

## Contributing

Contributions are welcome. Open issues or submit PRs with clear descriptions.

## License

See `Viewer/LICENSE` for the current license file.

## Acknowledgments

- Design inspiration: Brilliant.org
- Built with Flutter
