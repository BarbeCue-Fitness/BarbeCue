/**
 * Modular API layer. Every function is async so the UI never touches mock data
 * directly — swap the mock implementations for real axios calls when the
 * backend is ready. Base URL is read from EXPO_PUBLIC_API_URL.
 */
import { create as axiosCreate } from 'axios';

import type { AuthUser, Filters, Match, Message, SwipeAction, User } from '@/types';
import { CURRENT_USER, MOCK_LIKES_YOU, MOCK_MATCHES, MOCK_MESSAGES, MOCK_USERS } from './mock-data';

export const api = axiosCreate({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  timeout: 10_000,
});

// Attach the auth token once the backend sets one up.
api.interceptors.request.use((config) => {
  const token = authUser?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let authUser: AuthUser | null = null;

// shortcut: in-memory auth session, not persisted — swap for SecureStore when backend lands
export function getSession() {
  return authUser;
}

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

/* ---------------- Auth ---------------- */

export async function login(email: string, password: string): Promise<AuthUser> {
  await delay();
  // TODO backend: POST /auth/login { email, password }
  if (!email.includes('@') || password.length < 6) {
    throw new Error('Invalid email or password (min 6 characters)');
  }
  authUser = { id: 'me', name: email.split('@')[0], email, token: 'mock-token' };
  return authUser;
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  dateOfBirth: string;
}): Promise<AuthUser> {
  await delay();
  // TODO backend: POST /auth/signup { ...input }
  if (!input.email.includes('@') || input.password.length < 6) {
    throw new Error('Invalid email or password (min 6 characters)');
  }
  authUser = { id: 'me', name: input.name, email: input.email, token: 'mock-token' };
  return authUser;
}

export function logout() {
  authUser = null;
}

/* ---------------- Discover / swiping ---------------- */

export async function getDiscoverUsers(filters?: Partial<Filters>): Promise<User[]> {
  await delay();
  // TODO backend: GET /discover?ageMin&ageMax&distance&gender...
  let users = MOCK_USERS;
  if (filters) {
    const [min, max] = filters.ageRange ?? [18, 99];
    users = users.filter(
      (u) =>
        u.age >= min &&
        u.age <= max &&
        u.distance <= (filters.distance ?? 100) &&
        (!filters.gender?.length || filters.gender.includes(u.gender ?? '')) &&
        (!filters.fitnessLevel?.length || filters.fitnessLevel.includes(u.fitnessLevel))
    );
  }
  return users;
}

export async function sendSwipe(action: SwipeAction): Promise<{ matched: boolean }> {
  await delay(200);
  // TODO backend: POST /swipes { userId, action }
  return { matched: action.action === 'like' && action.userId === '1' };
}

/* ---------------- Matches & chat ---------------- */

export async function getMatches(): Promise<Match[]> {
  await delay();
  // TODO backend: GET /matches
  return MOCK_MATCHES;
}

export async function getLikesYou(): Promise<User[]> {
  await delay();
  // TODO backend: GET /matches/likes-you
  return MOCK_LIKES_YOU;
}

export async function getMessages(matchId: string): Promise<Message[]> {
  await delay();
  // TODO backend: GET /matches/:id/messages
  return MOCK_MESSAGES.filter((m) => m.matchId === matchId);
}

export async function sendMessage(matchId: string, text: string): Promise<Message> {
  await delay(150);
  // TODO backend: POST /matches/:id/messages { text }
  const message: Message = {
    id: `msg-${Date.now()}`,
    matchId,
    senderId: authUser?.id ?? CURRENT_USER.id,
    text,
    timestamp: new Date().toISOString(),
    type: 'text',
  };
  return message;
}

/* ---------------- Profile ---------------- */

export async function getMyProfile(): Promise<User> {
  await delay();
  // TODO backend: GET /me
  return CURRENT_USER;
}
