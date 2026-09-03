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

export type EyeShape = "oval" | "yuvarlak" | "badem" | "yildiz";
export type EarForm = "sivri" | "yuvarlak" | "dusuk" | "antenli";
export type SignatureDetail = "kalp_yanak" | "yildiz_parilti" | "minik_boynuz" | "none";
export type MicroAnim = "cift_kirpma" | "minik_donus" | "kuyruk_sallama" | "none";
export type Accessory = "none" | "fiyonk" | "yildiz_cikartma" | "cil";
export type DayPart = "morning" | "noon" | "evening" | "night";

export interface Genetics {
  eyeShape: EyeShape;
  earForm: EarForm;
  hueShift: number;
  signature: SignatureDetail;
  microAnim: MicroAnim;
  accessory: Accessory;
}

export interface MemoryLetter {
  milestone: 7 | 30 | 100 | 365;
  at: string;
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
  /** 0 = Sunday … 6 = Saturday. Null = no rest day. */
  restDayOfWeek: number | null;
  preferredWindow: DayPart | null;
  yearWrapSeen: number | null;
  weeklyReviewSeen: string | null;
  softDayCaps: Record<string, number>;
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
  parentAId: string | null;
  parentBId: string | null;
  generation: number;
  genetics: Genetics;
  eggShellVariant: string;
  rareMutation: boolean;
  unlockedRoomItems: string[];
  letters: MemoryLetter[];
}

export type TaskPriority = "low" | "medium" | "high";
export type TaskWorkStatus = "pending" | "done" | "postponed";

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  orderIndex: number;
  weight: number;
  completedAt: string | null;
}

export interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  note: string;
  startDate: string | null;
  targetDate: string | null;
  weeklyFrequency: number | null;
  dailyDurationMinutes: number | null;
  frequency: FrequencyPattern;
  color: string;
  status: GoalStatus;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  goalId: string | null;
  milestoneId: string | null;
  date: string;
  time: string | null;
  title: string;
  description: string;
  note: string;
  estimatedDurationMinutes: number | null;
  priority: TaskPriority;
  tag: string | null;
  repeatPattern: FrequencyPattern | null;
  checklist: ChecklistItem[];
  reminderOffsetMinutes: number | null;
  status: TaskWorkStatus;
  postponedToDate: string | null;
  weight: number;
  completed: boolean;
  completedAt: string | null;
}

/** Occupied time independent of app tasks — ready for a future external calendar. */
export interface BusySlot {
  id: string;
  userId: string;
  date: string;
  startMin: number;
  endMin: number;
  source: "app" | "external";
  title?: string;
}

export interface OfflineOp {
  id: string;
  kind: "toggle" | "add" | "update" | "postpone" | "move";
  payload: Record<string, unknown>;
  createdAt: string;
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
  mutated?: boolean;
}

export interface SharedQuest {
  id: string;
  fromUser: string;
  toUser: string;
  date: string;
  title: string;
  taskAId: string;
  taskBId: string;
}

export type CompanionStatus = "pending" | "accepted" | "declined";

export interface TaskCompanion {
  id: string;
  taskId: string;
  fromUser: string;
  toUser: string;
  status: CompanionStatus;
  createdAt: string;
}

export type AchievementId =
  | "first_step"
  | "quietly_on"
  | "came_back"
  | "long_road"
  | "two_person"
  | "family_grows";

export interface UserAchievement {
  userId: string;
  achievementId: AchievementId;
  unlockedAt: string;
}

export type NoticeKind =
  | "poke"
  | "evolution"
  | "bond"
  | "marriage"
  | "streak"
  | "letter"
  | "achievement"
  | "together";

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
  | "crack"
  | "worried";
