# Implementation Plan: Map Scroll Zoom

## Overview

Add scroll-wheel zoom to the Territory Map in `AllianceMapManager.tsx`. All changes are confined to a single file. The implementation adds new state/refs/constants, a `handleWheel` callback with anchor-point math, a `useEffect` for non-passive event listener registration, updated CSS transition logic, responsive hint text, and a ref attachment to the wrapper div.

## Tasks

- [x] 1. Add scroll-zoom state, refs, and constants
  - [x] 1.1 Add constants and new state/refs for scroll zoom
    - Add `SCROLL_ZOOM_FACTOR = 1.15` and `SCROLL_DEBOUNCE_MS = 150` constants near the top of the component or above it
    - Add `const [isScrolling, setIsScrolling] = useState<boolean>(false)` alongside existing pinch-to-zoom state
    - Add `const scrollTimeoutRef = useRef<number | null>(null)` ref
    - Add `const mapWrapperRef = useRef<HTMLDivElement>(null)` ref
    - _Requirements: 5.1, 5.2_

- [x] 2. Implement handleWheel callback
  - [x] 2.1 Create the `handleWheel` useCallback with anchor-point zoom logic
    - Implement `handleWheel` as a `useCallback` that:
      - Calls `e.preventDefault()` to block page scroll
      - Early-returns if `mapContainerRef.current` is null
      - Computes zoom factor from `e.deltaY` direction (up = zoom in, down = zoom out)
      - Computes new scale clamped to `[1, 5]`
      - Computes cursor anchor `(cx, cy)` relative to container bounding rect
      - Computes new translation preserving the anchor point
      - Applies snap-back: if `newScale < 1.1`, reset to `scale=1, translate={0,0}`
      - Calls `setMapScale` and `setMapTranslate`
      - Sets `isScrolling = true` and debounces reset to `false` after `SCROLL_DEBOUNCE_MS`
    - Dependencies: `[mapScale, mapTranslate]`
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 4.2, 5.1, 5.2_

  - [x]* 2.2 Write property test for zoom direction monotonicity
    - **Property 1: Zoom direction monotonicity**
    - For any scale in (1, 5), scrolling up produces a larger scale and scrolling down produces a smaller scale
    - **Validates: Requirements 1.1, 1.2**

  - [x]* 2.3 Write property test for anchor-point invariant
    - **Property 2: Anchor-point invariant**
    - For any cursor position, current scale, and current translation, the map-space point under the cursor is preserved after zoom: `(cx - tx) / s == (cx - tx') / s'`
    - **Validates: Requirements 2.1, 2.2**

  - [x]* 2.4 Write property test for zoom range clamping
    - **Property 3: Zoom range clamping invariant**
    - For any sequence of wheel events, `mapScale` stays in `[1, 5]`, and if computed scale < 1.1, output is exactly `{scale: 1, translate: {0, 0}}`
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Register wheel event listener via useEffect
  - [x] 3.1 Add useEffect to attach non-passive wheel listener on `mapWrapperRef`
    - Add a `useEffect` that:
      - Gets `mapWrapperRef.current`, early-returns if null
      - Calls `el.addEventListener('wheel', handleWheel, { passive: false })`
      - Returns cleanup function that calls `el.removeEventListener('wheel', handleWheel)`
    - Dependencies: `[handleWheel]`
    - _Requirements: 1.3, 4.2, 4.3_

- [x] 4. Update CSS transition and attach wrapper ref
  - [x] 4.1 Update the CSS transition expression to account for scrolling
    - Change the existing `transition: isPinching ? 'none' : 'transform 0.2s ease-out'` to `transition: (isPinching || isScrolling) ? 'none' : 'transform 0.2s ease-out'`
    - _Requirements: 5.1, 5.2_

  - [x] 4.2 Attach `mapWrapperRef` to the overflow-hidden wrapper div
    - Add `ref={mapWrapperRef}` to the `<div className="flex-1 overflow-hidden relative p-2 md:p-6 ...">` element
    - _Requirements: 4.1, 4.3_

- [x] 5. Update hint text with responsive messaging
  - [x] 5.1 Replace hint text with responsive desktop/mobile variants
    - Change the existing `{mapScale > 1 ? \`\${Math.round(mapScale * 100)}%\` : 'Pinch to zoom'}` to show "Scroll to zoom" on desktop (md+) and "Pinch to zoom" on mobile when scale is 1, using `<span className="hidden md:inline">` and `<span className="md:hidden">` wrappers
    - _Requirements: 6.1, 6.2, 6.3_

  - [x]* 5.2 Write property test for hint text percentage formatting
    - **Property 4: Hint text percentage formatting**
    - For any `mapScale > 1`, the displayed text equals `Math.round(mapScale * 100)` followed by `%`
    - **Validates: Requirements 6.2**

- [x] 6. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All changes are scoped to a single file: `src/AllianceMapManager.tsx`
- The implementation reuses existing `mapScale`, `mapTranslate`, and `mapContainerRef` — no new component or file creation needed
- Property tests validate the pure zoom computation logic extracted from the callback
- The anchor-point math follows the same pattern used in `GridCanvas.tsx`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.1"] },
    { "id": 3, "tasks": ["4.1", "4.2", "5.1"] },
    { "id": 4, "tasks": ["5.2"] }
  ]
}
```
