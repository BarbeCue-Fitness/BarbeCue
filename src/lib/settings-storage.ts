import Storage from 'expo-sqlite/kv-store';

const STORAGE_KEY = 'barbecue.settings';

export function loadSettingsRaw(): string | null {
  try {
    return Storage.getItemSync(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveSettingsRaw(raw: string) {
  try {
    Storage.setItemSync(STORAGE_KEY, raw);
  } catch {
    // a storage failure must never break the app
  }
}
