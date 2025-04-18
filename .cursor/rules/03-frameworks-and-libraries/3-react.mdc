---
description: Apply React standards for component structure, separation of concerns, state management, and accessibility when developing with React in `apps/frontend`.
globs: apps/frontend/**/*.tsx
alwaysApply: false
---

Component Structure:
- Use functional components.
- Keep components light and small.
- Strongly type `props`.

Separation:
- Split into sub-components by responsibility.
- Move shared components outside the parent folder.
- Create private sub-components for single use.
- Follow smart/dumb component pattern.

State:
- Delegate state and logic to a smart component.
- Declare calculated variables at the top (dumb component).
- Place `displayName` at the bottom of the file.
- Do not use default export.
- Return `null` if mandatory props are missing.
- One component per file (except tiny private components).

Style and Accessibility:
- Think mobile-first.
- Use existing UI components.
- Use semantic HTML elements.
- Add appropriate ARIA attributes.
- Ensure keyboard navigation.
