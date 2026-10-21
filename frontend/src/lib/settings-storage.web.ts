const STORAGE_KEY = 'barbecue.settings';

export function loadSettingsRaw(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function saveSettingsRaw(raw: string) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, raw);
  } catch {
    // a storage failure must never break the app
  }
}
