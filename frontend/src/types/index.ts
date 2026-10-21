export interface User {
  id: string;
  name: string;
  age: number;
  distance: number; // km
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  focus: string; // e.g. 'Strength', 'Cardio', 'Beginner', 'Yoga'
  bio: string;
  prompt: string; // "Looking for" prompt answer shown on the discover card
  avatar: string;
  photos: string[];
  interests: string[];
  goals: string[];
  schedule: string;
  languages: string[];
  verified?: boolean;
  activeNow?: boolean;
  standout?: boolean;
  bodyType?: string;
  diet?: string;
  activityLevel?: 'Low' | 'Moderate' | 'High';
  height?: string;
  ethnicity?: string;
  gender?: 'Male' | 'Female' | 'Non-binary';
}

export interface SwipeAction {
  userId: string;
  action: 'like' | 'skip' | 'super-like';
  timestamp: string;
}

export interface Match {
  id: string;
  user: User;
  matchedAt: string;
  hasUnread: boolean;
  unread: number;
  category?: 'new' | 'active' | 'expired';
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  timestamp: string;
  type: 'text' | 'image';
  read?: boolean;
}

export interface Filters {
  ageRange: [number, number];
  distance: number;
  gender: string[];
  fitnessLevel: string[];
  diet: string[];
  languages: string[];
  activityLevel: string[];
  interests: string[];
  goals: string[];
  bodyType: string[];
  height: string[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  token: string;
}

export interface Progress {
  streakDays: number;
  /** One entry per day, oldest first. */
  training: { day: string; minutes: number; sessions: number }[];
  /** One entry per week, oldest first. */
  weight: { week: string; kg: number }[];
  /** One entry per week, oldest first. */
  activity: { week: string; likes: number; matches: number }[];
}
