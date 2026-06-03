import React, { useState, useEffect } from 'react';
import type { SaveStatus } from './types';

const GRID_MIN = 5;
const GRID_MAX = 40;

interface ControlsBarProps {
  cols: number;
  rows: number;
  onGridResize: (cols: number, rows: number) => void;
  onReset: () => void;
  onExport: () => void;
  saveStatus: SaveStatus;
}

/**
 * Pasek narzędzi z konfiguracją wymiarów siatki, przyciskami akcji i wskaźnikiem
 * statusu zapisu.
 *
 * Req 2.3  – pola numeryczne cols/rows z zakresem 5–40
 * Req 7.2  – wskaźnik statusu zapisu
 * Req 8.1  – przycisk „Resetuj układ" zawsze widoczny
 * Req 9.1  – przycisk „Eksportuj jako obraz" zawsze widoczny
 */
export function ControlsBar({
  cols,
  rows,
  onGridResize,
  onReset,
  onExport,
  saveStatus,
}: ControlsBarProps) {
  // Local controlled inputs — keep string representations to allow free typing
  const [colsInput, setColsInput] = useState(String(cols));
  const [rowsInput, setRowsInput] = useState(String(rows));

  // Validation error messages for each input
  const [colsError, setColsError] = useState<string | null>(null);
  const [rowsError, setRowsError] = useState<string | null>(null);

  // Sync local state when props change (e.g. from Firestore sync)
  useEffect(() => {
    setColsInput(String(cols));
    setColsError(null);
  }, [cols]);

  useEffect(() => {
    setRowsInput(String(rows));
    setRowsError(null);
  }, [rows]);

  /** Validate and apply a dimension change. Returns true if valid. */
  function applyDimension(
    rawValue: string,
    currentProp: number,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    which: 'cols' | 'rows'
  ): boolean {
    const parsed = parseInt(rawValue, 10);

    if (isNaN(parsed) || parsed < GRID_MIN || parsed > GRID_MAX) {
      const label = which === 'cols' ? 'kolumn' : 'wierszy';
      setError(`Liczba ${label} musi być w zakresie ${GRID_MIN}–${GRID_MAX}.`);
      // Revert to the current prop value
      setInput(String(currentProp));
      return false;
    }

    setError(null);
    return true;
  }

  const handleColsBlur = () => {
    const valid = applyDimension(colsInput, cols, setColsInput, setColsError, 'cols');
    if (valid) {
      const parsed = parseInt(colsInput, 10);
      if (parsed !== cols) {
        onGridResize(parsed, rows);
      }
    }
  };

  const handleRowsBlur = () => {
    const valid = applyDimension(rowsInput, rows, setRowsInput, setRowsError, 'rows');
    if (valid) {
      const parsed = parseInt(rowsInput, 10);
      if (parsed !== rows) {
        onGridResize(cols, parsed);
      }
    }
  };

  const handleColsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleRowsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-gray-800 border-b border-gray-700">
      {/* Grid dimension inputs */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-300 whitespace-nowrap">
          Wymiary siatki:
        </span>

        {/* Cols input */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <label htmlFor="grid-cols" className="text-xs text-gray-400 whitespace-nowrap">
              Kolumny
            </label>
            <input
              id="grid-cols"
              type="number"
              min={GRID_MIN}
              max={GRID_MAX}
              value={colsInput}
              onChange={(e) => {
                setColsInput(e.target.value);
                setColsError(null);
              }}
              onBlur={handleColsBlur}
              onKeyDown={handleColsKeyDown}
              className={`w-16 px-2 py-1 rounded text-sm text-center bg-gray-700 border
                ${colsError ? 'border-red-500 text-red-300' : 'border-gray-600 text-gray-100'}
                focus:outline-none focus:ring-1
                ${colsError ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}
              `}
              aria-describedby={colsError ? 'cols-error' : undefined}
            />
          </div>
          {colsError && (
            <p id="cols-error" role="alert" className="text-xs text-red-400 max-w-[160px]">
              {colsError}
            </p>
          )}
        </div>

        <span className="text-gray-500">×</span>

        {/* Rows input */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <label htmlFor="grid-rows" className="text-xs text-gray-400 whitespace-nowrap">
              Wiersze
            </label>
            <input
              id="grid-rows"
              type="number"
              min={GRID_MIN}
              max={GRID_MAX}
              value={rowsInput}
              onChange={(e) => {
                setRowsInput(e.target.value);
                setRowsError(null);
              }}
              onBlur={handleRowsBlur}
              onKeyDown={handleRowsKeyDown}
              className={`w-16 px-2 py-1 rounded text-sm text-center bg-gray-700 border
                ${rowsError ? 'border-red-500 text-red-300' : 'border-gray-600 text-gray-100'}
                focus:outline-none focus:ring-1
                ${rowsError ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}
              `}
              aria-describedby={rowsError ? 'rows-error' : undefined}
            />
          </div>
          {rowsError && (
            <p id="rows-error" role="alert" className="text-xs text-red-400 max-w-[160px]">
              {rowsError}
            </p>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="hidden sm:block h-6 w-px bg-gray-600" aria-hidden="true" />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Reset layout — Req 8.1 */}
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1.5 rounded text-sm font-medium bg-gray-700 hover:bg-gray-600
            text-gray-200 border border-gray-600 hover:border-gray-500
            focus:outline-none focus:ring-2 focus:ring-gray-500
            transition-colors duration-150"
        >
          Resetuj układ
        </button>

        {/* Export as image — Req 9.1 */}
        <button
          type="button"
          onClick={onExport}
          className="px-3 py-1.5 rounded text-sm font-medium bg-indigo-600 hover:bg-indigo-500
            text-white border border-indigo-500 hover:border-indigo-400
            focus:outline-none focus:ring-2 focus:ring-indigo-400
            transition-colors duration-150"
        >
          Eksportuj jako obraz
        </button>
      </div>

      {/* Save status indicator — Req 7.2 */}
      <SaveStatusIndicator status={saveStatus} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save status indicator
// ---------------------------------------------------------------------------

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  // Show nothing when idle
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-gray-400 text-sm" aria-live="polite">
        {/* Spinner */}
        <svg
          className="animate-spin h-4 w-4 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span>Zapisywanie…</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-green-400 text-sm" aria-live="polite">
        {/* Checkmark */}
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>Zapisano</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-red-400 text-sm" aria-live="assertive">
        {/* Warning icon */}
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        <span>Błąd zapisu — spróbuj ponownie</span>
      </div>
    );
  }

  return null;
}

export default ControlsBar;
