# Builder MVP Manual Test Checklist

> This checklist is for validating Builder MVP functionality and ensuring the core flow works.

---

## 1. Basic Startup

- [ ] `flutter run -d chrome` starts successfully
- [ ] Builder home page loads with the three-column layout
- [ ] Left module panel shows all module types
- [ ] Canvas shows the empty-state prompt
- [ ] Right properties panel shows "No module selected"

---

## 2. Drag-and-Drop and Module Instantiation

### 2.1 Text Module
- [ ] Drag "Text" from the left panel to the canvas
- [ ] Canvas creates a text module instance
- [ ] Module shows default text content

### 2.2 Image Module
- [ ] Drag "Image" from the left panel to the canvas
- [ ] Canvas creates an image module instance
- [ ] Module shows a placeholder icon

### 2.3 Code Block Module
- [ ] Drag "Code Block" from the left panel to the canvas
- [ ] Canvas creates a code block instance
- [ ] Module shows the language label and default code

### 2.4 Code Playground Module
- [ ] Drag "Code Playground" from the left panel to the canvas
- [ ] Canvas creates a code playground module instance
- [ ] Module shows the editor and Run button

### 2.5 Multiple Choice Module
- [ ] Drag "Multiple Choice" from the left panel to the canvas
- [ ] Canvas creates a multiple choice instance
- [ ] Module shows the question and options

---

## 3. Selection and Property Editing

### 3.1 Module Selection
- [ ] Click a module on the canvas, selection highlight appears
- [ ] Right properties panel shows that module's properties
- [ ] Click empty space or another module to deselect/switch

### 3.2 Text Module Properties
- [ ] Select a text module
- [ ] Edit text content in the properties panel
- [ ] Canvas updates in real time
- [ ] Change alignment, canvas reflects it
- [ ] Change spacing, canvas reflects it

### 3.3 Image Module Properties
- [ ] Select an image module
- [ ] Enter image URL in the properties panel
- [ ] Canvas displays the network image

### 3.4 Code Playground Properties
- [ ] Select a code playground module
- [ ] Edit initial code
- [ ] Edit expected output
- [ ] Edit code directly in the canvas, content is written back to the block

---

## 4. Code Playground Run

- [ ] Enter `print("Hello")` in the code playground module
- [ ] Click "Run"
- [ ] Output area shows `Hello`
- [ ] If expected output is set, show "Correct" or "Try again"

---

## 5. Module Ordering and Deletion

### 5.1 Ordering
- [ ] Drag the module handle to reorder
- [ ] Canvas renders modules in the new order

### 5.2 Deletion
- [ ] Click the delete button in the module header
- [ ] Module is removed from the canvas
- [ ] Properties panel returns to "No module selected"

---

## 6. Page Management

### 6.1 Page Switching
- [ ] Bottom page bar shows the current page
- [ ] Click another page tab to switch
- [ ] Canvas shows that page's modules

### 6.2 Add Page
- [ ] Click the "+" button to add a new page
- [ ] Page bar adds a new tab
- [ ] Automatically switches to the new page

### 6.3 Rename Page
- [ ] Double-click a page tab
- [ ] Rename dialog appears
- [ ] After change, the page title updates

### 6.4 Delete Page
- [ ] Long-press a page tab
- [ ] Select "Delete page"
- [ ] Confirm to remove the page

---

## 7. Course Info

- [ ] Click the course title at the top
- [ ] Edit dialog appears
- [ ] Title updates after changes
- [ ] Unsaved indicator (yellow dot) appears

---

## 8. JSON Export

- [ ] Click the top "Export" button
- [ ] Validate pre-export checks (title, pages)
- [ ] Download JSON file
- [ ] JSON format is correct and includes all pages and modules

---

## 9. Preview

- [ ] Click the top "Preview" button
- [ ] Navigate to Viewer page
- [ ] Viewer shows current course content
- [ ] Click back to return to Builder

---

## 10. Performance and Stability

### 10.1 Large Course Rendering
- [ ] Create 10+ pages
- [ ] Add 5+ modules per page
- [ ] Page switching is smooth
- [ ] No noticeable jank

### 10.2 Frequent Dragging
- [ ] Rapidly drag modules repeatedly
- [ ] Rapidly reorder
- [ ] No errors or crashes

---

## Test Results

| Date | Tester | Passed | Failed | Notes |
|------|--------|--------|--------|------|
|      |        |        |        |      |

---

## Known Issues

1. Builder text blocks do not render Markdown (Viewer does)
2. Import feature is not implemented yet
