const STORAGE_KEY = 'barbecue.auth';

export function loadAuthRaw(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function saveAuthRaw(raw: string | null) {
  try {
    if (raw === null) {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } else {
      globalThis.localStorage?.setItem(STORAGE_KEY, raw);
    }
  } catch {
    // a storage failure must never break the app
  }
}
