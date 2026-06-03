---
inclusion: auto
description: "Kontekst projektu Teritorymap — konwencje, architektura, workflow"
---

# Teritorymap — kontekst projektu

## Czym jest ten projekt

Interaktywna aplikacja webowa do zarządzania terytoriami sojuszy i planowania eventu Frankenstein w grze Dark War Survival.

## Architektura

- **Framework**: React 19 + TypeScript 5 + Vite 6
- **Styling**: Tailwind CSS 3.4
- **Backend**: Firebase Firestore (baza danych) + Firebase Hosting (deployment)
- **OCR**: Tesseract.js + Gemini API (import graczy ze screenshotów)
- **Testy**: Vitest + Testing Library + fast-check

## Dwie główne zakładki

1. **Mapa Terytoriów** (`AllianceMapManager.tsx`) — mapa SVG z 87 regionami, sojusze, buffy, limit 8 terytoriów/sojusz
2. **Frankenstein Event** (`src/frankenstein/`) — siatka 1000×1000, bloki graczy 3×3, Franky 4×4, drag & drop

## Kluczowe konwencje

- Dane zapisywane do Firestore z debounce 1s, localStorage jako fallback
- Moduł Frankenstein używa `useReducer` z typowanymi akcjami (pattern: dispatch actions)
- Siatka Frankenstein jest zawsze 1000×1000 komórek (DEFAULT_COLS/ROWS) 
- Kolory graczy zależą od poziomu (LEVEL_COLORS z types.ts)
- Gracze sortowani malejąco po poziomie wieży (I10 → I2)
- Export PNG używa canvas 2x dla ostrości tekstu

## Workflow deploymentu

```bash
npm run build      # tsc + vite build → dist/
firebase deploy --only hosting
```

Produkcja: https://teritory-map-s49.web.app

## Struktura Firestore

- Kolekcja `frankenstein_layouts`, dokument `main` — layout eventu Frankenstein
- Dane mapy terytoriów w localStorage (klucz: `allianceMapData`)

## Ważne pliki

- `src/frankenstein/useFrankyLayout.ts` — główny hook stanu + sync Firestore
- `src/frankenstein/types.ts` — typy, stałe, kolory
- `src/frankenstein/gridUtils.ts` — logika kolizji i pozycji
- `src/AllianceMapManager.tsx` — główny komponent (mapa + tabs)
- `src/firebaseConfig.ts` — Firebase init

## Styl kodu

- Komponenty: functional components z hooks
- State management: useReducer dla złożonych stanów, useState dla prostych
- Nazewnictwo: camelCase, angielskie nazwy zmiennych, polskie UI tam gdzie trzeba
- Inline styles w komponentach Frankenstein (historyczne, nie migrować do Tailwind bez powodu)
