# Implementation Plan: Discord Export

## Overview

Implement a "Copy for Discord" button in the Territory Map sidebar that generates a Discord-formatted summary of the current map state (alliance scores, territory counts, buff summaries) and copies it to the clipboard. The implementation adds a pure formatter function, clipboard interaction state, and a button to the existing `AllianceMapManager.tsx` component.

## Tasks

- [x] 1. Implement the `formatDiscordMessage` pure function
  - [x] 1.1 Create the `formatDiscordMessage` function in `src/AllianceMapManager.tsx`
    - Define the `FormatDiscordMessageParams` interface and `AllianceExportData` internal type
    - Implement the pure function at module level that accepts alliances, regionColors, regionData, permanentBuffs, and availableBuffs
    - Calculate per-alliance scores (sum of `region.number` for owned regions)
    - Calculate territory counts (total, assigned, free, per-alliance)
    - Filter out regionColors entries referencing non-existent alliance IDs
    - Sort alliances by score descending, then alphabetically by name for ties
    - Include alliances with zero territories in the ranked list with score 0
    - Aggregate buffs per alliance by summing percentage values of each buff type across owned territories
    - Format output using Discord markdown: bold `**`, code blocks ` ``` `, emoji characters
    - Output sections in order: header, territory overview, alliance rankings, buff summary
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 1.2 Write property test: Discord markdown format (Property 1)
    - **Property 1: Discord markdown format**
    - For any valid set of alliances and region assignments, the output contains at least one bold marker (`**`), at least one code block delimiter, and at least one emoji character
    - **Validates: Requirements 2.1**

  - [ ]* 1.3 Write property test: Territory count invariant (Property 2)
    - **Property 2: Territory count invariant**
    - For any valid set of alliances and region assignments, assigned + free = total, AND sum of per-alliance territory counts = assigned count
    - **Validates: Requirements 2.3, 2.5**

  - [ ]* 1.4 Write property test: Alliance ranking sort order (Property 3)
    - **Property 3: Alliance ranking sort order**
    - For any set of alliances with computed scores, the ranked list is sorted descending by score, with alphabetical tiebreaking
    - **Validates: Requirements 2.4, 2.7**

  - [ ]* 1.5 Write property test: Section ordering (Property 4)
    - **Property 4: Section ordering**
    - For any valid input, sections appear in order: header → territory overview → alliance rankings → buff summary
    - **Validates: Requirements 2.8**

  - [ ]* 1.6 Write property test: Alliance inclusion correctness (Property 5)
    - **Property 5: Alliance inclusion correctness**
    - Every alliance in the alliances array appears in output (even with zero territories), and no region ownership entries referencing missing alliance IDs appear
    - **Validates: Requirements 4.2, 4.4**

  - [ ]* 1.7 Write property test: Score calculation correctness (Property 6)
    - **Property 6: Score calculation correctness**
    - Each alliance's displayed score equals the sum of the `number` field of all regions assigned to that alliance
    - **Validates: Requirements 4.5**

  - [ ]* 1.8 Write property test: Buff aggregation correctness (Property 7)
    - **Property 7: Buff aggregation correctness**
    - Each alliance's buff summary equals the sum of percentage values for each buff type across owned territories
    - **Validates: Requirements 2.6, 4.3**

- [x] 2. Checkpoint - Verify formatter logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement the button UI and clipboard interaction
  - [x] 3.1 Add `copyStatus` state and `handleCopyForDiscord` handler to `AllianceMapManager.tsx`
    - Add `ClipboardCopy` (or `Share2` fallback) import from `lucide-react`
    - Add `useState<'idle' | 'success' | 'error'>('idle')` for `copyStatus`
    - Implement `handleCopyForDiscord` async handler using `useCallback`
    - Call `formatDiscordMessage` with current `alliances`, `regionColors`, `REGION_DATA`, `PERMANENT_BUFFS`, and `AVAILABLE_BUFFS`
    - Write result to clipboard via `navigator.clipboard.writeText`
    - On success: set `copyStatus = 'success'`, reset to `'idle'` after 2 seconds
    - On failure: set `copyStatus = 'error'`, reset to `'idle'` after 3 seconds
    - Wrap clipboard call in try/catch to handle unavailable API or permission denied
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1_

  - [x] 3.2 Add the "Copy for Discord" button to the sidebar Actions section
    - Place the button between "Export as PNG" and "Map reset" in the Actions section
    - Use `ClipboardCopy` icon and "Copy for Discord" label
    - Apply same full-width button styling (padding, font weight, border radius, flex layout) as "Export as PNG"
    - Change button text and color based on `copyStatus`: idle → `bg-indigo-600` "Copy for Discord", success → `bg-green-600` "Copied! ✓", error → `bg-red-600` "Copy failed"
    - Ensure button is keyboard-focusable with `aria-label="Copy for Discord"`
    - Ensure button is visible on desktop and mobile (when sidebar is toggled open)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.2, 3.3, 3.4_

  - [ ]* 3.3 Write unit tests for button behavior and clipboard interaction
    - Test button renders with correct text, icon, and position
    - Test button is keyboard-focusable with accessible label
    - Test success state shows "Copied! ✓" and reverts after 2 seconds
    - Test error state shows "Copy failed" and reverts after 3 seconds
    - Test clipboard API is called with the formatter's output
    - Test empty state (no alliances, no regions) produces valid message and copies successfully
    - _Requirements: 1.1, 1.2, 1.4, 3.1, 3.2, 3.3, 3.4_

- [x] 4. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The test setup (vitest, fast-check, @testing-library/react) will be installed as part of the first test task that gets executed
- All implementation lives within `src/AllianceMapManager.tsx` — no new modules needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "3.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["3.3"] }
  ]
}
```
