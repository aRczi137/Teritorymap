/**
 * Tworzy nazwę pliku eksportu layoutu w formacie:
 * `franky_layout_YYYY-MM-DD_HH-MM.png`
 *
 * Gdzie:
 * - YYYY — 4-cyfrowy rok (lokalny)
 * - MM   — 2-cyfrowy miesiąc, uzupełniony zerami (lokalny)
 * - DD   — 2-cyfrowy dzień, uzupełniony zerami (lokalny)
 * - HH   — 2-cyfrowa godzina, uzupełniona zerami (lokalny)
 * - MM   — 2-cyfrowa minuta, uzupełniona zerami (lokalny)
 *
 * Przykład: franky_layout_2024-01-05_09-05.png
 *
 * Requirements: 9.3
 */
export function buildExportFilename(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');

  const year  = String(date.getFullYear()).padStart(4, '0');
  const month = pad(date.getMonth() + 1);
  const day   = pad(date.getDate());
  const hour  = pad(date.getHours());
  const min   = pad(date.getMinutes());

  return `franky_layout_${year}-${month}-${day}_${hour}-${min}.png`;
}
