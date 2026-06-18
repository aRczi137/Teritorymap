# Implementation Plan: Territory Map Branding

## Overview

Rebrand the TerritoryMap application from its generic blue/gray Tailwind scheme to ArcBot's purple-and-orange dual-accent dark theme. The implementation proceeds in three layers: configuration (Tailwind tokens), base stylesheet (fonts, CSS custom properties, utility classes), then component-level class/style migration across all `.tsx` files.

## Tasks

- [x] 1. Configure Tailwind brand tokens
  - [x] 1.1 Add brand color tokens to tailwind.config.js
    - Extend `theme.extend.colors` with `accent` (orange, purple), `brand` (primary + shades), `surface` (bg, card, hover, border), and `text` (emphasis, muted) objects
    - Extend `theme.extend.fontFamily.sans` with Inter as first entry followed by fallback stack
    - Ensure `theme.extend` is used so default Tailwind utilities remain available
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Set up base stylesheet and fonts
  - [x] 2.1 Add Google Fonts import and CSS custom properties to src/index.css
    - Add `@import url(...)` for Inter font (weights 400, 500, 600, 700) with `display=swap`
    - Add `:root` block with CSS custom properties for all Brand_Palette and Surface_Colors
    - Set `body` background (#111118), text color (#f0f0f5), and font-family (Inter + fallbacks)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Add .btn-primary and .gradient-text utility classes to src/index.css
    - Define `.btn-primary` with Brand_Gradient background and hover:opacity-90 with 150ms transition
    - Define `.gradient-text` with background-clip text gradient fill
    - _Requirements: 2.5, 2.6_

- [x] 3. Checkpoint - Verify configuration builds successfully
  - Ensure `npm run build` completes without errors, ask the user if questions arise.

- [x] 4. Migrate AllianceMapManager.tsx
  - [x] 4.1 Replace background and border classes in AllianceMapManager.tsx
    - Replace `bg-gray-900` → `bg-surface-bg`, `bg-gray-800` → `bg-surface-card`, `bg-gray-700` → `bg-surface-hover`
    - Replace `border-gray-700` → `border-surface-border`
    - Replace inline color values: `#1a1a2e` → `#1a1a24`, `#2a2a4a` → `#2a2a3a`
    - Replace `rgba(15,15,30,0.92)` → `rgba(17,17,24,0.92)` and `rgba(15,15,30,0.88)` → `rgba(17,17,24,0.88)`
    - Apply replacements inside conditional/ternary expressions where gray classes appear
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 4.2 Replace button and interactive element classes in AllianceMapManager.tsx
    - Replace `bg-blue-600 hover:bg-blue-700` → `bg-gradient-to-r from-accent-orange to-accent-purple hover:opacity-90` on Add alliance and mobile menu buttons
    - Replace `border-blue-500` → `border-accent-purple` for active selection borders
    - Replace `focus:ring-indigo-*` and `focus:ring-gray-*` → `focus:ring-accent-purple` (preserve semantic error/warning rings)
    - Replace `hover:border-gray-600`/`hover:border-gray-500` → `hover:border-[rgba(155,48,255,0.4)]`
    - Replace active alliance highlight `bg-gray-750` → `bg-[rgba(155,48,255,0.1)]` (card and mobile indicator)
    - _Requirements: 3.1, 3.2, 3.4, 4.1, 4.3, 4.4, 8.1, 8.3_

  - [x] 4.3 Replace text colors and apply gradient headings in AllianceMapManager.tsx
    - Replace `text-gray-400` and `text-gray-300` → `text-text-muted`
    - Replace `text-blue-400` for active labels → `text-brand-primary-light`
    - Replace creator name `text-blue-400` → `text-accent-orange` (preserving font-weight)
    - Replace Discord username `text-purple-400` → `text-accent-purple` (preserving font-weight)
    - Apply `gradient-text` class to "Alliance Map Manager" title, "Territory Map" tab heading, and "Hive Builder" tab heading
    - _Requirements: 6.1, 6.2, 4.2, 9.1, 9.2, 10.1, 10.2, 10.3_

- [x] 5. Migrate FrankensteinEventTab.tsx
  - [x] 5.1 Replace inline styles and Tailwind classes in FrankensteinEventTab.tsx
    - Replace inline border `#2a2a4a` and `#3a3a5a` → `#2a2a3a`
    - Replace inline background `rgba(15,15,30,0.92)` → `rgba(17,17,24,0.92)` and `#1a1a2e` → `#1a1a24`
    - Replace tool button classes: `bg-gray-700 hover:bg-gray-600` → `bg-surface-hover hover:bg-surface-hover/80`
    - Replace tool button border classes: `border-gray-600 hover:border-gray-500` → `border-surface-border hover:border-[rgba(155,48,255,0.4)]`
    - Replace `bg-gray-800` → `bg-surface-card`, `border-gray-700` → `border-surface-border`
    - Replace `focus:ring-indigo-*`/`focus:ring-gray-*` → `focus:ring-accent-purple`
    - Replace `text-gray-400` → `text-text-muted`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 5.2, 5.3, 8.1, 6.1_

- [x] 6. Migrate ControlsBar.tsx
  - [x] 6.1 Replace classes in ControlsBar.tsx
    - Replace Export button: `bg-indigo-600 hover:bg-indigo-500/700` → `bg-gradient-to-r from-accent-orange to-accent-purple hover:opacity-90`
    - Replace `border-indigo-*` and `hover:border-indigo-*` → `border-accent-purple hover:border-accent-orange`
    - Replace reset button background/border classes to brand surface colors
    - Replace input border/focus classes: `focus:ring-indigo-*` → `focus:ring-accent-purple`
    - Replace `bg-gray-800` → `bg-surface-card`, `border-gray-700` → `border-surface-border`
    - Replace `hover:border-indigo-400` → `hover:border-accent-purple`
    - _Requirements: 3.3, 3.4, 5.2, 5.3, 8.1, 8.4_

- [x] 7. Migrate PlayerListPanel.tsx
  - [x] 7.1 Replace classes in PlayerListPanel.tsx
    - Replace input focus borders: `focus:ring-indigo-*`/`focus:ring-gray-*` → `focus:ring-accent-purple`
    - Replace button background/hover classes to brand gradient or surface colors
    - Replace `bg-gray-800` → `bg-surface-card`, `bg-gray-900` → `bg-surface-bg`
    - Replace `border-gray-700` → `border-surface-border`
    - Replace `text-gray-400` → `text-text-muted`
    - _Requirements: 8.1, 5.1, 5.2, 5.3, 6.1_

- [x] 8. Migrate AvailablePanel.tsx and ResetModal.tsx
  - [x] 8.1 Replace classes in AvailablePanel.tsx
    - Replace panel `bg-gray-800` → `bg-surface-card`
    - Replace header `bg-gray-800`/`bg-gray-900` → `bg-surface-card`/`bg-surface-bg`
    - Replace `border-gray-700` → `border-surface-border`
    - Replace `text-gray-400` → `text-text-muted`
    - _Requirements: 5.1, 5.2, 5.3, 6.1_

  - [x] 8.2 Replace classes in ResetModal.tsx
    - Replace card `bg-gray-800` → `bg-surface-card`
    - Replace `border-gray-700` → `border-surface-border`
    - Replace any button classes to use brand gradient or surface colors
    - Replace `focus:ring-*` to `focus:ring-accent-purple` where applicable
    - _Requirements: 5.2, 5.3, 8.1_

- [x] 9. Final checkpoint - Verify build and visual correctness
  - Ensure `npm run build` completes without errors, ask the user if questions arise.
  - Verify no remaining `bg-blue-600`, `bg-indigo-600`, or `border-blue-500` classes outside semantic/error contexts.
  - Confirm all primary buttons display orange-to-purple gradient, surfaces use brand colors, and Inter font is active.

## Notes

- This feature is purely visual — no runtime logic, state, or API changes
- All replacements are deterministic one-to-one substitutions per the Color Migration Reference in the design document
- Semantic color classes for errors/warnings (e.g., `focus:ring-red-400`, `border-red-500`) must be preserved unchanged
- `theme.extend` is used (not `theme` override) so all default Tailwind utilities remain available
- The `display=swap` font strategy ensures text remains visible during Inter font loading
- No property-based tests apply — testing is via build verification and visual inspection

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["4.1", "5.1", "6.1", "7.1", "8.1", "8.2"] },
    { "id": 4, "tasks": ["4.2"] },
    { "id": 5, "tasks": ["4.3"] }
  ]
}
```
