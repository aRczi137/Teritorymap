/**
 * Google Analytics 4 event tracking utility.
 * Uses the global gtag() function injected via index.html.
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// ─── Tab navigation ──────────────────────────────────────────────────────────

export function trackTabSwitch(tab: 'map' | 'hive_builder') {
  trackEvent('tab_switch', { tab_name: tab });
}

// ─── Territory Map events ────────────────────────────────────────────────────

export function trackTerritoryAssign(regionId: string, allianceName: string) {
  trackEvent('territory_assign', { region_id: regionId, alliance_name: allianceName });
}

export function trackMapExport() {
  trackEvent('map_export_png');
}

// ─── Hive Builder events ─────────────────────────────────────────────────────

export function trackPlayerAdd(method: 'manual' | 'ocr') {
  trackEvent('player_add', { method });
}

export function trackHiveExport() {
  trackEvent('hive_export_png');
}

export function trackOcrImport() {
  trackEvent('ocr_import_start');
}

export function trackPlayerPlace() {
  trackEvent('player_place_on_grid');
}

export function trackTemplateLoad(templateId: string) {
  trackEvent('template_load', { template_id: templateId });
}

export function trackTemplateSave() {
  trackEvent('template_save');
}
