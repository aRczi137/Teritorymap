# Design Document: Discord Export

## Overview

This feature adds a "Copy for Discord" button to the Territory Map sidebar that generates a Discord-formatted summary of the current map state (alliance scores, territory counts, buff summaries) and copies it to the clipboard. The implementation lives entirely within `AllianceMapManager.tsx` as a helper formatting function and a button with clipboard interaction state management.

The design prioritizes simplicity — no new modules, no external dependencies. The formatter is a pure function that takes the current state and returns a string, making it easy to test and reason about.

## Architecture

The feature consists of three logical parts, all within the existing component:

1. **Formatter function** (`formatDiscordMessage`) — a pure helper that accepts alliances, regionColors, and static data, then returns a Discord-markdown string.
2. **Button state** — a small piece of React state (`copyStatus`) tracking idle/success/error for visual feedback.
3. **Click handler** (`handleCopyForDiscord`) — orchestrates calling the formatter, writing to clipboard, and managing the feedback timer.

```mermaid
flowchart TD
    A[User clicks "Copy for Discord"] --> B[handleCopyForDiscord]
    B --> C[formatDiscordMessage]
    C --> D[Returns formatted string]
    B --> E[navigator.clipboard.writeText]
    E -->|success| F[Set copyStatus = 'success']
    E -->|failure| G[Set copyStatus = 'error']
    F --> H[setTimeout 2s → reset to 'idle']
    G --> I[setTimeout 3s → reset to 'idle']
```

## Components and Interfaces

### `formatDiscordMessage` (helper function)

```typescript
interface FormatDiscordMessageParams {
  alliances: Alliance[];
  regionColors: Record<string, number>;
  regionData: RegionData[];
  permanentBuffs: Record<string, string>;
  availableBuffs: Buff[];
}

function formatDiscordMessage(params: FormatDiscordMessageParams): string
```

This is a **pure function** defined outside the component (or at module level inside the file). It receives all data it needs as arguments — no closures over component state — so it can be tested independently.

**Responsibilities:**
- Calculate scores per alliance (sum of `region.number` for owned regions)
- Calculate territory counts per alliance
- Aggregate buffs per alliance
- Filter out regionColors entries referencing non-existent alliance IDs
- Sort alliances by score descending, then alphabetically by name for ties
- Format everything using Discord markdown (bold `**`, code blocks ` ``` `, emoji)
- Return the complete message string

### `handleCopyForDiscord` (event handler)

```typescript
const handleCopyForDiscord = async (): Promise<void>
```

Defined inside the component via `useCallback`. Calls `formatDiscordMessage` with current state, writes to clipboard, manages `copyStatus` state.

### `copyStatus` (state)

```typescript
type CopyStatus = 'idle' | 'success' | 'error';
const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
```

Drives the button's label and visual appearance.

### Button rendering

The button sits between "Export as PNG" and "Map reset" in the Actions section. It uses the `ClipboardCopy` icon from lucide-react (or `Share2` as fallback). The button text and styling change based on `copyStatus`:

| Status | Label | Color |
|--------|-------|-------|
| idle | Copy for Discord | `bg-indigo-600` |
| success | Copied! ✓ | `bg-green-600` |
| error | Copy failed | `bg-red-600` |

## Data Models

No new persistent data models are introduced. The feature operates on existing state:

- **Input state**: `alliances`, `regionColors` (component state), `REGION_DATA`, `PERMANENT_BUFFS`, `AVAILABLE_BUFFS` (module constants)
- **Derived data** (computed inside `formatDiscordMessage`):

```typescript
// Per-alliance computed data
interface AllianceExportData {
  id: number;
  name: string;
  score: number;          // sum of region.number for owned regions
  regionCount: number;    // count of owned regions
  buffs: Record<string, number>; // buff base name → summed percentage
}
```

### Output format

The Discord message follows this structure:

```
**🗺️ Territory Map Summary**

**📊 Territory Overview**
```
Total: {ALL_REGIONS_COUNT} | Assigned: {assigned} | Free: {free}
```

**🏆 Alliance Rankings**
```
1. {name} — {score} pts ({regionCount}/{ALL_REGIONS_COUNT} territories)
2. {name} — {score} pts ({regionCount}/{ALL_REGIONS_COUNT} territories)
...
```

**✨ Buff Summary**
```
{name}: {buffName} +{value}%, {buffName} +{value}%
{name}: {buffName} +{value}%
```
```

Alliances with no buffs are omitted from the buff summary section. If no alliance has any buffs, the buff summary section header still appears with an empty code block or a "No buffs assigned" note.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Discord markdown format

*For any* valid set of alliances and region assignments, the output of `formatDiscordMessage` SHALL contain Discord markdown syntax elements: at least one bold marker (`**`), at least one code block delimiter (` ``` `), and at least one emoji character.

**Validates: Requirements 2.1**

### Property 2: Territory count invariant

*For any* valid set of alliances and region assignments, the territory counts in the formatted output SHALL satisfy: assigned + free = total, AND the sum of all per-alliance territory counts SHALL equal the assigned count.

**Validates: Requirements 2.3, 2.5**

### Property 3: Alliance ranking sort order

*For any* set of alliances with computed scores, the ranked list in the output SHALL be sorted in descending order by score, and when two alliances have equal scores, they SHALL be sorted alphabetically by name.

**Validates: Requirements 2.4, 2.7**

### Property 4: Section ordering

*For any* valid input, the formatted output SHALL contain sections in this order: header appears before territory overview, territory overview appears before alliance rankings, alliance rankings appears before buff summary.

**Validates: Requirements 2.8**

### Property 5: Alliance inclusion correctness

*For any* set of alliances and regionColors, the formatted output SHALL include every alliance present in the alliances array (even those with zero territories), and SHALL exclude any region ownership entries that reference alliance IDs not present in the alliances array.

**Validates: Requirements 4.2, 4.4**

### Property 6: Score calculation correctness

*For any* assignment of regions to alliances, each alliance's displayed score SHALL equal the sum of the `number` field of all regions assigned to that alliance in regionColors.

**Validates: Requirements 4.5**

### Property 7: Buff aggregation correctness

*For any* assignment of regions to alliances, each alliance's buff summary SHALL equal the sum of percentage values for each buff type across all territories owned by that alliance, using the PERMANENT_BUFFS mapping.

**Validates: Requirements 2.6, 4.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| `navigator.clipboard` unavailable (older browsers, non-HTTPS) | Catch the error, set `copyStatus = 'error'`, show "Copy failed" for 3 seconds |
| `writeText` promise rejects (permission denied) | Same as above — catch and show error feedback |
| No alliances exist | Formatter still produces valid output with empty rankings |
| No regions assigned | Formatter produces output with all counts at 0 |
| regionColors references deleted alliance ID | Formatter filters these out before computing |

No exceptions should propagate to the user. The try/catch in `handleCopyForDiscord` is the single error boundary for this feature.

## Testing Strategy

### Property-Based Tests

The `formatDiscordMessage` function is a pure function with clear input/output behavior, making it ideal for property-based testing. Use **fast-check** as the PBT library for TypeScript.

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: discord-export, Property {N}: {description}`
- Generators produce random alliance arrays, random regionColors mappings, and use the real PERMANENT_BUFFS/AVAILABLE_BUFFS constants

**Properties to implement:**
1. Discord markdown format presence
2. Territory count invariant (assigned + free = total)
3. Alliance ranking sort order (descending score, alphabetical tiebreak)
4. Section ordering
5. Alliance inclusion correctness
6. Score calculation correctness
7. Buff aggregation correctness

### Unit Tests (Example-Based)

- Button renders with correct text, icon, and position in DOM
- Button is keyboard-focusable with accessible label
- Success state shows "Copied! ✓" and reverts after 2 seconds
- Error state shows "Copy failed" and reverts after 3 seconds
- Clipboard API is called with the formatter's output
- Empty state (no alliances, no regions) produces valid message

### Integration Tests

- Full click flow: click button → clipboard contains expected string → UI shows success
- Clipboard permission denied flow: click → UI shows error → reverts

### Test Dependencies

Add to devDependencies:
- `fast-check` — property-based testing library
- `vitest` — test runner (or use existing if present)
- `@testing-library/react` — component rendering tests
