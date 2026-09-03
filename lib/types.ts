import type { CreatureStage, HealthStatus } from "./gameConfig";

export type { HealthStatus };
export type SpeciesId = "tofiby" | "bulut" | "yildiz" | "gizem" | "isilti";

export type CreatureStatus = "active" | "retired";
export type GoalStatus = "active" | "archived";
export type FriendshipStatus = "pending" | "accepted";
export type PairStatus = "bonded" | "married";
export type FrequencyKind = "daily" | "weekdays" | "times_per_week" | "custom";

export interface FrequencyPattern {
  kind: FrequencyKind;
  timesPerWeek?: number;
  weekdays?: number[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  timezone: string;
  createdAt: string;
  onboarded: boolean;
  theme: "ink" | "dusk";
  notifyPoke: boolean;
  notifyEvolution: boolean;
}

export interface Creature {
  id: string;
  ownerId: string;
  name: string;
  speciesId: SpeciesId;
  stage: CreatureStage;
  totalGp: number;
  currentStreak: number;
  longestStreak: number;
  hueShift: number;
  adultReachedAt: string | null;
  adultGpSnapshot: number | null;
  hatchedAt: string | null;
  health: HealthStatus;
  consecutiveZeroDays: number;
  recoveryStreak: number;
  status: CreatureStatus;
  createdAt: string;
  retiredAt: string | null;
  spouseOwnerId: string | null;
  spouseCreatureName: string | null;
  marriedAt: string | null;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  note: string;
  targetDate: string | null;
  frequency: FrequencyPattern;
  color: string;
  status: GoalStatus;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  goalId: string | null;
  date: string;
  title: string;
  note: string;
  weight: number;
  completed: boolean;
  completedAt: string | null;
}

export interface DailyScore {
  userId: string;
  date: string;
  dcs: number | null;
  isStreakDay: boolean;
  gpEarned: number;
  finalized: boolean;
}

export interface Friendship {
  id: string;
  userA: string;
  userB: string;
  status: FriendshipStatus;
  createdAt: string;
}

export interface Pair {
  id: string;
  userA: string;
  userB: string;
  creatureAId: string;
  creatureBId: string;
  status: PairStatus;
  syncPoints: number;
  bondedAt: string;
  marriedAt: string | null;
}

export interface Poke {
  id: string;
  fromUser: string;
  toUser: string;
  date: string;
}

export interface OffspringLog {
  id: string;
  pairId: string;
  resultingSpeciesId: SpeciesId;
  resultingHue: number;
  createdAt: string;
}

export type NoticeKind = "poke" | "evolution" | "bond" | "marriage" | "streak";

export interface Notice {
  id: string;
  userId: string;
  kind: NoticeKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
}

export type AnimationState =
  | "idle"
  | "blink"
  | "bounce"
  | "happy"
  | "sleepy"
  | "look"
  | "yawn"
  | "sick"
  | "sparkle"
  | "crack";
