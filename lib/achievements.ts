import type { AchievementId, Creature, DailyScore, Pair, UserAchievement } from "./types";
import { GAME_CONFIG } from "./gameConfig";

export const ACHIEVEMENTS: {
  id: AchievementId;
  hidden: boolean;
}[] = [
  { id: "first_step", hidden: false },
  { id: "quietly_on", hidden: true },
  { id: "came_back", hidden: true },
  { id: "long_road", hidden: true },
  { id: "two_person", hidden: true },
  { id: "family_grows", hidden: true },
];

export function evaluateAchievements(input: {
  userId: string;
  creature: Creature | null;
  scores: DailyScore[];
  pairs: Pair[];
  justRecovered: boolean;
  already: UserAchievement[];
  now: string;
}): UserAchievement[] {
  const have = new Set(
    input.already.filter((a) => a.userId === input.userId).map((a) => a.achievementId),
  );
  const add: UserAchievement[] = [];
  const unlock = (id: AchievementId) => {
    if (have.has(id)) return;
    have.add(id);
    add.push({ userId: input.userId, achievementId: id, unlockedAt: input.now });
  };
  const mine = input.scores.filter((s) => s.userId === input.userId);
  const streakDays = mine.filter((s) => s.isStreakDay).length;
  if (input.creature && (input.creature.currentStreak >= 1 || streakDays >= 1)) {
    unlock("first_step");
  }
  if (input.creature && input.creature.currentStreak >= 14) unlock("quietly_on");
  if (input.justRecovered) unlock("came_back");
  if (streakDays >= 100) unlock("long_road");
  const pair = input.pairs.find(
    (p) =>
      (p.userA === input.userId || p.userB === input.userId) &&
      p.syncPoints >= GAME_CONFIG.SYNC_POINTS_MARRIAGE_THRESHOLD,
  );
  if (pair) unlock("two_person");
  if (input.creature?.marriedAt || (input.creature?.generation ?? 1) > 1) unlock("family_grows");
  return add;
}

export const LETTER_MILESTONES = [7, 30, 100, 365] as const;
