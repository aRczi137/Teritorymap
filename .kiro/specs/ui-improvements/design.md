# Design Document: UI Improvements

## Overview

This design adds three UI enhancements to the Territory Map application: a floating color legend, a mobile quick-switch alliance bar, and a multi-step undo/redo system. All features are implemented within the existing `AllianceMapManager.tsx` component, leveraging React state, Tailwind CSS responsive utilities, and the existing localStorage persistence mechanism.

## Architecture

### Component Structure

The three features are added as sub-components rendered inside `AllianceMapManager`. No new files are required since the features are tightly coupled to existing state (`alliances`, `regionColors`, `activeAllianceId`).

```
AllianceMapManager.tsx
├── ColorLegend (inline JSX block)
├── QuickSwitchBar (inline JSX block)
└── useActionHistory (custom hook or inline state)
```

### Data Flow

```
User Action (click territory)
    │
    ├─► setRegionColors(newState)     ← existing
    ├─► pushToHistory(action)         ← new (undo/redo)
    │
    ▼
regionColors state updates
    │
    ├─► ColorLegend re-renders (derived from regionColors + alliances)
    ├─► QuickSwitchBar re-renders (derived from alliances + activeAllianceId)
    └─► localStorage persistence (existing 500ms debounce)
```

## Components and Interfaces

### 1. Color Legend

**Position:** Floating overlay, bottom-left of the map area, rendered *outside* the pinch-to-zoom transform container so it stays fixed during zoom/pan.

**Visibility Logic:**
- Compute `visibleAlliances`: alliances that have at least one territory in `regionColors`.
- If `visibleAlliances` is empty, render nothing.

**Rendering:**

```tsx
const visibleAlliances = alliances.filter(a =>
  Object.values(regionColors).includes(a.id)
);

{visibleAlliances.length > 0 && (
  <div className="absolute bottom-4 left-4 bg-gray-900/70 backdrop-blur-sm rounded-lg p-3 pointer-events-none z-10">
    <div className="space-y-1.5">
      {visibleAlliances.map(a => (
        <div key={a.id} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-sm border border-white/30"
            style={{ backgroundColor: a.color }}
          />
          <span className="text-xs text-white/90 font-medium">{a.name}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

**Key decisions:**
- `pointer-events-none` ensures clicks pass through to map regions beneath.
- Positioned with `absolute` inside the `flex-1 overflow-hidden` map wrapper (but outside the transform div).
- `bg-gray-900/70 backdrop-blur-sm` provides semi-transparency.

---

### 2. Mobile Quick-Switch Bar

**Position:** Fixed at the bottom of the screen, visible only on mobile (`md:hidden`).

**Layout:**

```tsx
<div className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
  <div className="bg-gray-900/90 backdrop-blur-sm border-t border-gray-700 px-4 py-3">
    <div className="flex gap-2 overflow-x-auto justify-center">
      {alliances.map(a => (
        <button
          key={a.id}
          onClick={() => setActiveAllianceId(a.id)}
          className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all ${
            activeAllianceId === a.id
              ? 'border-white scale-125 ring-2 ring-white/50'
              : 'border-gray-600 opacity-70'
          }`}
          style={{ backgroundColor: a.color }}
          aria-label={`Select ${a.name}`}
        />
      ))}
    </div>
  </div>
</div>
```

**Key decisions:**
- Uses `fixed bottom-0` so it floats above all content.
- `z-30` keeps it below the sidebar (`z-50`) but above the map.
- The Color Legend uses `bottom-4` inside the map area (relative positioning), so it naturally sits above the quick-switch bar without overlap. On mobile, the legend's parent container has padding-bottom to account for the bar height.
- Chips are `rounded-full` colored buttons; the active one gets `scale-125` + `ring-2` for visual distinction.
- `overflow-x-auto` handles cases with many alliances.

---

### 3. Undo/Redo System

#### Data Model

```typescript
interface HistoryEntry {
  regionId: string;
  previousAllianceId: number | null;  // null means territory was unassigned
  newAllianceId: number | null;       // null means territory was removed
}

interface ActionHistory {
  entries: HistoryEntry[];
  position: number;  // index of the "current" position (-1 means no history)
}
```

#### State

```typescript
const [history, setHistory] = useState<HistoryEntry[]>([]);
const [historyPosition, setHistoryPosition] = useState<number>(-1);

const canUndo = historyPosition >= 0;
const canRedo = historyPosition < history.length - 1;
```

#### Core Logic

**Push to history** (called when a territory is assigned or removed):

```typescript
const pushHistory = (entry: HistoryEntry) => {
  setHistory(prev => {
    // Discard any entries ahead of current position (branch pruning)
    const truncated = prev.slice(0, historyPosition + 1);
    const updated = [...truncated, entry];
    // Enforce max 20 entries by discarding oldest
    if (updated.length > 20) {
      return updated.slice(updated.length - 20);
    }
    return updated;
  });
  setHistoryPosition(prev => {
    const newPos = Math.min(prev + 1, 19);
    return newPos;
  });
};
```

**Undo:**

```typescript
const undo = () => {
  if (!canUndo) return;
  const entry = history[historyPosition];
  // Restore previous state
  setRegionColors(prev => {
    if (entry.previousAllianceId === null) {
      const next = { ...prev };
      delete next[entry.regionId];
      return next;
    }
    return { ...prev, [entry.regionId]: entry.previousAllianceId };
  });
  setHistoryPosition(p => p - 1);
};
```

**Redo:**

```typescript
const redo = () => {
  if (!canRedo) return;
  const entry = history[historyPosition + 1];
  // Re-apply action
  setRegionColors(prev => {
    if (entry.newAllianceId === null) {
      const next = { ...prev };
      delete next[entry.regionId];
      return next;
    }
    return { ...prev, [entry.regionId]: entry.newAllianceId };
  });
  setHistoryPosition(p => p + 1);
};
```

#### Integration with `handlePathClick`

The existing `handlePathClick` function is modified to call `pushHistory` before updating `regionColors`:

```typescript
const handlePathClick = (e: React.MouseEvent<SVGPathElement>) => {
  if (isEditingCenters) return;
  const regionId = targetElement.getAttribute('data-region');
  if (!regionId) return;

  if (regionColors[regionId] === activeAllianceId) {
    // Removal
    pushHistory({
      regionId,
      previousAllianceId: activeAllianceId,
      newAllianceId: null,
    });
    setRegionColors(prev => {
      const next = { ...prev };
      delete next[regionId];
      return next;
    });
  } else {
    // Assignment
    const currentCount = Object.values(regionColors).filter(id => id === activeAllianceId).length;
    if (currentCount >= 8) {
      showToast(`❌ ${alliances.find(a => a.id === activeAllianceId)?.name} reached max 8 territories!`);
      return;
    }
    pushHistory({
      regionId,
      previousAllianceId: regionColors[regionId] ?? null,
      newAllianceId: activeAllianceId,
    });
    setRegionColors(prev => ({ ...prev, [regionId]: activeAllianceId }));
  }
};
```

#### UI Buttons

Placed in the map header bar alongside the existing title:

```tsx
<div className="flex items-center gap-1">
  <button
    onClick={undo}
    disabled={!canUndo}
    className={`p-2 rounded transition ${
      canUndo
        ? 'hover:bg-gray-700 text-gray-200'
        : 'text-gray-600 cursor-not-allowed'
    }`}
    aria-label="Undo"
  >
    <Undo2 size={18} />
  </button>
  <button
    onClick={redo}
    disabled={!canRedo}
    className={`p-2 rounded transition ${
      canRedo
        ? 'hover:bg-gray-700 text-gray-200'
        : 'text-gray-600 cursor-not-allowed'
    }`}
    aria-label="Redo"
  >
    <Redo2 size={18} />
  </button>
</div>
```

Icons `Undo2` and `Redo2` are imported from `lucide-react`.

#### Persistence

The existing localStorage save effect already watches `regionColors`. The history state itself does not need separate persistence — it is ephemeral per session. However, since undo/redo modifies `regionColors`, the debounced save will persist the resulting map state automatically.

---

## Data Models

### HistoryEntry

```typescript
interface HistoryEntry {
  regionId: string;
  previousAllianceId: number | null;  // null means territory was unassigned
  newAllianceId: number | null;       // null means territory was removed
}
```

### ActionHistory State

```typescript
// State variables
const [history, setHistory] = useState<HistoryEntry[]>([]);
const [historyPosition, setHistoryPosition] = useState<number>(-1);

// Derived
const canUndo = historyPosition >= 0;
const canRedo = historyPosition < history.length - 1;
```

### Derived State

| Derived Value | Source | Purpose |
|---|---|---|
| `visibleAlliances` | `alliances`, `regionColors` | Filter alliances shown in legend |
| `canUndo` | `historyPosition >= 0` | Enable/disable undo button |
| `canRedo` | `historyPosition < history.length - 1` | Enable/disable redo button |

---

## Error Handling

| Scenario | Handling |
|---|---|
| Undo when history is empty | Button disabled, `undo()` returns early |
| Redo when at end of history | Button disabled, `redo()` returns early |
| History exceeds 20 entries | Oldest entry silently discarded |
| Alliance deleted while in history | Undo/redo applies the regionColors change regardless — the territory simply becomes unassigned if the alliance no longer exists |
| localStorage write failure | Existing try/catch logs error (no change needed) |

---

## Testing Strategy

### Unit Tests (Example-Based)
- Color Legend positioning and visibility (CSS classes, pointer-events)
- Quick-Switch Bar responsive visibility (md:hidden)
- Undo/Redo button disabled states
- Layout non-overlap between legend and quick-switch bar

### Property Tests
- Legend filtering logic (Property 1)
- Chip rendering correctness (Property 2)
- Chip tap behavior (Property 3)
- History recording (Property 4)
- History size cap (Property 5)
- Branch pruning after undo (Property 6)
- Undo restores state (Property 7)
- Undo/redo round-trip (Property 8)

### Integration Tests
- Full flow: assign territory → verify legend updates + history records
- Full flow: undo → verify map reverts + legend updates

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Legend displays exactly alliances with assigned territories

*For any* set of alliances and regionColors mapping, the Color Legend SHALL display exactly those alliances whose id appears at least once as a value in regionColors. When regionColors is empty, the legend SHALL not render.

**Validates: Requirements 1.2, 1.3**

### Property 2: Quick-switch chips match alliance list

*For any* alliance list, the Quick Switch Bar SHALL render exactly one chip per alliance, and each chip's background color SHALL equal the corresponding alliance's color property.

**Validates: Requirements 2.3**

### Property 3: Tapping a chip sets the active alliance

*For any* alliance in the alliance list, tapping its chip in the Quick Switch Bar SHALL result in `activeAllianceId` being set to that alliance's id.

**Validates: Requirements 2.4**

### Property 4: Territory actions are recorded in history

*For any* territory assignment or removal action, the Action History SHALL grow by exactly one entry, and that entry SHALL record the correct `regionId`, `previousAllianceId`, and `newAllianceId`.

**Validates: Requirements 3.1, 3.2**

### Property 5: History never exceeds 20 entries

*For any* sequence of territory actions of length N, the Action History length SHALL equal `min(N, 20)`, and when the 21st action is performed, the oldest entry SHALL no longer be present.

**Validates: Requirements 3.3, 3.4**

### Property 6: New action after undo discards future entries

*For any* history state where undo has been performed K times (position = length - 1 - K), performing a new action SHALL result in a history of length `(original_length - K) + 1` (capped at 20), with no entries from the discarded future remaining.

**Validates: Requirements 3.5**

### Property 7: Undo restores prior territory state

*For any* territory action (assignment or removal), performing that action and then undoing it SHALL restore the affected territory's regionColors entry to its value before the action was performed.

**Validates: Requirements 3.6**

### Property 8: Undo then redo is identity

*For any* territory action, performing the action, then undoing it, then redoing it SHALL result in the affected territory's regionColors entry matching the post-action state exactly.

**Validates: Requirements 3.6, 3.7**
