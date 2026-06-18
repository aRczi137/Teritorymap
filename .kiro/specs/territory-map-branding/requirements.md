# Requirements Document

## Introduction

This specification defines the visual rebranding of the TerritoryMap application to align with the ArcBot brand identity. The rebranding replaces the current generic blue/gray Tailwind color scheme with ArcBot's purple-and-orange dual-accent dark theme, introduces the Inter font family, applies the signature orange-to-purple gradient for primary actions, and establishes a consistent design language across all UI surfaces.

## Glossary

- **TerritoryMap_App**: The React + TypeScript + Vite + Tailwind application located at `c:\Users\arek\Desktop\ArcBot\Teritorymap` that provides alliance territory mapping and hive building tools.
- **Tailwind_Config**: The `tailwind.config.js` file that defines custom theme extensions and brand color tokens for the TerritoryMap_App.
- **Index_CSS**: The `src/index.css` file that defines base styles, CSS custom properties, and font imports for the TerritoryMap_App.
- **Brand_Palette**: The ArcBot dual-accent color system consisting of accent-orange (#FF6B2C) and accent-purple (#9B30FF), with purple shades: primary-dark (#8a1ef0), primary-darker (#7f14e6), primary-darkest (#6810bd), primary-light (#a94aff), primary-lighter (#b35fff), and primary-lightest (#c685ff).
- **Brand_Gradient**: The signature ArcBot gradient applied as `bg-gradient-to-r from-accent-orange to-accent-purple`, used on primary action buttons and highlight elements.
- **Surface_Colors**: The ArcBot background hierarchy: background (#111118), surface (#1a1a24), surface-hover (#22222e), and border (#2a2a3a).
- **Component_Files**: All `.tsx` files in `src/` that contain inline Tailwind class names or inline style objects defining colors, backgrounds, or borders.

## Requirements

### Requirement 1: Tailwind Configuration Brand Tokens

**User Story:** As a developer, I want the Tailwind configuration to define ArcBot brand color tokens, so that all components can reference brand-consistent colors by semantic name.

#### Acceptance Criteria

1. THE Tailwind_Config SHALL define a `colors.accent` object within `theme.extend` containing keys `orange` (#FF6B2C) and `purple` (#9B30FF), preserving all default Tailwind color utilities.
2. THE Tailwind_Config SHALL define a `colors.brand` object within `theme.extend` containing keys `primary` (#9B30FF), `primary-dark` (#8a1ef0), `primary-darker` (#7f14e6), `primary-darkest` (#6810bd), `primary-light` (#a94aff), `primary-lighter` (#b35fff), and `primary-lightest` (#c685ff).
3. THE Tailwind_Config SHALL define a `colors.surface` object within `theme.extend` containing keys `bg` (#111118), `card` (#1a1a24), `hover` (#22222e), and `border` (#2a2a3a).
4. THE Tailwind_Config SHALL define a `colors.text` object within `theme.extend` containing keys `emphasis` (#f0f0f5) and `muted` (#8888a0).
5. THE Tailwind_Config SHALL define `fontFamily.sans` within `theme.extend` as an array with `'Inter'` as the first entry followed by the default sans-serif fallback stack (`ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`).
6. IF a component references a default Tailwind color utility class (e.g., `bg-gray-900`, `text-white`), THEN THE Tailwind_Config SHALL still resolve that class correctly alongside the brand tokens.

### Requirement 2: Base Stylesheet and Font Setup

**User Story:** As a user, I want the application to use the Inter font and ArcBot's dark background, so that the visual identity feels consistent with the ArcBot ecosystem.

#### Acceptance Criteria

1. THE Index_CSS SHALL import the Inter font from Google Fonts with weights 400, 500, 600, and 700 and with `display=swap` to ensure text remains visible during font loading.
2. THE Index_CSS SHALL define CSS custom properties under the `:root` selector for each color in the Brand_Palette (`--accent-orange`, `--accent-purple`, `--brand-primary-dark`, `--brand-primary-darker`, `--brand-primary-darkest`, `--brand-primary-light`, `--brand-primary-lighter`, `--brand-primary-lightest`) and each color in the Surface_Colors (`--surface-bg`, `--surface-card`, `--surface-hover`, `--surface-border`), with values matching their glossary-defined hex codes.
3. THE Index_CSS SHALL set the `body` background color to #111118 and text color to #f0f0f5.
4. THE Index_CSS SHALL set the base font-family to `'Inter', system-ui, -apple-system, sans-serif`.
5. THE Index_CSS SHALL define a `.btn-primary` utility class that applies the Brand_Gradient (`bg-gradient-to-r from-accent-orange to-accent-purple`) and on hover reduces opacity to 0.9 with a transition duration of 150ms.
6. THE Index_CSS SHALL define a `.gradient-text` utility class that applies the Brand_Gradient as a text fill using `bg-clip-text text-transparent`.

### Requirement 3: Primary Action Button Gradient Migration

**User Story:** As a user, I want primary action buttons to use the ArcBot orange-to-purple gradient, so that the app visually matches the ArcBot brand's signature look.

#### Acceptance Criteria

1. WHEN the "Add alliance" button in AllianceMapManager currently uses `bg-blue-600 hover:bg-blue-700`, THE TerritoryMap_App SHALL replace those classes with the Brand_Gradient classes (`bg-gradient-to-r from-accent-orange to-accent-purple hover:opacity-90`).
2. WHEN the mobile menu toggle button in AllianceMapManager uses `bg-blue-600 hover:bg-blue-700`, THE TerritoryMap_App SHALL replace those classes with the Brand_Gradient classes (`bg-gradient-to-r from-accent-orange to-accent-purple hover:opacity-90`).
3. WHEN an "Export PNG" or "Export" button in any Component_File uses `bg-indigo-600` with `hover:bg-indigo-500` or `hover:bg-indigo-700`, THE TerritoryMap_App SHALL replace the background and hover classes with the Brand_Gradient classes (`bg-gradient-to-r from-accent-orange to-accent-purple hover:opacity-90`) and replace any accompanying `border-indigo-*` and `hover:border-indigo-*` classes with `border-accent-purple hover:border-accent-orange`.
4. WHEN a migrated button has a `focus:ring-indigo-*` class, THE TerritoryMap_App SHALL replace it with `focus:ring-accent-purple`.

### Requirement 4: Secondary Interactive Element Color Migration

**User Story:** As a user, I want secondary interactive elements like active tabs and selection states to use the brand purple, so that the hierarchy of interaction states is consistent with ArcBot's design language.

#### Acceptance Criteria

1. WHEN a component uses `border-blue-500` for active/selected state indication (excluding focus ring indicators covered by Requirement 8), THE TerritoryMap_App SHALL replace that class with `border-accent-purple`.
2. WHEN a component uses `text-blue-400` for highlighted active labels or contextual emphasis text (excluding creator attribution handled by Requirement 9), THE TerritoryMap_App SHALL replace that class with `text-brand-primary-light`.
3. WHEN the active alliance card uses `bg-gray-750` as highlight background, THE TerritoryMap_App SHALL replace that with `bg-[rgba(155,48,255,0.1)]` to use a brand purple highlight.
4. WHEN the mobile-only active alliance indicator bar uses `bg-gray-750` as its background, THE TerritoryMap_App SHALL replace that with `bg-[rgba(155,48,255,0.1)]` to match the active alliance card highlight style.

### Requirement 5: Background and Surface Color Migration

**User Story:** As a user, I want the app backgrounds to use ArcBot's dark theme colors, so that the visual depth and hierarchy match the brand.

#### Acceptance Criteria

1. WHEN a component uses the Tailwind class `bg-gray-900`, THE TerritoryMap_App SHALL replace all occurrences of that class with `bg-surface-bg`, regardless of the element's role.
2. WHEN a component uses the Tailwind class `bg-gray-800`, THE TerritoryMap_App SHALL replace all occurrences of that class with `bg-surface-card`, regardless of whether the element is a card, panel, container, or other surface.
3. WHEN a component uses the Tailwind class `border-gray-700`, THE TerritoryMap_App SHALL replace all occurrences of that class with `border-surface-border`.
4. WHEN a component uses the Tailwind class `bg-gray-700`, THE TerritoryMap_App SHALL replace all occurrences of that class with `bg-surface-hover`.
5. WHEN inline style objects in Component_Files use the background color `#1a1a2e`, THE TerritoryMap_App SHALL replace that value with `#1a1a24`.
6. WHEN inline style objects in Component_Files use the border or background color `#2a2a4a`, THE TerritoryMap_App SHALL replace that value with `#2a2a3a`.
7. WHEN inline style objects in Component_Files use the background color `rgba(15,15,30,0.92)` or `rgba(15,15,30,0.88)`, THE TerritoryMap_App SHALL replace those values with `rgba(17,17,24,0.92)` and `rgba(17,17,24,0.88)` respectively.
8. WHEN Tailwind class replacements in criteria 1–4 appear inside conditional expressions (e.g., ternary operators selecting between active and inactive states), THE TerritoryMap_App SHALL apply the same replacement to each branch where the target gray class appears.

### Requirement 6: Text Color Consistency

**User Story:** As a user, I want text colors to follow ArcBot's text hierarchy, so that readability and visual contrast are consistent.

#### Acceptance Criteria

1. WHEN a component uses `text-gray-400` for secondary descriptive text, THE TerritoryMap_App SHALL replace that class with `text-text-muted`.
2. WHEN a component uses `text-gray-300` for slightly emphasized secondary text, THE TerritoryMap_App SHALL replace that class with `text-text-muted`.
3. WHEN a component uses `text-white` for high-emphasis content, THE TerritoryMap_App SHALL retain `text-white` or use `text-text-emphasis` for maximum readability.

### Requirement 7: Frankenstein Tab Brand Alignment

**User Story:** As a user, I want the Hive Builder tab to use the same ArcBot brand colors, so that both tabs feel like parts of the same application.

#### Acceptance Criteria

1. WHEN inline style objects in the FrankensteinEventTab use the border color `#2a2a4a` or `#3a3a5a`, THE TerritoryMap_App SHALL replace those with the brand border color `#2a2a3a`.
2. WHEN inline style objects in the FrankensteinEventTab use the background color `rgba(15,15,30,0.92)` or `#1a1a2e`, THE TerritoryMap_App SHALL replace `rgba(15,15,30,0.92)` with `rgba(17,17,24,0.92)` and `#1a1a2e` with `#1a1a24`.
3. WHEN the FrankensteinEventTab tool buttons use `bg-gray-700 hover:bg-gray-600` for background classes, THE TerritoryMap_App SHALL replace those with `bg-surface-hover hover:bg-surface-hover/80`.
4. WHEN the FrankensteinEventTab tool buttons use `border-gray-600 hover:border-gray-500` for border classes, THE TerritoryMap_App SHALL replace those with `border-surface-border hover:border-[rgba(155,48,255,0.4)]`.

### Requirement 8: Focus and Highlight States

**User Story:** As a user, I want focus rings and highlighted states to use the brand purple, so that keyboard navigation and selection states look intentional.

#### Acceptance Criteria

1. WHEN a component uses `focus:ring-indigo-400`, `focus:ring-indigo-500`, `focus:ring-gray-400`, or `focus:ring-gray-500` for focus indicators, THE TerritoryMap_App SHALL replace those with `focus:ring-accent-purple`.
2. IF a component uses `focus:ring-red-400`, `focus:ring-red-500`, or `focus:ring-amber-400` for semantic error or warning focus indicators, THEN THE TerritoryMap_App SHALL retain those classes unchanged.
3. WHEN hover states on cards or interactive elements use `hover:border-gray-600` or `hover:border-gray-500`, THE TerritoryMap_App SHALL replace those with `hover:border-[rgba(155,48,255,0.4)]` to match ArcBot's feature card hover pattern.
4. WHEN a component uses `hover:border-indigo-400` for branded interactive element hover borders, THE TerritoryMap_App SHALL replace that class with `hover:border-accent-purple`.

### Requirement 9: Creator Attribution Styling

**User Story:** As a user, I want the creator attribution text to use brand-consistent accent colors, so that it fits naturally within the new visual design.

#### Acceptance Criteria

1. WHEN the creator name "aRczi from #49" is rendered with `text-blue-400` in any Component_File, THE TerritoryMap_App SHALL replace that class with `text-accent-orange` in all instances while preserving any existing font-weight classes (e.g., `font-semibold`).
2. WHEN the Discord username ".arczi." is rendered with `text-purple-400` in any Component_File, THE TerritoryMap_App SHALL replace that class with `text-accent-purple` in all instances while preserving any existing font-weight classes (e.g., `font-medium`).

### Requirement 10: App Title and Header Gradient Treatment

**User Story:** As a user, I want the app title and key headings to use the brand gradient text style, so that the app feels premium and on-brand.

#### Acceptance Criteria

1. WHEN the main title "Alliance Map Manager" is rendered in the sidebar header, THE TerritoryMap_App SHALL apply the `gradient-text` class to display it with the orange-to-purple gradient fill.
2. WHEN the tab heading "Territory Map" is displayed in the content area header, THE TerritoryMap_App SHALL apply the `gradient-text` class to display it with the orange-to-purple gradient fill.
3. WHEN the tab heading "Hive Builder" is displayed in the content area header, THE TerritoryMap_App SHALL apply the `gradient-text` class to display it with the orange-to-purple gradient fill.
