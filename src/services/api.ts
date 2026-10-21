/**
 * Modular API layer. Every function is async so the UI never touches mock data
 * directly — swap the mock implementations for real axios calls when the
 * backend is ready. Base URL is read from EXPO_PUBLIC_API_URL.
 */
import { create as axiosCreate } from 'axios';

import type { AuthUser, Filters, Match, Message, SwipeAction, User } from '@/types';
import { PREFER_NOT_TO_SAY } from '@/constants/filters';
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

// A selectable filter matches members with the attribute, or undisclosed members when
// "Prefer not to say" is selected.
const matchesSelectable = (selected: string[] | undefined, value: string | undefined) =>
  !selected?.length ||
  selected.includes(value ?? '') ||
  (selected.includes(PREFER_NOT_TO_SAY) && !value);

export async function getDiscoverUsers(filters?: Partial<Filters>): Promise<User[]> {
  await delay();
  // TODO backend: GET /discover?ageMin&ageMax&distance&gender...
  if (!filters) return MOCK_USERS;

  const [minAge, maxAge] = filters.ageRange ?? [18, 99];
  return MOCK_USERS.filter((user) => {
    const height = user.height?.match(/(\d+)[’']\s*(\d+)/);
    const heightInches = height ? Number(height[1]) * 12 + Number(height[2]) : undefined;
    const heightCategory = heightInches === undefined
      ? ''
      : heightInches < 62
        ? 'under-5-2'
        : heightInches <= 68
          ? '5-2-to-5-8'
          : 'over-5-8';

    return user.age >= minAge &&
      user.age <= maxAge &&
      user.distance <= (filters.distance ?? 100) &&
      matchesSelectable(filters.gender, user.gender) &&
      (!filters.fitnessLevel?.length || filters.fitnessLevel.includes(user.fitnessLevel)) &&
      matchesSelectable(filters.diet, user.diet) &&
      (!filters.languages?.length || filters.languages.some((language) => user.languages.includes(language))) &&
      matchesSelectable(filters.activityLevel, user.activityLevel) &&
      (!filters.interests?.length || filters.interests.some((interest) => user.interests.includes(interest))) &&
      (!filters.goals?.length || filters.goals.some((goal) => user.goals.includes(goal))) &&
      matchesSelectable(filters.bodyType, user.bodyType) &&
      matchesSelectable(filters.height, heightCategory);
  });
}

export async function sendSwipe(action: SwipeAction): Promise<{ matched: boolean; matchId?: string }> {
  await delay(200);
  // TODO backend: POST /swipes { userId, action }
  const isLike = action.action === 'like' || action.action === 'super-like';
  if (!isLike) return { matched: false };

  const existing = MOCK_MATCHES.find((match) => match.user.id === action.userId);
  if (existing) return { matched: true, matchId: existing.id };

  const likedYou = MOCK_LIKES_YOU.find((user) => user.id === action.userId);
  if (!likedYou) return { matched: false };

  const matchId = `m${likedYou.id}`;
  MOCK_MATCHES.unshift({
    id: matchId,
    user: likedYou,
    matchedAt: new Date().toISOString(),
    hasUnread: false,
    unread: 0,
    category: 'new',
  });
  return { matched: true, matchId };
}

/* ---------------- Matches & chat ---------------- */

export async function getMatches(): Promise<Match[]> {
  await delay();
  // TODO backend: GET /matches
  return MOCK_MATCHES;
}

export async function getMatchById(matchId: string): Promise<Match | undefined> {
  await delay();
  return MOCK_MATCHES.find((match) => match.id === matchId);
}

export async function getUserById(userId: string): Promise<User | undefined> {
  await delay();
  return userId === CURRENT_USER.id ? CURRENT_USER : MOCK_USERS.find((user) => user.id === userId);
}

export async function getLikesYou(): Promise<User[]> {
  await delay();
  // TODO backend: GET /matches/likes-you
  return MOCK_LIKES_YOU;
}

export async function getMessages(matchId: string): Promise<Message[]> {
  await delay();
  // TODO backend: GET /matches/:id/messages
  return MOCK_MESSAGES.filter((message) => message.matchId === matchId);
}

export async function markMessagesRead(matchId: string): Promise<void> {
  await delay(100);
  for (const message of MOCK_MESSAGES) {
    if (message.matchId === matchId) message.read = true;
  }
  const match = MOCK_MATCHES.find((item) => item.id === matchId);
  if (match) {
    match.hasUnread = false;
    match.unread = 0;
  }
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
    read: false,
  };
  MOCK_MESSAGES.push(message);
  return message;
}

/* ---------------- Profile ---------------- */

export async function getMyProfile(): Promise<User> {
  await delay();
  // TODO backend: GET /me
  return CURRENT_USER;
}
