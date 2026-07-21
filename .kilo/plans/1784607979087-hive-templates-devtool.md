# Hive Builder Templates + Admin Devtool

## Goal
Add global template system to hive builder so users can pick pre-made base layouts. Admin can save templates via devtool (visible only to authorized Discord user).

## Template data model
- Firestore collection: `hive_templates/{templateId}`
- Document fields:
  ```ts
  {
    name: string;           // template display name
    gridConfig: { cols: number; rows: number };
    players: Array<{ id: string; name: string; level: PlayerLevel; color: string }>;
    placedPlayers: Array<{ playerId: string; position: GridPosition }>;
    frankyPosition: GridPosition;
    updatedAt: Timestamp;   // serverTimestamp()
  }
  ```
- Positions are absolute (grid always 1000×1000, template self-contained)
- When loaded, player IDs from template are used as-is (layout is fully replaced)

## Firestore rules update (`firestore.rules`)
Add before the wildcard block:
```
match /hive_templates/{templateId} {
  allow read: if request.auth != null;
  allow create, update, delete: if request.auth != null
    && request.auth.uid == '<<ADMIN_FIREBASE_UID>>';
}
```
- Admin Firebase UID is hardcoded in rules (discovered once, or set via env at deploy time)
- Note: `VITE_ADMIN_DISCORD_ID` is for frontend UI gating; Firestore rules use Firebase UID

## Admin identification
- Env variable: `VITE_ADMIN_DISCORD_ID` (Discord user ID / Snowflake)
- Frontend check: `user.id === import.meta.env.VITE_ADMIN_DISCORD_ID`
- Backend (Firestore rules): use Firebase UID of admin account

## Files to create

### `src/frankenstein/templateService.ts`
Firestore CRUD for `hive_templates` collection:
- `fetchTemplates(): Promise<Template[]>` — reads all template docs via `getDocs`
- `saveTemplate(data): Promise<void>` — writes new template doc with `serverTimestamp()`
- `deleteTemplate(id): Promise<void>` — removes template doc

### `src/frankenstein/TemplateListModal.tsx`
Modal listing available templates with preview and load action:
- Fetch templates on mount via `fetchTemplates`
- Display: template name, player count, date
- "Load" button per template → calls `loadLayout(data)` from `useFrankyLayout`
- Also accepts `onClose` prop and renders as overlay modal

### `src/frankenstein/SaveTemplateModal.tsx`
Modal for admin to save current layout as template:
- Input: template name (required)
- "Save" button → calls `saveTemplate` with current state (players, placedPlayers, frankyPosition, gridConfig)
- Accepts current layout state as props + `onClose`

## Files to modify

### `src/frankenstein/FrankensteinEventTab.tsx`
Add to tools panel:
1. "Load Template" button (visible to all users) → opens `TemplateListModal`
2. "Save as Template" button (visible only when `isAdmin` is true) → opens `SaveTemplateModal`

Add state:
- `templateModalOpen: boolean`
- `saveTemplateModalOpen: boolean`
- `isAdmin: boolean` (computed from env)

### `src/vite-env.d.ts`
Add type for `VITE_ADMIN_DISCORD_ID`:
```ts
interface ImportMetaEnv {
  readonly VITE_ADMIN_DISCORD_ID?: string;
}
```

### `.env.example`
Add `VITE_ADMIN_DISCORD_ID=`

### `src/frankenstein/types.ts`
Add template-related types:
```ts
export interface HiveTemplate {
  id?: string;  // Firestore doc ID (undefined when creating)
  name: string;
  gridConfig: GridConfig;
  players: Player[];
  placedPlayers: PlacedPlayer[];
  frankyPosition: GridPosition;
}
```

## UI design
- Both buttons in the existing tools panel (top-left, collapsible)
- Template modals follow same dark style as `ResetModal` and `OcrPreviewModal` (backdrop blur, dark bg, border `#2a2a3a`)
- "Load Template" button: styled like other tool buttons (surface-hover bg)
- "Save as Template" button: slight accent color to distinguish admin-only (e.g., purple/amber border)

## Tasks (ordered)

1. **Add types** — `src/frankenstein/types.ts`: add `HiveTemplate` interface
2. **Add env type** — `src/vite-env.d.ts`: add `VITE_ADMIN_DISCORD_ID`
3. **Add `.env.example`** — document new variable
4. **Create `templateService.ts`** — Firestore CRUD for `hive_templates`
5. **Create `TemplateListModal.tsx`** — template browser/loader modal
6. **Create `SaveTemplateModal.tsx`** — admin save-to-template modal
7. **Update `FrankensteinEventTab.tsx`** — add buttons, modal state, admin check
8. **Update `firestore.rules`** — add `hive_templates` read/write rules
9. **Add analytics events** — `trackTemplateLoad`, `trackTemplateSave` in `analytics.ts`

## Validation
- Run `tsc` to verify no type errors
- Run lint: `npm run lint`
- Manual test:
  - As regular user: can see "Load Template" button, opens modal, templates load correctly
  - As regular user: "Save as Template" button is hidden
  - As admin (with env set): "Save as Template" visible, can save and load template
