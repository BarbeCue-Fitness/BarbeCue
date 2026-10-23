/**
 * Every screen talks to the BarbeCue backend (backend/app). Response shapes are the
 * camelCase dicts the backend serializers build to match @/types exactly.
 * Base URL comes from EXPO_PUBLIC_API_URL (see frontend/README / backend README).
 */
import { create as axiosCreate, isAxiosError } from 'axios';
import { router } from 'expo-router';

import type { AuthUser, Filters, Match, Message, Progress, SwipeAction, User } from '@/types';
import { loadAuthRaw, saveAuthRaw } from '@/lib/auth-storage';

export const api = axiosCreate({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  timeout: 10_000,
});

// every request must carry the stored token; without this the server 401s
// every authenticated call (the bug that bounced the phone back to login)
api.interceptors.request.use((config) => {
  const token = authUser?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// a dead token (rotated server secret, 30-day expiry) used to brick the app on a
// spinner: any 401 while logged in now logs out and routes back to the gate
api.interceptors.response.use(undefined, (error) => {
  if (isAxiosError(error) && error.response?.status === 401 && authUser) {
    authUser = null;
    saveAuthRaw(null);
    router.replace('/login');
  }
  throw error;
});

/** Turns an axios failure into the sentence a user should see (backend `detail` wins). */
function toError(error: unknown): Error {
  if (isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (typeof detail === 'string') return new Error(detail);
    if (error.response?.status) return new Error(`Something went wrong (${error.response.status}). Try again.`);
    return new Error('Cannot reach the BarbeCue server. Check that the API is set in frontend/.env and running.');
  }
  return error instanceof Error ? error : new Error(String(error));
}

/** top-level type helpers re-exported from the screen contract */
export type MealItem = {
  name: string;
  grams: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: 'DB' | 'AI';
} & { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

export type MealResult = { items: MealItem[]; totals: { kcal: number; protein: number; carbs: number; fat: number; fiber: number } };

/* ---------------- Session ---------------- */

let authUser: AuthUser | null = null;

/** the signed-in user, in memory after loadSession() has run once at app start */
export function getSession(): AuthUser | null {
  return authUser;
}

async function setSession(user: AuthUser | null) {
  authUser = user;
  saveAuthRaw(user ? JSON.stringify(user) : null);
}

/** Restores the persisted session; only touches storage and network when a session exists. */
export async function loadSession(): Promise<AuthUser | null> {
  if (authUser) return authUser;
  try {
    const raw = loadAuthRaw();
    const user = raw ? (JSON.parse(raw) as AuthUser) : null;
    if (user?.id && user?.token) {
      authUser = user;
      return user;
    }
  } catch {
    // a corrupt or missing session just means "not logged in"
  }
  return null;
}

/* ---------------- Auth ---------------- */

export async function login(email: string, password: string): Promise<AuthUser> {
  try {
    const { data } = await api.post<AuthUser>('/auth/login', { email, password });
    await setSession(data);
    return data;
  } catch (error) {
    throw toError(error);
  }
}

export async function signUp(input: { name: string; email: string; password: string; dateOfBirth: string }): Promise<AuthUser> {
  try {
    const { data } = await api.post<AuthUser>('/auth/signup', input);
    await setSession(data);
    return data;
  } catch (error) {
    throw toError(error);
  }
}

export async function logout() {
  const current = authUser;
  // clear locally first so navigation can happen immediately; pass the token explicitly
  // because the request interceptor reads the now-empty in-memory session
  await setSession(null);
  if (current) {
    // stateless JWT: the server has nothing to revoke, so this is fire-and-forget
    void api.post('/auth/logout', null, { headers: { Authorization: `Bearer ${current.token}` } }).catch(() => {});
  }
}

/* ---------------- Discover / swiping ---------------- */

/** single- and multi-value filters → the /discover query string the backend parses */
const FILTER_PARAMS: Record<string, string> = {
  gender: 'gender',
  fitnessLevel: 'fitnessLevel',
  diet: 'diet',
  bodyType: 'bodyType',
  activityLevel: 'activityLevel',
  height: 'height',
  interests: 'interests',
  goals: 'goals',
  languages: 'languages',
};

export async function getDiscoverUsers(filters?: Partial<Filters>, mode: 'nearby' | 'standouts' = 'nearby'): Promise<User[]> {
  const params: Record<string, string | number> = { mode };
  if (filters?.ageRange) {
    params.ageMin = filters.ageRange[0];
    params.ageMax = filters.ageRange[1];
  }
  if (filters?.distance) params.distanceKm = filters.distance;
  for (const [field, param] of Object.entries(FILTER_PARAMS)) {
    const values = filters?.[field as keyof Filters] as string[] | undefined;
    if (values?.length) params[param] = values.join(',');
  }
  const { data } = await api.get<User[]>('/discover', { params });
  return data;
}

// the swiper UI says "skip"; the API says "pass"
const ACTION_MAP = { skip: 'pass', like: 'like', 'super-like': 'super-like' } as const;

export async function sendSwipe(action: SwipeAction): Promise<{ matched: boolean; matchId?: string }> {
  const { data } = await api.post<{ matched: boolean; matchId: string | null }>('/swipes', {
    userId: action.userId,
    action: ACTION_MAP[action.action],
  });
  return { matched: data.matched, matchId: data.matchId ?? undefined };
}

/* ---------------- Matches & chat ---------------- */

export async function getMatches(): Promise<Match[]> {
  const { data } = await api.get<Match[]>('/matches');
  return data;
}

export async function getMatchById(matchId: string): Promise<Match | undefined> {
  try {
    const { data } = await api.get<Match>(`/matches/${matchId}`);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return undefined;
    throw error;
  }
}

export async function getUserById(userId: string): Promise<User | undefined> {
  try {
    const { data } = await api.get<User>(`/users/${userId}`);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return undefined;
    throw error;
  }
}

export async function getLikesYou(): Promise<User[]> {
  const { data } = await api.get<User[]>('/matches/likes-you');
  return data;
}

export async function getMessages(matchId: string, after?: string): Promise<Message[]> {
  try {
    const { data } = await api.get<Message[]>(`/matches/${matchId}/messages`, { params: after ? { after } : {} });
    return data;
  } catch (error) {
    // the match may have been unmatched mid-request; an empty thread is the right answer then
    if (isAxiosError(error) && error.response?.status === 404) return [];
    throw error;
  }
}

export async function markMessagesRead(matchId: string): Promise<void> {
  await api.post(`/matches/${matchId}/read`).catch(() => {});
}

export async function sendMessage(matchId: string, text: string): Promise<Message> {
  try {
    const { data } = await api.post<Message>(`/matches/${matchId}/messages`, { text });
    return data;
  } catch (error) {
    throw toError(error);
  }
}

/* ---------------- Profile ---------------- */

export async function getMyProfile(): Promise<User> {
  const { data } = await api.get<User>('/me');
  return data;
}

/** used by lib/location.ts — the deck needs our pin before partners show up */
export async function updateMyLocation(latitude: number, longitude: number): Promise<void> {
  await api.patch('/me', { latitude, longitude });
}

/* ---------------- Nutrition scanner (runs server-side; the key never ships to the client) ---------------- */

export async function scanMeal(imageBase64: string): Promise<MealResult> {
  try {
    const { data } = await api.post<{
      items: { name: string; grams: number; conf: MealItem['confidence']; source: MealItem['source']; n: { kcal: number; protein: number; carbs: number; fat: number; fiber: number } }[];
      totals: MealResult['totals'];
    }>('/nutrition/scan', { imageBase64 }, { timeout: 90_000 });
    return {
      items: (data.items ?? []).map((item) => ({ name: item.name, grams: item.grams, confidence: item.conf, source: item.source, ...item.n })),
      totals: data.totals,
    };
  } catch (error) {
    throw toError(error);
  }
}

/* ---------------- Progress ---------------- */

// shortcut: no backend endpoint for training stats yet — keep demo data until /me/progress exists
const DEMO_PROGRESS: Progress = {
  streakDays: 6,
  training: [
    { day: 'Mon', minutes: 45, sessions: 1 },
    { day: 'Tue', minutes: 0, sessions: 0 },
    { day: 'Wed', minutes: 60, sessions: 1 },
    { day: 'Thu', minutes: 30, sessions: 1 },
    { day: 'Fri', minutes: 55, sessions: 1 },
    { day: 'Sat', minutes: 0, sessions: 0 },
    { day: 'Sun', minutes: 40, sessions: 1 },
  ],
  weight: [
    { week: 'W1', kg: 82.4 },
    { week: 'W2', kg: 82.0 },
    { week: 'W3', kg: 81.5 },
    { week: 'W4', kg: 81.6 },
    { week: 'W5', kg: 80.9 },
    { week: 'W6', kg: 80.2 },
  ],
  activity: [
    { week: 'W1', likes: 9, matches: 3 },
    { week: 'W2', likes: 11, matches: 4 },
    { week: 'W3', likes: 7, matches: 2 },
    { week: 'W4', likes: 14, matches: 5 },
    { week: 'W5', likes: 10, matches: 4 },
    { week: 'W6', likes: 12, matches: 6 },
  ],
};

export function getProgress(): Promise<Progress> {
  return Promise.resolve(DEMO_PROGRESS);
}
