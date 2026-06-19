# Design Document

## Overview

Add scroll-wheel zoom to the Territory Map on desktop by attaching a non-passive wheel event listener to the map wrapper div. The implementation reuses existing `mapScale`/`mapTranslate` state, performs anchor-point zoom math (cursor stays fixed), clamps to 1–5× range, and updates hint text for desktop users.

## Architecture

The scroll-wheel zoom feature extends the existing `AllianceMapManager` component by adding a `handleWheel` callback and registering it as a non-passive wheel event listener on the map container's parent `overflow-hidden` div. The implementation reuses the existing `mapScale` and `mapTranslate` state, follows the same anchor-point zoom math proven in `GridCanvas.tsx`, and adds a scrolling-active flag for CSS transition control.

### High-Level Flow

```
User scrolls wheel over map area
        │
        ▼
WheelEvent fires (non-passive, preventDefault called)
        │
        ▼
handleWheel computes:
  1. Multiplicative factor from deltaY direction
  2. New scale = clamp(oldScale * factor, 1, 5)
  3. Cursor anchor = (clientX - rect.left, clientY - rect.top)
  4. New translate = anchor - (anchor - oldTranslate) * (newScale / oldScale)
  5. Snap-back: if newScale < 1.1 → reset to scale=1, translate={0,0}
        │
        ▼
setMapScale(newScale), setMapTranslate(newTranslate)
setIsScrolling(true), debounce → setIsScrolling(false)
        │
        ▼
CSS transform updates on mapContainerRef div
Transition disabled while isScrolling=true
```

## Components and Interfaces

### Modified: `AllianceMapManager.tsx`

**New state:**
- `isScrolling: boolean` — tracks whether the user is actively scrolling (disables CSS transition)

**New refs:**
- `scrollTimeoutRef: React.MutableRefObject<number | null>` — debounce timer for detecting scroll end
- `mapWrapperRef: React.RefObject<HTMLDivElement>` — ref to the `overflow-hidden` parent div where the wheel listener is attached

**New constants:**
- `SCROLL_ZOOM_FACTOR = 1.15` — multiplicative zoom step per wheel tick (matches GridCanvas)
- `SCROLL_DEBOUNCE_MS = 150` — milliseconds to wait before re-enabling CSS transition

**New callback: `handleWheel`**

```typescript
const handleWheel = useCallback((e: WheelEvent) => {
  e.preventDefault();

  const container = mapContainerRef.current;
  if (!container) return;
  const rect = container.getBoundingClientRect();

  // 1. Compute zoom factor from scroll direction
  const factor = e.deltaY < 0 ? SCROLL_ZOOM_FACTOR : 1 / SCROLL_ZOOM_FACTOR;

  // 2. Compute new scale, clamped to [1, 5]
  let newScale = Math.min(5, Math.max(1, mapScale * factor));

  // 3. Compute cursor anchor relative to container
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  // 4. Compute new translation preserving anchor point
  let newTranslateX = cx - (cx - mapTranslate.x) * (newScale / mapScale);
  let newTranslateY = cy - (cy - mapTranslate.y) * (newScale / mapScale);

  // 5. Snap-back rule: if close to 1, reset fully
  if (newScale < 1.1) {
    newScale = 1;
    newTranslateX = 0;
    newTranslateY = 0;
  }

  setMapScale(newScale);
  setMapTranslate({ x: newTranslateX, y: newTranslateY });

  // 6. Disable transition during active scrolling
  setIsScrolling(true);
  if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
  scrollTimeoutRef.current = window.setTimeout(() => {
    setIsScrolling(false);
  }, SCROLL_DEBOUNCE_MS);
}, [mapScale, mapTranslate]);
```

**New effect: wheel listener registration**

```typescript
useEffect(() => {
  const el = mapWrapperRef.current;
  if (!el) return;
  el.addEventListener('wheel', handleWheel, { passive: false });
  return () => el.removeEventListener('wheel', handleWheel);
}, [handleWheel]);
```

### Modified: CSS transition logic

The existing transition expression:
```typescript
transition: isPinching ? 'none' : 'transform 0.2s ease-out'
```

Becomes:
```typescript
transition: (isPinching || isScrolling) ? 'none' : 'transform 0.2s ease-out'
```

### Modified: Hint text

The existing hint:
```tsx
{mapScale > 1 ? `${Math.round(mapScale * 100)}%` : 'Pinch to zoom'}
```

Becomes:
```tsx
{mapScale > 1
  ? `${Math.round(mapScale * 100)}%`
  : <>
      <span className="hidden md:inline">Scroll to zoom</span>
      <span className="md:hidden">Pinch to zoom</span>
    </>
}
```

### Modified: `mapWrapperRef` attachment

The overflow-hidden parent div gains a ref:
```tsx
<div ref={mapWrapperRef} className="flex-1 overflow-hidden relative p-2 md:p-6 flex items-center justify-center bg-gray-850">
```

### `handleWheel` Input/Output Contract

| Input | Type | Description |
|-------|------|-------------|
| `e.deltaY` | `number` | Scroll delta (negative = up/zoom-in, positive = down/zoom-out) |
| `e.clientX` | `number` | Mouse X in viewport coordinates |
| `e.clientY` | `number` | Mouse Y in viewport coordinates |
| `mapScale` (closure) | `number` | Current zoom level [1–5] |
| `mapTranslate` (closure) | `{ x: number; y: number }` | Current pan offset |

| Output (via setState) | Type | Description |
|----------------------|------|-------------|
| `newScale` | `number` | New zoom level, clamped [1–5], snapped to 1 if < 1.1 |
| `newTranslate` | `{ x: number; y: number }` | New pan offset preserving anchor point |
| `isScrolling` | `boolean` | Set true immediately, false after debounce |

## Data Models

No new data models are introduced. The feature reuses existing state:

- `mapScale: number` — zoom magnification (range 1–5)
- `mapTranslate: { x: number; y: number }` — pan offset applied via CSS transform

New ephemeral state:
- `isScrolling: boolean` — whether scroll zoom is actively happening (controls CSS transition)

## Error Handling

| Scenario | Handling |
|----------|----------|
| `mapContainerRef.current` is null | Early return from `handleWheel`, no-op |
| `mapWrapperRef.current` is null | `useEffect` skips listener registration |
| Scale computation goes below 1 | Clamped to 1 via `Math.max` |
| Scale computation goes above 5 | Clamped to 5 via `Math.min` |
| Scale near 1 (< 1.1) after zoom-out | Snap-back resets scale to 1 and translation to {0, 0} |
| Rapid scroll events | Debounce timer resets; transition stays disabled until scrolling stops |
| Cleanup on unmount | `useEffect` cleanup removes the wheel event listener |

## Testing Strategy

- **Property-based tests**: Cover zoom computation logic (direction, anchor-point math, clamping, hint formatting) with randomized inputs. Minimum 100 iterations per property.
- **Unit tests**: Verify event listener registration (passive: false), CSS transition toggling, hint text rendering for specific viewport/scale combos, and snap-back edge case.
- **Manual testing**: Confirm smooth feel on actual scroll wheel hardware, verify no page scroll interference, test with trackpad gestures.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Zoom direction monotonicity

For any current scale `s` in (1, 5) and any wheel event, if `deltaY < 0` (scroll up) then the resulting scale is greater than `s`, and if `deltaY > 0` (scroll down) then the resulting scale is less than `s`.

**Validates: Requirements 1.1, 1.2**

### Property 2: Anchor-point invariant

For any cursor position `(cx, cy)` relative to the container, any current scale `s`, any current translation `(tx, ty)`, and any new scale `s'` produced by the zoom handler, the map-space point under the cursor before zoom equals the map-space point under the cursor after zoom. Formally: `(cx - tx) / s == (cx - tx') / s'` and `(cy - ty) / s == (cy - ty') / s'`, where `(tx', ty')` is the new translation.

**Validates: Requirements 2.1, 2.2**

### Property 3: Zoom range clamping invariant

For any sequence of wheel events applied to any starting state, the resulting `mapScale` value is always within the closed interval `[1, 5]`. Additionally, if the computed scale falls below 1.1, the output is exactly `{ scale: 1, translate: { x: 0, y: 0 } }`.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Hint text percentage formatting

For any `mapScale` value greater than 1, the displayed hint text equals `Math.round(mapScale * 100)` followed by `%`.

**Validates: Requirements 6.2**
