/**
 * Sends the app's real position to the backend once per app launch.
 * Discover clears its deck when either side has no coordinates
 * (backend/app/matching.py), so a missing pin means an empty deck — never a crash.
 */
import * as Location from 'expo-location';

import { updateMyLocation } from '@/services/api';

let synced = false;
let lastOk = false;

/** Returns true when the backend has usable coordinates for this user. */
export async function syncLocation(): Promise<boolean> {
  if (synced) return lastOk;
  synced = true; // one prompt per launch, max — never nag twice in a session
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return false;
    const position = await Location.getCurrentPositionAsync({});
    await updateMyLocation(position.coords.latitude, position.coords.longitude);
    lastOk = true;
  } catch {
    // no location must never break the app; the deck shows empty until next launch
  }
  return lastOk;
}
