# Monorepo Refactoring — arc-tools

## Goal
Split Territorymap repo into monorepo with 3 packages:
- `@arc-tools/shared` — auth, firebaseConfig, analytics, UserMenu
- `@arc-tools/territory-map` — AllianceMapManager, S6 data
- `@arc-tools/hive-builder` — FrankensteinEventTab, GridCanvas, etc.

## Current State
- Files copied to `C:/Users/arek/orca/workspaces/arc-tools/packages/*/src/`
- Root package.json with workspaces created
- Basic tsconfig files created
- Import paths NEED updating across all files

## Tasks

### Task 1: Fix import paths — territory-map
**File**: `packages/territory-map/src/AllianceMapManager.tsx`

Update ALL imports that reference shared files:
- `../auth/AuthContext` → `@shared/auth/AuthContext`
- `../auth/api` → `@shared/auth/api`  
- `../auth/basePath` → `@shared/auth/basePath`
- `../firebaseConfig` → `@shared/firebaseConfig`
- `../analytics` → `@shared/analytics`
- `../components/UserMenu` → `@shared/components/UserMenu`
- `./data/regionsS6` stays as-is (local)

Also: remove `FrankensteinEventTab` import (it's now a separate app), remove `{FrankensteinEventTab}` from JSX and related state. The territory-map becomes standalone (no tab switching to hive builder). Remove `activeTab` logic, just render the map directly.

### Task 2: Fix import paths — hive-builder  
**File**: ALL files in `packages/hive-builder/src/`

Update imports referencing shared files:
- `../auth/AuthContext` → `@shared/auth/AuthContext`
- `../firebaseConfig` → `@shared/firebaseConfig`
- `../analytics` → `@shared/analytics`
- Local imports (`./`, `../`) stay as-is

Files to check: `useFrankyLayout.ts`, `FrankensteinEventTab.tsx`, `TemplateListModal.tsx`, `SaveTemplateModal.tsx`, `OcrPreviewModal.tsx`, `ResetModal.tsx`, `exportUtils.ts`, `ocrImport.ts`, `templateService.ts`

Also: FrankensteinEventTab currently receives `userId` and `isActive` as props (from parent AllianceMapManager). Since it's now standalone, it needs to get `userId` from AuthContext directly. Remove `isActive` prop dependency — always render.

### Task 3: Create entry points and configs

**3a. Shared barrel** — `packages/shared/src/index.ts`:
Exports: AuthProvider, useAuth, firebaseConfig (db), analytics functions, UserMenu

**3b. Territory map entry** — `packages/territory-map/src/main.tsx`:
Simple React app: AuthProvider + AllianceMapManager (no tab switching)

**3c. Hive builder entry** — `packages/hive-builder/src/main.tsx`:
Simple React app: AuthProvider + FrankensteinEventTab

**3d. Territory map index.html** — `packages/territory-map/index.html`:
Standard Vite HTML, references `/src/main.tsx`

**3e. Hive builder index.html** — `packages/hive-builder/index.html`:
Standard Vite HTML, references `/src/main.tsx`

**3f. Vite configs** for both packages:
- territory-map: base `/teritorymap/`, outDir `../../dist/teritorymap`, resolve alias `@shared`
- hive-builder: base `/hivebuilder/`, outDir `../../dist/hivebuilder`, resolve alias `@shared`

**3g. App.tsx cleanup** — NOT needed (each package has its own main.tsx)

### Task 4: npm install + build test
From root `arc-tools/`:
- `npm install`
- `npm -w @arc-tools/territory-map run build`
- `npm -w @arc-tools/hive-builder run build`

## Validation
1. TypeScript compiles: `npx -p typescript tsc -p packages/territory-map --noEmit`
2. Vite builds succeed
3. No circular dependencies
4. No broken imports
