---
name: enterprise-ux-review
description: Use when the goal is to raise a product, page, or flow to a production-grade UX standard without losing functionality, especially for redesigns, premium polish, enterprise quality, or major frontend work.
---

# Enterprise UX Review

Use this skill when the user wants a stronger product feel, higher trust, better usability, or "big-company quality" rather than just feature parity.

Do not reduce the work to visual styling alone. Treat UX quality as the combination of clarity, interaction design, accessibility, responsiveness, perceived performance, error recovery, consistency, and operational confidence.

## Trigger Conditions

Use this skill when any of the following appears:

- The user asks for better UX, polish, premium feel, enterprise quality, or production-grade frontend work.
- A major UI flow is being built, migrated, redesigned, or unified.
- A screen already works functionally but feels weak, unclear, inconsistent, or fragile.
- The task touches navigation, forms, editors, dashboards, onboarding, settings, or other high-frequency workflows.

## Review Dimensions

Audit the experience across these dimensions:

1. Information hierarchy
   - Is the primary action obvious?
   - Is the layout easy to scan?
   - Are important decisions visually prioritized?
2. Interaction model
   - Are controls predictable?
   - Are actions reversible where appropriate?
   - Is feedback immediate and understandable?
3. State design
   - Cover loading, empty, error, success, disabled, and saving states.
   - Avoid silent failures or ambiguous in-progress behavior.
4. Accessibility
   - Keyboard access, focus visibility, contrast, labels, semantics, hit targets.
   - Do not treat accessibility as optional polish.
5. Responsiveness
   - Verify desktop and mobile behavior.
   - Preserve task completion, not just visual fit.
6. Perceived performance
   - Use skeletons, progressive disclosure, optimistic feedback, and smooth transitions only where they improve comprehension.
   - Avoid decorative motion that slows the task down.
7. Consistency and trust
   - Typography, spacing, component rules, copy tone, icon logic, confirmations, and destructive actions should feel systematic.
8. Product confidence
   - Consider validation, autosave, recovery paths, auditability, observability hooks, and rollout safety when relevant.

## Working Rules

- Preserve functionality first.
- Prefer clarity over novelty.
- Prefer systems over one-off tweaks.
- Prefer strong defaults over excessive configuration.
- Improve the user's sense of control, speed, and safety.
- If a visual idea harms legibility, discoverability, accessibility, or task completion, reject it.

## Required Output Format

When using this skill, structure the response like this:

### UX Assessment

- Briefly describe the current flow or surface.
- State the highest-impact UX weaknesses.

### Priority Improvements

- List the top 3 to 5 improvements.
- Rank them by user impact, implementation cost, and risk.

### Implementation Strategy

- Explain how to improve the experience without losing functionality.
- Call out any migration, compatibility, or rollout considerations.

### Validation Checklist

- Functional parity
- Loading, empty, error, success states
- Keyboard and accessibility checks
- Responsive behavior
- Performance or perceived performance checks

## Default Heuristics

- Forms should reduce ambiguity, not increase it.
- Dashboards should surface the next action clearly.
- Editors should make state and consequences visible.
- Settings should feel safe, understandable, and reversible.
- Empty states should guide the next step.
- Error states should explain what happened and what to do next.
- Microcopy should remove hesitation.
- Visual polish should support comprehension, not compete with it.

## Example Triggers

- "Make this dashboard feel like a mature SaaS product."
- "Upgrade this editor so it feels enterprise-grade."
- "Redesign this settings flow without removing any capability."
- "Keep the same features, but make the UX significantly better."
