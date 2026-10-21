export interface User {
  id: string;
  name: string;
  age: number;
  distance: number; // km
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  focus: string; // e.g. 'Strength', 'Cardio', 'Beginner', 'Yoga'
  bio: string;
  avatar: string;
  interests: string[];
  goals: string[];
  schedule: string;
  languages: string[];
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
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  timestamp: string;
  type: 'text' | 'image';
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
  height: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  token: string;
}