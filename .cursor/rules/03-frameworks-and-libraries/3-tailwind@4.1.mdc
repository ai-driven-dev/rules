---
description: Apply Tailwind CSS v4.1 standards for modern CSS development, focusing on CSS-based configuration, updated utility/variant syntax, and removal of deprecated features when writing CSS or using Tailwind utilities in various frameworks.
globs: "**/*tailwind.css", "**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte"
alwaysApply: false
---

Configuration:
- Use CSS-based configuration in `tailwind.css`.

CSS Variables:
- Use CSS variables for theme values.
  - ✅ `var(--color-red-500)`
  - ❌ `theme(colors.red.500)`
- Use CSS variable names for media queries.
  - ✅ `theme(--breakpoint-xl)`
  - ❌ `theme(screens.xl)`

Custom Utilities:
- Register custom utilities with `@utility`.
```css
@utility btn {
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: ButtonFace;
}
```

Variants:
- Apply variants left-to-right.
  - ✅ `*:first:pt-0`
  - ❌ `first:*:pt-0`
- Use parentheses for arbitrary CSS variables.
  - ✅ `bg-(--brand-color)`
  - ❌ `bg-[--brand-color]`

Responsive Design:
- Scope hover styles with `@media (hover: hover)`.
- Avoid hover for critical functionality.

Component Frameworks (Vue/Svelte/CSS Modules):
- Import theme with `@reference`.
```css
@reference "../../app.css";
```
- Prefer direct CSS variables over `@apply`.
```css
/* ✅ Preferred */
h1 { color: var(--text-red-500); }

/* ❌ Avoid when possible */
h1 { @apply text-red-500; }
```

Removed Features:
- Avoid deprecated opacity utilities (`bg-black/50`).
  - ✅ `bg-black/50`
  - ❌ `bg-opacity-50`
- Avoid `@tailwind` directives (`@import "tailwindcss"`).
  - ✅ `@import "tailwindcss"`
  - ❌ `@tailwind base`
- Avoid JS config features (`corePlugins`, etc.).

Best Practices:
- Use modern CSS features (`@property`, `color-mix()`).
- Include outline colors for transitions.
```html
<button class="outline-cyan-500 transition hover:outline-2">
```
- Sort utilities by property count.
- Use CSS cascade layers for organization.
