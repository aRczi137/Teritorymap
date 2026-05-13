# Implementation Plan: UI Improvements

## Overview

Implement three UI enhancements in `AllianceMapManager.tsx`: a floating color legend overlay, a mobile quick-switch alliance bar, and a multi-step undo/redo history system. All features integrate with existing React state (`alliances`, `regionColors`, `activeAllianceId`) and the existing localStorage persistence mechanism.

## Tasks

- [x] 1. Implement Undo/Redo history system
  - [x] 1.1 Add HistoryEntry interface and undo/redo state
    - Define `HistoryEntry` interface with `regionId`, `previousAllianceId`, and `newAllianceId`
    - Add `history` and `historyPosition` state variables
    - Derive `canUndo` and `canRedo` booleans
    - Import `Undo2` and `Redo2` from `lucide-react`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 1.2 Implement pushHistory, undo, and redo functions
    - Implement `pushHistory` that truncates future entries (branch pruning) and enforces max 20 entries
    - Implement `undo` that restores `regionColors` to the previous state for the affected territory
    - Implement `redo` that re-applies the next undone action
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 1.3 Integrate history recording into handlePathClick
    - Call `pushHistory` before updating `regionColors` on territory assignment
    - Call `pushHistory` before updating `regionColors` on territory removal
    - _Requirements: 3.1, 3.2, 3.11_

  - [x] 1.4 Add Undo/Redo buttons to the map header
    - Render Undo2 and Redo2 icon buttons in the map header area
    - Disable buttons based on `canUndo`/`canRedo` state with appropriate styling
    - Add `aria-label` attributes for accessibility
    - Ensure buttons are accessible on both desktop and mobile viewports
    - _Requirements: 3.8, 3.9, 3.10_

  - [ ]* 1.5 Write property test for history recording (Property 4)
    - **Property 4: Territory actions are recorded in history**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 1.6 Write property test for history size cap (Property 5)
    - **Property 5: History never exceeds 20 entries**
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 1.7 Write property test for branch pruning (Property 6)
    - **Property 6: New action after undo discards future entries**
    - **Validates: Requirements 3.5**

  - [ ]* 1.8 Write property test for undo restoring state (Property 7)
    - **Property 7: Undo restores prior territory state**
    - **Validates: Requirements 3.6**

  - [ ]* 1.9 Write property test for undo/redo round-trip (Property 8)
    - **Property 8: Undo then redo is identity**
    - **Validates: Requirements 3.6, 3.7**

- [x] 2. Checkpoint - Verify undo/redo system
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement Floating Color Legend
  - [x] 3.1 Add Color Legend overlay to the map area
    - Compute `visibleAlliances` by filtering alliances that have at least one territory in `regionColors`
    - Render the legend as an absolute-positioned div in the bottom-left of the map wrapper (outside the transform container)
    - Use `bg-gray-900/70 backdrop-blur-sm` for semi-transparency
    - Apply `pointer-events-none` so clicks pass through to map regions
    - Conditionally render only when `visibleAlliances.length > 0`
    - Add bottom padding on mobile to avoid overlap with Quick-Switch Bar
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 3.2 Write property test for legend filtering (Property 1)
    - **Property 1: Legend displays exactly alliances with assigned territories**
    - **Validates: Requirements 1.2, 1.3**

- [x] 4. Implement Mobile Quick-Switch Alliance Bar
  - [x] 4.1 Add Quick-Switch Bar component
    - Render a fixed-bottom bar with `md:hidden` for mobile-only visibility
    - Display one colored chip (rounded-full button) per alliance
    - Set `activeAllianceId` on chip tap
    - Visually distinguish the active chip with `scale-125` and `ring-2 ring-white/50`
    - Use `z-30` to layer below sidebar but above map
    - Add `overflow-x-auto` for many alliances
    - Add `aria-label` for each chip button
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 4.2 Write property test for chip rendering (Property 2)
    - **Property 2: Quick-switch chips match alliance list**
    - **Validates: Requirements 2.3**

  - [ ]* 4.3 Write property test for chip tap behavior (Property 3)
    - **Property 3: Tapping a chip sets the active alliance**
    - **Validates: Requirements 2.4**

- [x] 5. Final checkpoint - Ensure all features work together
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- All implementation happens within `src/AllianceMapManager.tsx` — no new files needed
- The existing localStorage debounced save already persists `regionColors` changes from undo/redo (Requirement 3.12)
- History state is ephemeral per session (not persisted to localStorage)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4"] },
    { "id": 3, "tasks": ["1.5", "1.6", "1.7", "1.8", "1.9", "3.1"] },
    { "id": 4, "tasks": ["3.2", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] }
  ]
}
```
