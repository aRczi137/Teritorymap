# Territory Map — Dev Guide

## Co to jest

Webowa aplikacja do zarządzania terytoriami i layoutem Hive w grze Dark War Survival. Dwie zakładki:
- **Mapa Terytoriów** — interaktywna mapa SVG (87 terytoriów), przypisywanie do sojuszy, buffy, export
- **Hive Builder** — planer siatki Hive z drag & drop graczy, OCR import z screenshotów, grid 1000×1000

Login przez Discord obowiązkowy. Każdy użytkownik ma własne prywatne dane w Firestore.

## Jak działa auth

```
Przeglądarka → ArcBot API (port 8000) → Discord OAuth → ArcBot API → Firebase custom token → Firebase Auth → Firestore
```

1. Użytkownik klika "Login with Discord" → `GET /api/auth/state` (ArcBot API) → redirect do Discord
2. Discord odsyła do `/callback?code=...`
3. `OAuthCallback.tsx` → `POST /api/auth/discord/callback` (ArcBot) → dostaje `session_id` + user info
4. `POST /api/auth/firebase-token` (Bearer session_id) → dostaje Firebase custom token
5. `signInWithCustomToken(auth, token)` → Firebase Auth zalogowany, `uid = Discord user ID`
6. `localStorage.session_token` przechowuje session_id ArcBota

Przy odświeżeniu strony: `getMe(session_id)` → `getFirebaseToken` → `signInWithCustomToken` → mapa się ładuje.
Jeśli session wygasło (24h inactivity) → getMe zwraca 401 → czyścimy localStorage → LoginPage.

## Gdzie są zapisane dane

### Firestore — struktura dokumentów

```
users/{discordUserId}/
  territory_map/main    — dane mapy terytoriów
  hive_layout/main      — dane Hive Buildera
```

### users/{id}/territory_map/main

```json
{
  "alliances": [{ "id": 1, "name": "KNS", "color": "#e67e22" }, ...],
  "regionColors": { "r1": 1, "r2": 2, ... },
  "manualCenterOverrides": { "r1": { "x": 100, "y": 200 }, ... },
  "activeAllianceId": 1,
  "updatedAt": <Firestore Timestamp>
}
```

### users/{id}/hive_layout/main

```json
{
  "gridConfig": { "cols": 1000, "rows": 1000 },
  "players": [{ "id": "uuid", "name": "Gracz1", "level": "I8", "color": "#a855f7" }, ...],
  "placedPlayers": [{ "playerId": "uuid", "position": { "col": 5, "row": 3 } }, ...],
  "frankyPosition": { "col": 498, "row": 498 },
  "updatedAt": <Firestore Timestamp>
}
```

### Firestore security rules (`firestore.rules`)

```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /{document=**} {
  allow read, write: if false;  // blokuje wszystko inne
}
```

Każdy użytkownik czyta/pisze tylko swoje dokumenty. Bez auth = nic.

### localStorage

Tylko jeden klucz: `session_token` — ArcBot session ID używany do weryfikacji przy odświeżeniu. Zero danych mapowych w localStorage (stare klucze `frankenstein_layout_v1`, `allianceMapData` już nieużywane).

## Struktura kodu

```
src/
├── main.tsx                     # Entry point — renderuje <AuthProvider><App /></AuthProvider>
├── App.tsx                      # Router: /callback → OAuthCallback, reszta → AuthRouter
│                                  AuthRouter: isLoading → LoadingScreen
│                                              !user → LoginPage
│                                              user → <AllianceMapManager userId={user.id}>
├── firebaseConfig.ts            # Inicjalizacja Firebase (Firestore + Auth)
│                                  auth używa inMemoryPersistence — brak persistencji między reloadami
│                                  Eksportuje: db, auth
│
├── AllianceMapManager.tsx       # GŁÓWNY KOMPONENT — 1757 linii
│   ├── Props: { userId: string }
│   ├── Stan: alliances[], regionColors{}, manualCenterOverrides{}, activeAllianceId,
│   │         history[], historyPosition, mapScale/mapTranslate, UI flags
│   ├── Firestore: onSnapshot na users/{userId}/territory_map/main (load)
│   │             debounced setDoc 1s na zmianach (save)
│   ├── UI: header z UserMenu, tabs (Mapa / Hive Builder), panel boczny
│   ├── Undo/Redo: historia 20 wpisów, gałęzie przycinane przy nowej akcji
│   └── Export: PNG przez dom-to-image, Discord format tekstowy (formatDiscordMessage)
│
├── auth/                        # Moduł autoryzacji
│   ├── api.ts                  # Funkcje fetch do ArcBot API (getAuthState, exchangeCode,
│   │                              getFirebaseToken, getMe, logoutSession)
│   │                              Bazowy URL: VITE_ARC_API_URL (default http://localhost:8000)
│   ├── AuthContext.tsx          # React context: user, isLoading, login(), logout()
│   │                              Provider czyta session_token z localStorage przy starcie
│   │                              login() → redirect do Discord
│   │                              logout() → wywołuje logoutSession + signOut + czyści storage
│   └── OAuthCallback.tsx        # Strona /callback — wymiana code na Firebase token
│                                  Loading spinner → error card (retry) → redirect na /
│
├── components/                  # Komponenty UI (NIE mylić z ArcBot frontend/components/)
│   ├── LoadingScreen.tsx        # Full-screen spinner (isLoading=true)
│   ├── LoginPage.tsx            # Full-screen card z przyciskiem Discord (#5865F2)
│   └── UserMenu.tsx             # Avatar + username + dropdown Logout (w headerze)
│
└── frankenstein/                # Moduł Hive Builder
    ├── FrankensteinEventTab.tsx  # Główny komponent zakładki — props: { userId: string }
    │                               Renderuje GridCanvas + panele + ControlsBar
    ├── useFrankyLayout.ts       # Hook stanu — useReducer + Firestore sync (485 linii)
    │   ├── useFrankyLayout(userId: string) — akceptuje userId
    │   ├── Reducer: ADD/REMOVE/UPDATE_PLAYER, PLACE/MOVE, MOVE_FRANKY, RESIZE_GRID, RESET, LOAD
    │   ├── Firestore: onSnapshot na users/{userId}/hive_layout/main
    │   │             debounced setDoc 1s z saveStatus (saving → saved → idle / error)
    │   ├── Auto-place: spirala wokół Franky dla nowych graczy
    │   └── Eksportuje: frankyLayoutReducer, initialState (dla testów)
    ├── GridCanvas.tsx           # Canvas siatki z zoom (scroll), pan (drag), dotyk (pinch)
    ├── FrankyBlock.tsx          # Blok Hive 4×4 (drag source)
    ├── PlayerBlock.tsx          # Blok gracza 3×3 (drag source)
    ├── PlayerListPanel.tsx      # Lista graczy z edycją inline
    ├── AvailablePanel.tsx       # Panel nieprzypisanych graczy
    ├── ControlsBar.tsx          # Narzędzia: zoom, centruj, dodaj gracza
    ├── ResetModal.tsx           # Modal potwierdzenia resetu layoutu
    ├── OcrPreviewModal.tsx      # Modal podglądu wyników OCR importu
    ├── ocrImport.ts            # Logika importu OCR (Tesseract.js)
    ├── types.ts                 # Typy: Player, PlayerLevel (I2-I10), GridPosition, FirestoreLayoutDoc
    ├── gridUtils.ts            # Kolizje, bounds, pozycjonowanie
    ├── displayUtils.ts         # Formatowanie nazw, poziomów
    ├── exportUtils.ts          # Nazwy plików exportu
    ├── validation.ts           # Walidacja danych
    └── __tests__/               # 5 plików testowych (vitest)
        ├── useFrankyLayout.test.ts   # Testy reduktora (główne)
        ├── gridUtils.test.ts
        ├── displayUtils.test.ts
        ├── exportUtils.test.ts
        └── validation.test.ts
```

## Zależności zewnętrzne

### ArcBot API (FastAPI, port 8000)

Endpointy używane przez Territorymap:

| Endpoint | Metoda | Auth | Zwraca | Używane przez |
|----------|--------|------|--------|--------------|
| `/api/auth/state` | GET | brak | `{ state }` | AuthContext.login() |
| `/api/auth/discord/callback` | POST | brak | `{ session_id, user }` | OAuthCallback |
| `/api/auth/firebase-token` | POST | Bearer session_id | `{ firebaseToken }` | OAuthCallback, AuthContext |
| `/api/auth/me` | GET | Bearer session_id | `{ id, username, avatar }` | AuthContext (refresh) |
| `/api/auth/logout` | POST | Bearer session_id | 204 | AuthContext.logout() |

Endpoint `/api/auth/firebase-token` został dodany w ramach tego projektu. Wymaga `FIREBASE_SERVICE_ACCOUNT_KEY` w `.env` ArcBota.

### Firebase

- **Project**: `teritory-map-s49`
- **Firestore**: baza danych (dokumenty map)
- **Firebase Auth**: używane tylko przez `signInWithCustomToken` — nie ma rejestracji email/hasło
- **Firebase Hosting**: hostuje aplikację (`teritory-map-s49.web.app`)

## Zmienne środowiskowe

### `.env` (development — lokalny)

```
VITE_ARC_API_URL=http://localhost:8000
VITE_DISCORD_CLIENT_ID=1512539369142092027
VITE_GEMINI_API_KEY=...          # opcjonalnie, tylko OCR import
```

### `.env.production` (produkcja)

```
VITE_ARC_API_URL=https://arcbot.duckdns.org
VITE_DISCORD_CLIENT_ID=1512539369142092027
```

Ustawiane przed `npm run build`. Vite embeduje te wartości w bundle.

## Deployment

### Firebase Hosting

```bash
# W katalogu Territorymap:

npm run build                                  # buduje do dist/
firebase deploy --only firestore:rules         # najpierw reguły (jeśli zmienione)
firebase deploy --only hosting                 # potem hosting
```

Konfiguracja w `firebase.json`:
- `public: "dist"` — serwuje z katalogu builda
- `rewrites: [{ "source": "**", "destination": "/index.html" }]` — SPA routing dla `/callback`
- Hosting site: `teritory-map-s49` → URL: `https://teritory-map-s49.web.app`

### Discord OAuth redirect URIs (Discord Developer Portal)

Muszą być zarejestrowane:
- `http://localhost:5173/callback` (dev)
- `https://teritory-map-s49.web.app/callback` (prod)

### ArcBot API — wymagane zmiany na produkcji

1. `.env`: `FIREBASE_SERVICE_ACCOUNT_KEY=<base64-service-account-json>`
2. `.env`: `FRONTEND_URL` musi zawierać `https://teritory-map-s49.web.app` (CORS)
3. `requirements.txt`: `firebase-admin==6.6.0` (zainstalować)
4. Restart API: `systemctl restart bot-api`

## Jak to odpalić lokalnie

```bash
cd Teritorymap
npm install
npm run dev          # http://localhost:5173
```

Potrzebny ArcBot API na `localhost:8000` z:
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
- `FIREBASE_SERVICE_ACCOUNT_KEY`
- `FRONTEND_URL=http://localhost:5173` (CORS)

## Testy

```bash
npm run test         # vitest --run
```

5 plików testowych, wszystkie w `src/frankenstein/__tests__/`. Mockują Firebase przez `vi.mock()`.

Testy nie pokrywają: `AllianceMapManager` (za duży komponent), auth flow, komponenty UI.

## Co gdzie siedzi — szybka referencja

| Pytanie | Odpowiedź |
|---------|-----------|
| Dlaczego mapa się nie ładuje po odświeżeniu? | Session wygasło (24h). getMe → 401 → LoginPage. |
| Gdzie jest zapisany mój stan mapy? | Firestore: `users/{discordUserId}/territory_map/main` |
| Gdzie jest zapisany mój Hive Builder? | Firestore: `users/{discordUserId}/hive_layout/main` |
| Jak dodać nowy buff? | `AllianceMapManager.tsx` → `AVAILABLE_BUFFS` array, potem `PERMANENT_BUFFS` dla regionów |
| Jak dodać nowy region SVG? | `AllianceMapManager.tsx` → `REGION_DATA` array (d + x/y + number) |
| Dlaczego nie widzę danych innego użytkownika? | Firestore rules: `request.auth.uid == userId` |
| Gdzie obsługiwany jest token Discord? | `auth/api.ts` → `exchangeCode()` → ArcBot API |
| Czy guest mode istnieje? | Nie. Login obowiązkowy. |
| Co się stanie gdy ArcBot API nie działa? | getMe/login fail → błąd na callbacku lub LoginPage. Mapa się nie załaduje. |
| Co się stanie gdy Firebase nie działa? | onSnapshot error → saveStatus='error' w Hive Builder. Stan lokalny zachowany do reloadu. |
| Czy mogę używać bez Discorda? | Nie. |
| Jak zmienić Discord Client ID? | `.env` lub `.env.production` → `VITE_DISCORD_CLIENT_ID` |
| Jak dodać nową zakładkę? | `AllianceMapManager.tsx` — dodaj przycisk w headerze + warunkowe renderowanie |
| Gdzie jest logika importu OCR? | `frankenstein/ocrImport.ts` (Tesseract.js) |
| Czemu grid jest 1000×1000? | `useFrankyLayout.ts` → `DEFAULT_COLS = DEFAULT_ROWS = 1000`. Dostosowane pod duże hive. |

## Migawki z kodu

### Firestore sync pattern (używany w obu modułach)

```ts
// 1. Load — onSnapshot, pomija hasPendingWrites
useEffect(() => {
  const docRef = doc(db, 'users', userId, 'module_name', 'main');
  const unsub = onSnapshot(docRef, (snap) => {
    if (snap.metadata.hasPendingWrites) return;  // local write → skip
    if (!snap.exists()) { isInitRef.current = true; return; }  // first login
    isInitRef.current = true;
    const data = snap.data();
    // ... dispatch / setState ...
  });
  return unsub;
}, [userId]);

// 2. Save — debounced 1s, guard isInitializedRef
useEffect(() => {
  if (!isInitRef.current) return;  // skip before first snapshot
  const timer = setTimeout(() => {
    setDoc(doc(db, 'users', userId, 'module_name', 'main'), { ...data, updatedAt: serverTimestamp() });
  }, 1000);
  return () => clearTimeout(timer);
}, [userId, /* state fields */]);
```

### Auth flow (AuthContext)

```ts
// Przy starcie: sprawdź session_token → getMe → getFirebaseToken → signInWithCustomToken → gotowe
// Login: getAuthState → redirect do Discord
// Logout: logoutSession + signOut + clear localStorage → user=null → LoginPage
```
