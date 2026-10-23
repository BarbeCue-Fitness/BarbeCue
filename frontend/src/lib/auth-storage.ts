import Storage from 'expo-sqlite/kv-store';

const STORAGE_KEY = 'barbecue.auth';

export function loadAuthRaw(): string | null {
  try {
    return Storage.getItemSync(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveAuthRaw(raw: string | null) {
  try {
    if (raw === null) {
      Storage.removeItemSync(STORAGE_KEY);
    } else {
      Storage.setItemSync(STORAGE_KEY, raw);
    }
  } catch {
    // a storage failure must never break the app
  }
}
