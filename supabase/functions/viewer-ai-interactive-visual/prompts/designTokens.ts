export const DESIGN_TOKEN_CSS = `
:root {
  color-scheme: light;
  --color-background-primary: #f6f3ef;
  --color-background-secondary: #ffffff;
  --color-background-muted: #f8f5f0;
  --color-surface-elevated: #ffffff;
  --color-border-subtle: #ded6cc;
  --color-border-strong: #c8bcae;
  --color-text-primary: #2f2a25;
  --color-text-secondary: #6f665e;
  --color-text-inverse: #ffffff;
  --color-accent-primary: #2563eb;
  --color-accent-secondary: #e4572e;
  --color-accent-success: #3f7f4f;
  --color-accent-warning: #d97706;
  --color-accent-danger: #b91c1c;
  --color-focus-ring: #2563eb;
  --shadow-sm: 0 1px 2px rgba(54, 42, 31, 0.06);
  --shadow-md: 0 10px 24px rgba(54, 42, 31, 0.08);
  --shadow-lg: 0 24px 48px rgba(54, 42, 31, 0.12);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 18px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --font-display: "Cormorant Garamond", ui-serif, Georgia, serif;
  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --duration-fast: 120ms;
  --duration-base: 220ms;
  --duration-slow: 400ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --color-background-primary: #15130f;
    --color-background-secondary: #1c1a16;
    --color-background-muted: #221f1a;
    --color-surface-elevated: #24211c;
    --color-border-subtle: #33302a;
    --color-border-strong: #4a4640;
    --color-text-primary: #f1ebe1;
    --color-text-secondary: #b8b0a4;
    --color-accent-primary: #7aa6ff;
    --color-accent-secondary: #ff8c5a;
    --shadow-md: 0 10px 24px rgba(0, 0, 0, 0.45);
    --shadow-lg: 0 24px 48px rgba(0, 0, 0, 0.55);
  }
}
`.trim();

export const DESIGN_TOKEN_GUIDE = `
Design tokens (CSS variables) injected into <head> at runtime. **In CSS** (inside <style> and inline style="..." attributes), use them for colors, radii, shadows, spacing, and typography — never hardcode hex colors in CSS, never declare your own font stack. **In JavaScript**, var(--…) is invalid syntax; use literal numbers/strings and read tokens via getComputedStyle when needed (see the JS rule in the system prompt).

Color tokens:
- var(--color-background-primary)    page background
- var(--color-background-secondary)  card surfaces
- var(--color-background-muted)      pills, subtle chips, hover surfaces
- var(--color-surface-elevated)      modals, popovers, highlighted cards
- var(--color-border-subtle)         hairline dividers
- var(--color-border-strong)         emphasised borders
- var(--color-text-primary)          body and headings
- var(--color-text-secondary)        captions, helper text
- var(--color-text-inverse)          text placed over accent fills
- var(--color-accent-primary)        main interactive accent (lines, sliders, buttons)
- var(--color-accent-secondary)      contrasting accent for emphasis or comparison
- var(--color-accent-success)        positive observation strip
- var(--color-accent-warning)        cautionary state
- var(--color-accent-danger)         negative state
- var(--color-focus-ring)            keyboard focus outline

Other tokens:
- var(--radius-sm | --radius-md | --radius-lg)
- var(--shadow-sm | --shadow-md | --shadow-lg)
- var(--space-1 ... --space-6)
- var(--font-display | --font-sans | --font-mono)
- var(--duration-fast | --duration-base | --duration-slow) with var(--ease-standard)

Light + dark mode swap automatically via prefers-color-scheme. Verify your visualization reads well in both.
`.trim();
