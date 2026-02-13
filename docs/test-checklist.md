# Builder MVP Manual Test Checklist

## 1. Basic Startup

- [ ] `flutter run -d chrome` starts successfully
- [ ] Builder loads with three-column layout
- [ ] Left panel shows all module types
- [ ] Canvas shows empty-state prompt
- [ ] Right panel shows "No module selected"

## 2. Drag-and-Drop

- [ ] Drag Text → canvas creates text instance
- [ ] Drag Image → canvas creates image instance
- [ ] Drag Code Block → canvas creates code block
- [ ] Drag Code Playground → canvas creates playground with Run button
- [ ] Drag Multiple Choice → canvas creates quiz with options

## 3. Selection and Property Editing

- [ ] Click module → selection highlight + right panel shows properties
- [ ] Edit text content → canvas updates in real time
- [ ] Enter image URL → canvas displays image
- [ ] Import local image file in Image block → canvas displays imported image
- [ ] Edit code playground initial code / expected output

## 4. Code Playground Run

- [ ] Enter `print("Hello")` → Run → output shows `Hello`
- [ ] Enter `print(type(5))`, `print(type(3.0))`, `print(int(3.9))`, `print(round(3.9))` → Run → output shows `<class 'int'>`, `<class 'float'>`, `3`, `4` (line by line)
- [ ] With expected output set → shows "Correct" or "Try again"

## 5. Module Ordering and Deletion

- [ ] Drag handle to reorder → canvas updates order
- [ ] While dragging, insertion position is clearly shown with indicator line/placeholder
- [ ] Dragging near top/bottom edges auto-scrolls long block lists
- [ ] Click delete → module removed, panel resets

## 6. Course Info

- [ ] Click course title → edit dialog → title updates
- [ ] Unsaved indicator (yellow dot) appears after changes

## 7. JSON Export

- [ ] Export → validates title/pages → downloads JSON
- [ ] Export includes `$schema` and `schemaVersion` metadata
- [ ] JSON includes all pages and blocks

## 8. Schema Validation Gates

- [ ] Import invalid course JSON (e.g. `correctAnswers` contains unknown option id) → import is blocked and dialog shows field path (like `$.pages[0].blocks[0].content.correctAnswers[0]`)
- [ ] Import legacy unversioned / `0.9.x` JSON → migration runs before validation and import succeeds
- [ ] Import unsupported `schemaVersion` (e.g. `9.0.0`) → import is blocked with explicit migration error
- [ ] Save course with blocking schema errors → cloud save is blocked and dialog lists actionable field paths
- [ ] Publish course with blocking schema errors (e.g. empty quiz question) → publish is blocked and dialog lists field paths
- [ ] Save/import with warnings only (non-blocking) still succeeds and reports warning count

## 9. Preview

- [ ] Preview button → navigates to Viewer with current content
- [ ] Unsaved Builder edits survive Builder → Preview → Builder navigation for existing courses (`/builder?courseId=<id>`)
- [ ] After successful cloud Save, reopening Builder does not restore stale draft content
- [ ] For `visibilityRule: afterPreviousCorrect`, hidden blocks show true blank space (no lock placeholder) before unlock
- [ ] For chained blocks, if a preceding gated block is hidden, subsequent blocks remain hidden until the gated block is unlocked
- [ ] Multiple Choice: can switch between Single Select and Multi Select in PropertyPanel
- [ ] Multi Select question accepts multiple correct options and persists after refresh/export-import
- [ ] Multi Select validation is order-independent (`A+C` equals `C+A`) and requires exact set match
- [ ] Matching block: right column appears in shuffled order (not same as left)
- [ ] Matching block: tapping left then right creates a color-coded pair with numbered badge
- [ ] Matching block: tapping an already-paired item clears the pair (undo before submit)
- [ ] Matching block: after Check, both columns show green/red borders and check/cross icons
- [ ] Matching block in Builder canvas: left and right items show circled pair numbers

## 10. Auth & Routing

- [ ] `/dashboard` while logged out → redirects to `/`
- [ ] `/builder` while logged out → redirects to `/`
- [ ] Login on landing → auto-redirects to `/dashboard`
- [ ] Sign out from avatar → redirects to `/`

## 11. Dashboard — Home Page

- [ ] Course Data, Income Overview, Comments cards visible
- [ ] Cards render on both wide and narrow screens
- [ ] Avatar circle in top-right corner

## 12. Dashboard — Course Manage

- [ ] Shows loading spinner → course list
- [ ] Not logged in → sign-in prompt
- [ ] No courses → empty state with Create Course button
- [ ] Course cards: title, time ago, lesson boxes
- [ ] Sort dropdown: 3 options (time/student/comments)
- [ ] Edit → `/builder?courseId=<id>`
- [ ] Delete → confirmation → deletes and refreshes
- [ ] Add lesson → `/builder?courseId=<id>`
- [ ] Create Course → `/builder`

## 13. User Avatar

- [ ] Visible on Dashboard and Builder (blue circle)
- [ ] Logged in → popup menu (Profile/Dashboard/Sign out)
- [ ] Logged out → opens sign-in dialog
- [ ] OAuth users show profile photo

## 14. Builder — Course Loading

- [ ] `/builder` → blank new course
- [ ] `/builder?courseId=<id>` → loads existing course

## Known Issues

1. Builder text blocks do not render Markdown (Viewer does)
2. Sort by student/comments are placeholders
3. Data Center / Fans Manage tabs are placeholders
4. "Learned X times" shows lesson count, not learner count
