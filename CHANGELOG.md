# Changelog — Lipiec 2026

## Nowa mapa: Season 6 (Fiordy)

- Mapa S6 z 462 regionami z pliku SVG (fiordy)
- Przyciski **S1** / **S6** w headerze mapy i na sidebarze do przełączania sezonów
- Wybór sezonu zapisywany per-user w Firestore

## Hive Builder: Szablony (Templates)

- **Save as Template** (admin) — zapisuje aktualny układ hive jako szablon w Firestore (`hive_templates`)
- **Load Template** (wszyscy) — modal z listą szablonów, kliknięcie ładuje układ na planszę
- Szablony globalne, dostępne dla wszystkich użytkowników
- Admin może usuwać szablony przez Devtools

## Devtools (admin, S6)

- Tryb **Devtools ON/OFF** — toggle w headerze mapy
- Kliknij terytorium → edytuj **level** (1–10)
- **Przeciągnij** numerek levela → zmień jego pozycję
- Przycisk **Lock/Unlock** — blokuje terytorium przed przypisaniem do sojuszu (znika level)
- **Dodaj budynek** — kliknij mapę w trybie devtools by postawić budynek
- Kliknij budynek by go usunąć
- Wszystkie zmiany globalne — zapis w `territory_map_s6/main` (Firestore)

## Mechanika S6 (różnice vs S1)

- **Brak buffów** — system bufów tylko dla S1
- **Brak limitu 8 terytoriów** — sojusze mogą zajmować dowolną liczbę pól
- **Brak domyślnych sojuszy** — użytkownik dodaje je sam
- **Brak CAP markera** — tylko na mapie S1

## Stylizacja mapy

- Tło S6: `#c78b58` (beżowy brąz)
- Przypisane terytoria: **gradient radialny** — ciemniejszy środek + jaśniejsza obwódka w kolorze sojuszu
- Border: **3px ciemnobrązowy** dla wszystkich pól + **3px jasny** (kolor sojuszu) dla przypisanych
- 90% opacity koloru sojuszu, 100% opacity tła
- Sortowanie regionów: małe na wierzchu (nie zasłaniają ich większe)
- Grubsze bordery (1px → 3px) dla lepszej widoczności

## Mobilne poprawki

- Panel toolsów (z-index 31) nad panelem graczy
- Panel graczy szerszy (280px) — nie przycina selecta levelu
- Przyciski S1/S6/DV widoczne na głównej stronie mapy (nie tylko w hamburger menu)
- Przeciąganie leveli działa na dotyk (transparentny touch target 40×40px)

## Infrastruktura

- **CORS** na nginx — API dostępne z Firebase (`teritory-map-s49.web.app`) i `www.arcbot.pro`
- **Vercel** proxy poprawione — `/teritorymap/*` → `arcbot.duckdns.org/teritorymap/*` (zachowuje prefix)
- **Firestore rules**: `hive_templates` (read all, write admin), `territory_map_s6` (read all, write admin)
- **Build output**: `outDir: dist/teritorymap` + Firebase rewrite ścieżek
- **VPS deploy**: `chmod 755` + anty-cache nagłówki na `index.html`

## Techniczne

- `lightenHex()` / `darkenHex()` — dynamiczne rozjaśnianie/przyciemnianie kolorów hex
- `radialGradient` SVG w `<defs>` dla każdego sojuszu
- Regiony sortowane po powierzchni (bounding box), małe na wierzchu
- Firestore shared document `territory_map_s6/main` dla globalnych danych S6
