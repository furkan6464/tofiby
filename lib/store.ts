"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { GAME_CONFIG, STAGE_ORDER, type CreatureStage } from "./gameConfig";
import {
  applyDayFinalization,
  dailyCompletionScore,
  gpToNextStage,
  isStreakDay,
  isUnionReady,
  nextHealth,
  nextSyncPoints,
  recoveryBarPct,
  scoreFromTasks,
  unionBarPct,
} from "./growthEngine";
import { resolvedGender, speciesGender } from "@/data/species/catalog";
import { assignHiddenEggSpecies, breedOffspring, defaultGenetics, eggShellVariant } from "./genetics";
import {
  addDays,
  canMutateTaskDate,
  detectTimezone,
  diffDays,
  minutesInZone,
  todayKey,
  weekdayOf,
} from "./dates";
import { enumerateDates, matchesFrequency } from "./frequency";
import { hashPass, parseFriendHandle, uid, validUsername } from "./ids";
import { t } from "./i18n";
import { celebrate } from "./confetti";
import type {
  BusySlot,
  AiMemoryNote,
  ChatThread,
  ChatThreadMessage,
  Creature,
  CreatureGender,
  DailyScore,
  FocusRun,
  FrequencyPattern,
  Friendship,
  Goal,
  Milestone,
  Notice,
  RecurringSession,
  OfflineOp,
  OffspringLog,
  Pair,
  Poke,
  SharedQuest,
  SpeciesId,
  Task,
  TaskCompanion,
  UserAchievement,
  UserProfile,
} from "./types";
import { scheduleHours, syncMilestoneCompletion } from "./plan";
import { evaluateAchievements, LETTER_MILESTONES } from "./achievements";
import { isRestWeekday, roomUnlocks } from "./bond";
import {
  cloudAcceptFriendship,
  cloudEnabled,
  cloudInsertFriendship,
  cloudInsertPair,
  cloudInsertPoke,
  cloudInsertTogetherInvite,
  cloudLookupFriend,
  cloudMarkNoticesRead,
  cloudPublishCreature,
  cloudClearMemory,
  cloudDeleteMemory,
  cloudPullMemory,
  cloudPullSocial,
  cloudUpsertMemory,
  cloudDeleteAccount,
  cloudSession,
  cloudSetOnboarded,
  cloudSignIn,
  cloudSignOut,
  cloudSignUp,
  type CloudProfile,
} from "./cloud";

interface Account extends UserProfile {
  passwordHash: string;
}

export interface Toast {
  id: string;
  text: string;
}

interface DraftGoal {
  title: string;
  taskTitle: string;
  note: string;
  startDate?: string | null;
  targetDate: string | null;
  weeklyFrequency?: number | null;
  dailyDurationMinutes?: number | null;
  frequency: FrequencyPattern;
  color: string;
  milestones?: { title: string; weight: number }[];
}

interface AppState {
  hydrated: boolean;
  users: Account[];
  sessionUserId: string | null;
  creatures: Creature[];
  goals: Goal[];
  milestones: Milestone[];
  tasks: Task[];
  busySlots: BusySlot[];
  offlineOps: OfflineOp[];
  scores: DailyScore[];
  friendships: Friendship[];
  pairs: Pair[];
  pokes: Poke[];
  notices: Notice[];
  offspring: OffspringLog[];
  sharedQuests: SharedQuest[];
  taskCompanions: TaskCompanion[];
  achievements: UserAchievement[];
  chatThreads: ChatThread[];
  aiMemory: AiMemoryNote[];
  aiMemoryCursor: Record<string, { seen: number; at: string }>;
  focusRuns: Record<string, FocusRun>;
  toasts: Toast[];
  widgetAnim: "idle" | "bounce" | "happy" | "sleepy" | "sick" | "worried" | "yawn";
  pendingHatch: boolean;
  pendingMutation: boolean;
  pendingLetter: Creature["letters"][number] | null;
  pendingTogether: boolean;
  sessionWoke: boolean;
  setHydrated: (v: boolean) => void;
  register: (input: {
    username: string;
    email: string;
    password: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  login: (
    identifier: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  bootCloud: () => Promise<void>;
  syncCloudSocial: () => Promise<void>;
  completeOnboarding: (input: {
    creatureName: string;
    goals: DraftGoal[];
    speciesId?: SpeciesId;
    hueShift?: number;
    gender?: CreatureGender;
  }) => void;
  addGoal: (draft: DraftGoal) => { id: string; taskIds: string[] } | null;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  archiveGoal: (id: string, archived: boolean) => void;
  addTask: (input: {
    date: string;
    title: string;
    note?: string;
    description?: string;
    priority?: Task["priority"];
    goalId?: string | null;
    milestoneId?: string | null;
    weight?: number;
    time?: string | null;
    estimatedDurationMinutes?: number | null;
  }) => string | null;
  addRecurringSessions: (sessions: RecurringSession[]) => {
    added: number;
    firstDate: string | null;
    taskIds: string[];
  };
  updateTask: (id: string, patch: Partial<Task>) => void;
  moveTask: (id: string, date: string, time?: string | null) => void;
  postponeTask: (id: string, toDate: string) => void;
  addMilestone: (goalId: string, title: string, weight?: number) => void;
  toggleMilestone: (id: string) => void;
  planHours: (
    title: string,
    hours: number,
    week: string[],
    goalId?: string | null,
    preferStartMin?: number | null,
  ) => { added: number; taskIds: string[]; minutesPlaced: number; minutesNeeded: number };
  removeTasks: (ids: string[]) => void;
  removeGoal: (id: string) => void;
  flushOffline: () => void;
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;
  updateTaskSeries: (
    id: string,
    patch: Partial<Pick<Task, "title" | "note" | "weight">>,
    scope: "one" | "future",
  ) => void;
  toggleTask: (id: string) => { streakJustHit: boolean; closed: boolean; hatched: boolean };
  finalizePending: (now?: Date) => void;
  updateSettings: (patch: Partial<UserProfile>) => void;
  addFriend: (username: string) => Promise<{ ok: boolean; error?: string }>;
  acceptFriend: (id: string) => void;
  poke: (toUser: string) => { ok: boolean; error?: string };
  bond: (friendId: string) => { ok: boolean; error?: string };
  markNoticesRead: () => void;
  markNoticeRead: (id: string) => void;
  pushNotice: (input: {
    id: string;
    kind: Notice["kind"];
    title: string;
    body: string;
    href?: string;
  }) => boolean;
  pushToast: (text: string) => void;
  dismissToast: (id: string) => void;
  setWidgetAnim: (a: AppState["widgetAnim"]) => void;
  dismissHatch: () => void;
  dismissMutation: () => void;
  dismissLetter: () => void;
  dismissTogether: () => void;
  markWoke: () => void;
  proposeTogether: (friendId: string, title: string) => { ok: boolean; error?: string };
  inviteCompanion: (taskId: string, friendId: string) => { ok: boolean; error?: string };
  respondCompanion: (id: string, accept: boolean) => void;
  cancelCompanion: (id: string) => void;
  saveChatThread: (input: { id?: string | null; messages: ChatThreadMessage[] }) => string;
  deleteChatThread: (id: string) => void;
  addMemoryNotes: (notes: Omit<AiMemoryNote, "id" | "userId" | "createdAt">[]) => AiMemoryNote[];
  removeMemory: (id: string) => void;
  clearMemory: () => void;
  markMemoryDistilled: (seen: number) => void;
  saveFocusRun: (key: string, run: FocusRun) => void;
  clearFocusRun: (key: string) => void;
}

function makeEgg(ownerId: string, name: string, gender: CreatureGender = "kiz"): Creature {
  const now = new Date().toISOString();
  const gene = assignHiddenEggSpecies(ownerId, now, gender);
  return {
    id: uid(),
    ownerId,
    name,
    speciesId: gene.speciesId,
    gender,
    stage: "egg",
    totalGp: 0,
    currentStreak: 0,
    longestStreak: 0,
    hueShift: gene.hueShift,
    adultReachedAt: null,
    adultGpSnapshot: null,
    hatchedAt: null,
    health: "active",
    consecutiveZeroDays: 0,
    recoveryStreak: 0,
    status: "active",
    createdAt: now.slice(0, 10),
    retiredAt: null,
    spouseOwnerId: null,
    spouseCreatureName: null,
    marriedAt: null,
    parentAId: null,
    parentBId: null,
    generation: 1,
    genetics: gene.genetics,
    eggShellVariant: eggShellVariant(gene.speciesId, gene.hueShift),
    rareMutation: false,
    unlockedRoomItems: [],
    letters: [],
  };
}

function hydrateTask(partial: Partial<Task> & Pick<Task, "id" | "userId" | "date" | "title">): Task {
  return {
    goalId: null,
    milestoneId: null,
    time: null,
    description: "",
    note: "",
    estimatedDurationMinutes: null,
    priority: "medium",
    tag: null,
    repeatPattern: null,
    checklist: [],
    reminderOffsetMinutes: 120,
    postponedToDate: null,
    weight: GAME_CONFIG.DEFAULT_TASK_WEIGHT,
    completed: false,
    completedAt: null,
    ...partial,
    status:
      partial.status ??
      (partial.completed ? "done" : "pending"),
  };
}

function hydrateGoal(partial: Partial<Goal> & Pick<Goal, "id" | "userId" | "title">): Goal {
  return {
    note: "",
    startDate: partial.createdAt ?? null,
    targetDate: null,
    weeklyFrequency: null,
    dailyDurationMinutes: 30,
    frequency: { kind: "daily" },
    color: "#8B5CF6",
    createdAt: new Date().toISOString().slice(0, 10),
    ...partial,
    status: partial.status === "archived" ? "archived" : "active",
  };
}

function nextOffline(
  ops: OfflineOp[],
  kind: OfflineOp["kind"],
  payload: Record<string, unknown>,
): OfflineOp[] {
  if (typeof navigator !== "undefined" && navigator.onLine) return ops;
  return [
    ...ops,
    { id: uid(), kind, payload, createdAt: new Date().toISOString() },
  ];
}

function generateTasks(goal: Goal, from: string, to: string): Task[] {
  return enumerateDates(from, to)
    .filter((date) => matchesFrequency(date, goal.frequency))
    .map((date) =>
      hydrateTask({
        id: uid(),
        userId: goal.userId,
        goalId: goal.id,
        date,
        title: goal.title,
        note: goal.note,
        estimatedDurationMinutes: goal.dailyDurationMinutes,
      }),
    );
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      users: [],
      sessionUserId: null,
      creatures: [],
      goals: [],
      milestones: [],
      tasks: [],
      busySlots: [],
      offlineOps: [],
      scores: [],
      friendships: [],
      pairs: [],
      pokes: [],
      notices: [],
      offspring: [],
      sharedQuests: [],
      taskCompanions: [],
      achievements: [],
      chatThreads: [],
      aiMemory: [],
      aiMemoryCursor: {},
      focusRuns: {},
      toasts: [],
      widgetAnim: "idle",
      pendingHatch: false,
      pendingMutation: false,
      pendingLetter: null,
      pendingTogether: false,
      sessionWoke: false,
      setHydrated: (v) => set({ hydrated: v }),
      register: async ({ username, email, password }) => {
        if (!validUsername(username)) return { ok: false, error: t("auth.errorUser") };
        if (password.length < 6) return { ok: false, error: t("auth.errorShort") };
        const taken = get().users.some(
          (u) =>
            u.username.toLowerCase() === username.toLowerCase() ||
            u.email.toLowerCase() === email.toLowerCase(),
        );
        if (cloudEnabled()) {
          const cloud = await cloudSignUp({
            username,
            email,
            password,
            timezone: detectTimezone(),
          });
          if (!cloud.ok) return cloud;
          const user = makeAccount({
            id: cloud.userId,
            username,
            email,
            password,
          });
          set({
            users: [...get().users.filter((u) => u.id !== user.id), user],
            sessionUserId: user.id,
          });
          return { ok: true };
        }
        if (taken) return { ok: false, error: t("auth.errorTaken") };
        const user = makeAccount({
          id: uid(),
          username,
          email,
          password,
        });
        set({ users: [...get().users, user], sessionUserId: user.id });
        return { ok: true };
      },
      login: async (identifier, password) => {
        if (cloudEnabled()) {
          const cloud = await cloudSignIn(identifier, password);
          if (cloud.ok) {
            const prev = get().users.find(
              (u) =>
                u.id === cloud.userId ||
                u.email.toLowerCase() === cloud.email.toLowerCase() ||
                u.username.toLowerCase() === cloud.username.toLowerCase(),
            );
            const user: Account = {
              ...(prev ?? makeAccount({
                id: cloud.userId,
                username: cloud.username,
                email: cloud.email,
                password,
              })),
              id: cloud.userId,
              username: cloud.username,
              email: cloud.email,
              passwordHash: hashPass(password),
              onboarded: prev?.onboarded || cloud.onboarded,
            };
            set({
              users: [...get().users.filter((u) => u.id !== user.id && u !== prev), user],
              sessionUserId: user.id,
            });
            await get().syncCloudSocial();
            return { ok: true };
          }
        }
        const key = identifier.trim().toLowerCase();
        const user = get().users.find(
          (u) =>
            u.username.toLowerCase() === key || u.email.toLowerCase() === key,
        );
        if (!user || user.passwordHash !== hashPass(password)) {
          return { ok: false, error: t("auth.errorCreds") };
        }
        set({ sessionUserId: user.id });
        return { ok: true };
      },
      logout: () => {
        void cloudSignOut();
        set({ sessionUserId: null });
      },
      bootCloud: async () => {
        const session = await cloudSession();
        if (!session) return;
        const prev = get().users.find((u) => u.id === session.userId);
        const user: Account = prev
          ? {
              ...prev,
              username: session.username || prev.username,
              email: session.email || prev.email,
              onboarded: prev.onboarded || session.onboarded,
            }
          : makeAccount({
              id: session.userId,
              username: session.username || "user",
              email: session.email,
              password: "",
            });
        if (!prev) {
          set({ users: [...get().users, { ...user, onboarded: session.onboarded }], sessionUserId: session.userId });
        } else {
          set({
            users: get().users.map((u) => (u.id === session.userId ? user : u)),
            sessionUserId: session.userId,
          });
        }
        await get().syncCloudSocial();
        try {
          const remoteMem = await cloudPullMemory(session.userId);
          if (remoteMem?.length) {
            const local = get().aiMemory ?? [];
            const have = new Set(local.filter((n) => n.userId === session.userId).map((n) => n.id));
            const extra = remoteMem.filter((n) => n.text && !have.has(n.id));
            if (extra.length) set({ aiMemory: [...local, ...extra] });
          }
        } catch {
          /* tablo yoksa veya ağ düşerse yerel hafıza yeter */
        }
        const mine = get().creatures.find((c) => c.ownerId === session.userId && c.status === "active");
        if (mine) await cloudPublishCreature(mine);
      },
      syncCloudSocial: async () => {
        const user = currentUser(get());
        if (!user || !cloudEnabled()) return;
        const pulled = await cloudPullSocial(user.id);
        if (!pulled) return;
        const remoteOwners = new Set(pulled.creatures.map((c) => c.ownerId));
        set({
          users: mergeCloudProfiles(get().users, pulled.profiles),
          friendships: pulled.friendships,
          notices: [
            ...get().notices.filter(
              (n) => n.userId !== user.id || n.kind === "remind" || n.kind === "smart",
            ),
            ...pulled.notices,
          ],
          pokes: pulled.pokes,
          pairs: pulled.pairs,
          creatures: [
            ...get().creatures.filter(
              (c) => c.ownerId === user.id || !remoteOwners.has(c.ownerId),
            ),
            ...pulled.creatures,
          ],
        });
      },
      completeOnboarding: ({ creatureName, goals: drafts, speciesId, hueShift, gender }) => {
        const user = currentUser(get());
        if (!user) return;
        const today = todayKey(user.timezone);
        const horizon = addDays(today, GAME_CONFIG.TASK_HORIZON_DAYS);
        const pickedGender = gender ?? (speciesId ? speciesGender(speciesId) : "kiz");
        const creature = makeEgg(user.id, creatureName.trim() || t("creature.unnamed"), pickedGender);
        if (speciesId) {
          creature.speciesId = speciesId;
          creature.gender = speciesGender(speciesId);
          creature.genetics = defaultGenetics(speciesId, creature.hueShift, [user.id, creature.id]);
          creature.eggShellVariant = eggShellVariant(speciesId, creature.hueShift);
        }
        if (typeof hueShift === "number") {
          creature.hueShift = hueShift;
          creature.genetics = { ...creature.genetics, hueShift };
          creature.eggShellVariant = eggShellVariant(creature.speciesId, hueShift);
        }
        const goals: Goal[] = [];
        const tasks: Task[] = [];
        for (const d of drafts) {
          if (!d.title.trim()) continue;
          const goal: Goal = {
            id: uid(),
            userId: user.id,
            title: d.title.trim(),
            note: d.note,
            startDate: d.startDate ?? today,
            targetDate: d.targetDate,
            weeklyFrequency: d.weeklyFrequency ?? null,
            dailyDurationMinutes: d.dailyDurationMinutes ?? 30,
            frequency: d.frequency,
            color: d.color,
            status: "active",
            createdAt: today,
          };
          goals.push(goal);
          const end = d.targetDate && d.targetDate < horizon ? d.targetDate : horizon;
          tasks.push(
            ...generateTasks(goal, today, end).map((task) => ({
              ...task,
              title: d.taskTitle.trim() || d.title.trim(),
            })),
          );
        }
        set({
          users: get().users.map((u) =>
            u.id === user.id ? { ...u, onboarded: true } : u,
          ),
          creatures: [...get().creatures, creature],
          goals: [...get().goals, ...goals],
          tasks: [...get().tasks, ...tasks],
        });
        void cloudSetOnboarded(user.id);
        void cloudPublishCreature(creature);
      },
      addGoal: (draft) => {
        const user = currentUser(get());
        if (!user) return null;
        const today = todayKey(user.timezone);
        const horizon = addDays(today, GAME_CONFIG.TASK_HORIZON_DAYS);
        const goal: Goal = {
          id: uid(),
          userId: user.id,
          title: draft.title.trim(),
          note: draft.note,
          startDate: draft.startDate ?? today,
          targetDate: draft.targetDate,
          weeklyFrequency: draft.weeklyFrequency ?? null,
          dailyDurationMinutes: draft.dailyDurationMinutes ?? 30,
          frequency: draft.frequency,
          color: draft.color,
          status: "active",
          createdAt: today,
        };
        const end =
          draft.targetDate && draft.targetDate < horizon ? draft.targetDate : horizon;
        const stones: Milestone[] = (draft.milestones ?? []).map((m, i) => ({
          id: uid(),
          goalId: goal.id,
          title: m.title,
          orderIndex: i,
          weight: m.weight || 1,
          completedAt: null,
        }));
        const firstStone = stones[0]?.id ?? null;
        const extra = generateTasks(goal, today, end).map((task) => ({
          ...task,
          title: draft.taskTitle.trim() || draft.title.trim(),
          milestoneId: firstStone,
        }));
        set({
          goals: [...get().goals, goal],
          milestones: [...get().milestones, ...stones],
          tasks: [...get().tasks, ...extra],
        });
        return { id: goal.id, taskIds: extra.map((x) => x.id) };
      },
      updateGoal: (id, patch) => {
        set({
          goals: get().goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        });
      },
      archiveGoal: (id, archived) => {
        set({
          goals: get().goals.map((g) =>
            g.id === id ? { ...g, status: archived ? "archived" : "active" } : g,
          ),
        });
      },
      addTask: ({ date, title, note, description, priority, goalId, milestoneId, weight, time, estimatedDurationMinutes }) => {
        const user = currentUser(get());
        if (!user) return null;
        const created = hydrateTask({
          id: uid(),
          userId: user.id,
          goalId: goalId ?? null,
          milestoneId: milestoneId ?? null,
          date,
          time: time ?? null,
          title: title.trim(),
          note: note ?? "",
          description: description ?? "",
          priority: priority ?? "medium",
          weight: weight ?? GAME_CONFIG.DEFAULT_TASK_WEIGHT,
          estimatedDurationMinutes: estimatedDurationMinutes ?? null,
        });
        set({
          tasks: [...get().tasks, created],
          offlineOps: nextOffline(get().offlineOps, "add", { id: created.id, date, title }),
        });
        return created.id;
      },
      addRecurringSessions: (sessions) => {
        const user = currentUser(get());
        if (!user || sessions.length === 0) return { added: 0, firstDate: null, taskIds: [] };
        const today = todayKey(user.timezone);
        const horizon = addDays(today, GAME_CONFIG.TASK_HORIZON_DAYS);
        const extra: Task[] = [];
        for (const session of sessions) {
          const weekday = ((Number(session.weekday) % 7) + 7) % 7;
          const time = String(session.time ?? "").trim();
          const title = String(session.title ?? "").trim();
          if (!Number.isFinite(weekday) || !time || !title) continue;
          const dates = enumerateDates(today, horizon).filter((date) => weekdayOf(date) === weekday);
          for (const date of dates) {
            extra.push(
              hydrateTask({
                id: uid(),
                userId: user.id,
                goalId: session.goalId ?? null,
                date,
                time,
                title,
                tag: "ders",
                estimatedDurationMinutes: session.estimatedDurationMinutes || 45,
                repeatPattern: { kind: "custom", weekdays: [weekday] },
              }),
            );
          }
        }
        if (extra.length === 0) return { added: 0, firstDate: null, taskIds: [] };
        set({ tasks: [...get().tasks, ...extra] });
        return { added: extra.length, firstDate: extra[0]?.date ?? null, taskIds: extra.map((x) => x.id) };
      },
      updateTask: (id, patch) => {
        set({
          tasks: get().tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  ...patch,
                  completed:
                    patch.status === "done"
                      ? true
                      : patch.status === "pending" || patch.status === "postponed"
                        ? false
                        : (patch.completed ?? task.completed),
                }
              : task,
          ),
          offlineOps: nextOffline(get().offlineOps, "update", { id, ...patch }),
        });
      },
      moveTask: (id, date, time) => {
        const user = currentUser(get());
        if (!user) return;
        if (!canMutateTaskDate(date, user.timezone) && date < todayKey(user.timezone)) return;
        set({
          tasks: get().tasks.map((task) =>
            task.id === id
              ? { ...task, date, time: time !== undefined ? time : task.time, status: "pending" }
              : task,
          ),
          offlineOps: nextOffline(get().offlineOps, "move", { id, date, time }),
        });
      },
      postponeTask: (id, toDate) => {
        const user = currentUser(get());
        if (!user) return;
        set({
          tasks: get().tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  date: toDate,
                  postponedToDate: toDate,
                  status: "pending",
                  completed: false,
                  completedAt: null,
                }
              : task,
          ),
          offlineOps: nextOffline(get().offlineOps, "postpone", { id, toDate }),
        });
      },
      addMilestone: (goalId, title, weight = 1) => {
        const list = get().milestones.filter((m) => m.goalId === goalId);
        set({
          milestones: [
            ...get().milestones,
            {
              id: uid(),
              goalId,
              title: title.trim(),
              orderIndex: list.length,
              weight,
              completedAt: null,
            },
          ],
        });
      },
      toggleMilestone: (id) => {
        set({
          milestones: get().milestones.map((m) =>
            m.id === id
              ? { ...m, completedAt: m.completedAt ? null : new Date().toISOString() }
              : m,
          ),
        });
      },
      planHours: (title, hours, week, goalId, preferStartMin) => {
        const user = currentUser(get());
        const minutesNeeded = Math.max(0, hours) * 60;
        if (!user) return { added: 0, taskIds: [], minutesPlaced: 0, minutesNeeded };
        const today = todayKey(user.timezone);
        const slots = scheduleHours({
          hours,
          title,
          week,
          tasks: get().tasks,
          busy: get().busySlots,
          userId: user.id,
          today,
          nowMin: minutesInZone(user.timezone),
          preferStartMin: preferStartMin ?? undefined,
        });
        const extra = slots.map((s) =>
          hydrateTask({
            id: uid(),
            userId: user.id,
            goalId: goalId ?? null,
            date: s.date,
            time: s.time,
            title,
            estimatedDurationMinutes: s.minutes,
          }),
        );
        const minutesPlaced = slots.reduce((s, x) => s + x.minutes, 0);
        if (extra.length === 0) return { added: 0, taskIds: [], minutesPlaced: 0, minutesNeeded };
        set({ tasks: [...get().tasks, ...extra] });
        return { added: extra.length, taskIds: extra.map((x) => x.id), minutesPlaced, minutesNeeded };
      },
      removeTasks: (ids) => {
        const drop = new Set(ids);
        set({ tasks: get().tasks.filter((x) => !drop.has(x.id)) });
      },
      removeGoal: (id) => {
        set({
          goals: get().goals.filter((g) => g.id !== id),
          milestones: get().milestones.filter((m) => m.goalId !== id),
        });
      },
      flushOffline: () => set({ offlineOps: [] }),
      deleteAccount: async () => {
        const user = currentUser(get());
        if (!user) return { ok: false };
        const cloud = await cloudDeleteAccount();
        if (!cloud.ok) return cloud;
        set({
          users: get().users.filter((u) => u.id !== user.id),
          sessionUserId: null,
          creatures: get().creatures.filter((c) => c.ownerId !== user.id),
          goals: get().goals.filter((g) => g.userId !== user.id),
          milestones: get().milestones.filter((m) =>
            get().goals.some((g) => g.id === m.goalId && g.userId !== user.id),
          ),
          tasks: get().tasks.filter((x) => x.userId !== user.id),
          busySlots: get().busySlots.filter((b) => b.userId !== user.id),
          scores: get().scores.filter((s) => s.userId !== user.id),
          friendships: get().friendships.filter(
            (f) => f.userA !== user.id && f.userB !== user.id,
          ),
          pairs: get().pairs.filter((p) => p.userA !== user.id && p.userB !== user.id),
          pokes: get().pokes.filter((p) => p.fromUser !== user.id && p.toUser !== user.id),
          notices: get().notices.filter((n) => n.userId !== user.id),
          sharedQuests: get().sharedQuests.filter(
            (q) => q.fromUser !== user.id && q.toUser !== user.id,
          ),
          taskCompanions: get().taskCompanions.filter(
            (c) => c.fromUser !== user.id && c.toUser !== user.id,
          ),
          achievements: get().achievements.filter((a) => a.userId !== user.id),
          chatThreads: (get().chatThreads ?? []).filter((c) => c.userId !== user.id),
          aiMemory: (get().aiMemory ?? []).filter((n) => n.userId !== user.id),
          offlineOps: [],
        });
        return { ok: true };
      },
      updateTaskSeries: (id, patch, scope) => {
        const source = get().tasks.find((x) => x.id === id);
        if (!source) return;
        if (scope === "one" || !source.goalId) {
          set({
            tasks: get().tasks.map((task) =>
              task.id === id ? { ...task, ...patch } : task,
            ),
          });
          return;
        }
        set({
          tasks: get().tasks.map((task) => {
            if (task.id === id) return { ...task, ...patch };
            if (
              task.goalId === source.goalId &&
              task.userId === source.userId &&
              task.date >= source.date &&
              task.title === source.title &&
              !task.completed
            ) {
              return { ...task, ...patch };
            }
            return task;
          }),
        });
      },
      toggleTask: (id) => {
        const user = currentUser(get());
        if (!user) return { streakJustHit: false, closed: true, hatched: false };
        const task = get().tasks.find((x) => x.id === id);
        if (!task) return { streakJustHit: false, closed: true, hatched: false };
        if (!canMutateTaskDate(task.date, user.timezone)) {
          return { streakJustHit: false, closed: true, hatched: false };
        }
        const rest = isRestWeekday(task.date, user.restDayOfWeek ?? null);
        const todayTasks = get().tasks.filter(
          (x) => x.userId === user.id && x.date === task.date,
        );
        const dcsBefore = rest ? null : dailyCompletionScore(todayTasks);
        const nextTasks = get().tasks.map((x) =>
          x.id === id
            ? {
                ...x,
                completed: !x.completed,
                completedAt: !x.completed ? new Date().toISOString() : null,
                status: !x.completed ? ("done" as const) : ("pending" as const),
              }
            : x,
        );
        set({ offlineOps: nextOffline(get().offlineOps, "toggle", { id }) });
        const dcsAfter = rest
          ? null
          : dailyCompletionScore(
              nextTasks.filter((x) => x.userId === user.id && x.date === task.date),
            );
        const streakJustHit = !rest && !isStreakDay(dcsBefore) && isStreakDay(dcsAfter);
        const mine = get().creatures.find(
          (c) => c.ownerId === user.id && c.status === "active",
        );
        let creatures = get().creatures;
        let pendingHatch = get().pendingHatch;
        let pendingMutation = get().pendingMutation;
        let hatched = false;
        if (streakJustHit && mine && !mine.hatchedAt && mine.stage === "egg") {
          const iso = new Date().toISOString();
          creatures = creatures.map((c) =>
            c.id === mine.id
              ? {
                  ...c,
                  stage: "baby" as const,
                  hatchedAt: iso,
                  currentStreak: Math.max(1, c.currentStreak),
                }
              : c,
          );
          pendingHatch = true;
          if (mine.rareMutation) pendingMutation = true;
          hatched = true;
        }
        const quest = get().sharedQuests.find(
          (q) => q.taskAId === id || q.taskBId === id,
        );
        let pendingTogether = get().pendingTogether;
        if (quest && !task.completed) {
          const a = nextTasks.find((x) => x.id === quest.taskAId);
          const b = nextTasks.find((x) => x.id === quest.taskBId);
          if (a?.completed && b?.completed) pendingTogether = true;
        }
        set({
          tasks: nextTasks,
          milestones: syncMilestoneCompletion(get().milestones, nextTasks),
          scores: upsertDayScore(
            get().scores,
            scoreFromTasks(
              user.id,
              task.date,
              nextTasks.filter((x) => x.userId === user.id && x.date === task.date),
              mine?.currentStreak ?? 0,
              mine?.health === "sick",
              rest,
            ),
          ),
          creatures,
          pendingHatch,
          pendingMutation,
          pendingTogether,
          widgetAnim: hatched
            ? "happy"
            : streakJustHit
              ? "happy"
              : !task.completed
                ? "bounce"
                : "idle",
        });
        const live = get().creatures.find((c) => c.ownerId === user.id && c.status === "active");
        if (live) void cloudPublishCreature(live);
        return { streakJustHit, closed: false, hatched };
      },
      finalizePending: (now = new Date()) => {
        const user = currentUser(get());
        if (!user) return;
        const today = todayKey(user.timezone, now);
        const mine = get().creatures.find(
          (c) => c.ownerId === user.id && c.status === "active",
        );
        if (!mine) return;

        let creature = normalizeCreature({ ...mine });
        let scores = [...get().scores];
        let notices = [...get().notices];
        let pairs = [...get().pairs];
        let creatures = get().creatures.map((c) =>
          c.id === creature.id ? creature : c,
        );
        const offspring = [...get().offspring];
        let pendingHatch = get().pendingHatch;
        let pendingMutation = get().pendingMutation;
        let pendingLetter = get().pendingLetter;
        let widgetAnim = get().widgetAnim;
        let justRecovered = false;
        let streakBroke = false;
        const achievements = [...get().achievements];

        const first = creature.createdAt;
        for (let d = first; d < today; d = addDays(d, 1)) {
          if (scores.some((s) => s.userId === user.id && s.date === d && s.finalized)) {
            continue;
          }
          const rest = isRestWeekday(d, user.restDayOfWeek ?? null);
          const dayTasks = get().tasks.filter(
            (x) => x.userId === user.id && x.date === d,
          );
          const live = scoreFromTasks(
            user.id,
            d,
            dayTasks,
            creature.currentStreak,
            creature.health === "sick",
            rest,
          );
          const prevHealth = creature.health;
          const prevStreak = creature.currentStreak;
          const applied = applyDayFinalization({
            currentStreak: creature.currentStreak,
            longestStreak: creature.longestStreak,
            totalGp: creature.totalGp,
            dcs: live.dcs,
            hatched: Boolean(creature.hatchedAt) || creature.stage !== "egg",
            health: creature.health,
            consecutiveZeroDays: creature.consecutiveZeroDays,
            recoveryStreak: creature.recoveryStreak,
            isRestDay: rest,
          });
          const prevStage = creature.stage;
          if (prevHealth === "sick" && applied.health === "active") justRecovered = true;
          if (!rest && prevStreak > 0 && applied.currentStreak === 0) {
            streakBroke = true;
            widgetAnim = "worried";
            notices.push({
              id: uid(),
              userId: user.id,
              kind: "streak",
              title: t("toast.streakPaused"),
              body: t("toast.streakPaused"),
              read: false,
              createdAt: `${d}T00:00:00.000Z`,
              href: "/anasayfa",
            });
          }
          creature = {
            ...creature,
            currentStreak: applied.currentStreak,
            longestStreak: applied.longestStreak,
            totalGp: applied.totalGp,
            stage: applied.stage,
            health: applied.health,
            consecutiveZeroDays: applied.consecutiveZeroDays,
            recoveryStreak: applied.recoveryStreak,
            hatchedAt: applied.justHatched
              ? `${d}T00:00:00.000Z`
              : creature.hatchedAt,
          };
          if (applied.justHatched && d >= addDays(today, -1)) {
            pendingHatch = true;
            if (creature.rareMutation) pendingMutation = true;
          }
          if (
            applied.stage !== prevStage &&
            STAGE_ORDER.indexOf(applied.stage) > STAGE_ORDER.indexOf(prevStage)
          ) {
            if (applied.stage === "adult" && !creature.adultReachedAt) {
              creature.adultReachedAt = `${d}T00:00:00.000Z`;
              creature.adultGpSnapshot = applied.totalGp;
            }
            notices.push({
              id: uid(),
              userId: user.id,
              kind: "evolution",
              title: t("toast.evolved", {
                name: creature.name,
                stage: t(`stage.${applied.stage}`),
              }),
              body: t("toast.evolved", {
                name: creature.name,
                stage: t(`stage.${applied.stage}`),
              }),
              read: false,
              createdAt: `${d}T00:00:00.000Z`,
              href: "/yaratigim",
            });
            if (d >= addDays(today, -1) && applied.stage !== "baby") {
              celebrate("evolve");
            }
          }
          scores = scores.filter((s) => !(s.userId === user.id && s.date === d));
          scores.push({ ...live, gpEarned: applied.gpEarned, finalized: true });

          pairs = pairs.map((p) => {
            if (p.status !== "bonded") return p;
            if (p.userA !== user.id && p.userB !== user.id) return p;
            const otherId = p.userA === user.id ? p.userB : p.userA;
            const otherScore = scores.find(
              (s) => s.userId === otherId && s.date === d && s.finalized,
            );
            if (!otherScore) return p;
            const next = nextSyncPoints(p.syncPoints, live.dcs, otherScore.dcs);
            return { ...p, syncPoints: next };
          });
        }

        creatures = creatures.map((c) => (c.id === creature.id ? creature : c));

        const readyToMarry = pairs.filter(
          (p) =>
            p.status === "bonded" &&
            p.syncPoints >= GAME_CONFIG.SYNC_POINTS_MARRIAGE_THRESHOLD &&
            (p.userA === user.id || p.userB === user.id),
        );
        for (const pair of readyToMarry) {
          const a = creatures.find((c) => c.id === pair.creatureAId && c.status === "active");
          const b = creatures.find((c) => c.id === pair.creatureBId && c.status === "active");
          if (!a || !b) continue;
          if (resolvedGender(a) === resolvedGender(b)) continue;
          if (
            !isUnionReady(
              a.adultReachedAt,
              a.adultGpSnapshot,
              a.totalGp,
              today,
              a.stage,
            ) ||
            !isUnionReady(
              b.adultReachedAt,
              b.adultGpSnapshot,
              b.totalGp,
              today,
              b.stage,
            )
          ) {
            continue;
          }
          const bornAt = new Date().toISOString();
          const child = breedOffspring({
            parentA: { speciesId: a.speciesId, hueShift: a.hueShift, genetics: a.genetics },
            parentB: { speciesId: b.speciesId, hueShift: b.hueShift, genetics: b.genetics },
            pairId: pair.id,
            at: bornAt,
          });
          const gen = Math.max(a.generation ?? 1, b.generation ?? 1) + 1;
          const retire = (c: Creature, spouse: Creature): Creature => ({
            ...c,
            status: "retired",
            retiredAt: today,
            spouseOwnerId: spouse.ownerId,
            spouseCreatureName: spouse.name,
            marriedAt: bornAt,
          });
          const eggFor = (ownerId: string, parentName: string): Creature => {
            const childGender = speciesGender(child.speciesId);
            const egg = makeEgg(ownerId, parentName, childGender);
            return {
              ...egg,
              speciesId: child.speciesId,
              gender: childGender,
              hueShift: child.hueShift,
              genetics: child.genetics,
              parentAId: a.id,
              parentBId: b.id,
              generation: gen,
              rareMutation: child.mutated,
              eggShellVariant: eggShellVariant(child.speciesId, child.hueShift),
            };
          };
          creatures = creatures
            .map((c) => {
              if (c.id === a.id) return retire(c, b);
              if (c.id === b.id) return retire(c, a);
              return c;
            })
            .concat([eggFor(a.ownerId, a.name), eggFor(b.ownerId, b.name)]);
          pairs = pairs.map((p) =>
            p.id === pair.id
              ? { ...p, status: "married", marriedAt: bornAt }
              : p,
          );
          offspring.push({
            id: uid(),
            pairId: pair.id,
            resultingSpeciesId: child.speciesId,
            resultingHue: child.hueShift,
            createdAt: bornAt,
            mutated: child.mutated,
          });
          notices.push({
            id: uid(),
            userId: a.ownerId,
            kind: "marriage",
            title: t("toast.married"),
            body: t("toast.married"),
            read: false,
            createdAt: bornAt,
            href: "/profil",
          });
          notices.push({
            id: uid(),
            userId: b.ownerId,
            kind: "marriage",
            title: t("toast.married"),
            body: t("toast.married"),
            read: false,
            createdAt: bornAt,
            href: "/profil",
          });
          celebrate("marry");
        }

        let active =
          creatures.find((c) => c.ownerId === user.id && c.status === "active") ?? creature;
        const born = active.hatchedAt?.slice(0, 10) ?? active.createdAt;
        const age = Math.max(0, diffDays(born, today));
        for (const ms of LETTER_MILESTONES) {
          if (age >= ms && !active.letters.some((l) => l.milestone === ms)) {
            const letter = { milestone: ms, at: new Date().toISOString() } as const;
            active = { ...active, letters: [...active.letters, letter] };
            pendingLetter = letter;
            notices.push({
              id: uid(),
              userId: user.id,
              kind: "letter",
              title: t("letter.toast", { n: ms }),
              body: t("letter.toast", { n: ms }),
              read: false,
              createdAt: letter.at,
              href: "/profil",
            });
          }
        }
        const fresh = evaluateAchievements({
          userId: user.id,
          creature: active,
          scores,
          pairs,
          justRecovered,
          already: achievements,
          now: new Date().toISOString(),
        });
        const hiddenUnlocked = fresh.some((a) => a.achievementId !== "first_step");
        const items = roomUnlocks({
          creature: active,
          scores,
          hasHiddenAchievement:
            hiddenUnlocked ||
            achievements.some(
              (a) => a.userId === user.id && a.achievementId !== "first_step",
            ),
          married: Boolean(active.marriedAt) || pairs.some((p) => p.status === "married"),
        });
        active = { ...active, unlockedRoomItems: items };
        creatures = creatures.map((c) => (c.id === active.id ? active : c));
        for (const a of fresh) {
          notices.push({
            id: uid(),
            userId: user.id,
            kind: "achievement",
            title: t(`achieve.${a.achievementId}.name`),
            body: t(`achieve.${a.achievementId}.name`),
            read: false,
            createdAt: a.unlockedAt,
            href: "/profil",
          });
        }
        set({
          creatures,
          scores,
          notices,
          pairs,
          offspring,
          pendingHatch,
          pendingMutation,
          pendingLetter,
          achievements: [...achievements, ...fresh],
          widgetAnim: streakBroke ? "worried" : widgetAnim,
        });
        const published = get().creatures.find((c) => c.ownerId === user.id && c.status === "active");
        if (published) void cloudPublishCreature(published);
      },
      updateSettings: (patch) => {
        const user = currentUser(get());
        if (!user) return;
        set({
          users: get().users.map((u) => (u.id === user.id ? { ...u, ...patch } : u)),
        });
      },
      addFriend: async (raw) => {
        const user = currentUser(get());
        if (!user) return { ok: false, error: t("auth.errorGeneric") };
        const handle = parseFriendHandle(raw);
        if (!handle) return { ok: false, error: t("community.notFound") };
        if (cloudEnabled()) {
          const other = await cloudLookupFriend(handle);
          if (!other || other.id === user.id) {
            return { ok: false, error: t("community.notFound") };
          }
          const exists = get().friendships.some(
            (f) =>
              (f.userA === user.id && f.userB === other.id) ||
              (f.userB === user.id && f.userA === other.id),
          );
          if (exists) return { ok: false, error: t("community.already") };
          const inserted = await cloudInsertFriendship(user.id, other.id, user.username);
          if (!inserted.ok) return inserted;
          await get().syncCloudSocial();
          return { ok: true };
        }
        const other = get().users.find((u) => u.username.toLowerCase() === handle);
        if (!other || other.id === user.id) {
          return { ok: false, error: t("community.notFound") };
        }
        const exists = get().friendships.some(
          (f) =>
            (f.userA === user.id && f.userB === other.id) ||
            (f.userB === user.id && f.userA === other.id),
        );
        if (exists) return { ok: false, error: t("community.already") };
        const request: Friendship = {
          id: uid(),
          userA: user.id,
          userB: other.id,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        set({
          friendships: [...get().friendships, request],
          notices: [
            ...get().notices,
            {
              id: uid(),
              userId: other.id,
              kind: "bond",
              title: t("toast.friendIn"),
              body: user.username,
              read: false,
              createdAt: new Date().toISOString(),
              href: "/topluluk",
            },
          ],
        });
        return { ok: true };
      },
      acceptFriend: (id) => {
        set({
          friendships: get().friendships.map((f) =>
            f.id === id ? { ...f, status: "accepted" } : f,
          ),
        });
        void cloudAcceptFriendship(id);
      },
      poke: (toUser) => {
        const user = currentUser(get());
        if (!user) return { ok: false };
        const today = todayKey(user.timezone);
        const used = get().pokes.some(
          (p) => p.fromUser === user.id && p.toUser === toUser && p.date === today,
        );
        if (used) return { ok: false, error: t("community.pokeLimit") };
        set({
          pokes: [
            ...get().pokes,
            { id: uid(), fromUser: user.id, toUser, date: today },
          ],
          notices: [
            ...get().notices,
            {
              id: uid(),
              userId: toUser,
              kind: "poke",
              title: t("toast.pokedYou", { name: user.username }),
              body: t("toast.pokedYou", { name: user.username }),
              read: false,
              createdAt: new Date().toISOString(),
              href: "/anasayfa",
            },
          ],
        });
        void cloudInsertPoke(user.id, toUser, today, user.username);
        return { ok: true };
      },
      bond: (friendUserId) => {
        const user = currentUser(get());
        if (!user) return { ok: false };
        const today = todayKey(user.timezone);
        const friendship = get().friendships.find(
          (f) =>
            f.status === "accepted" &&
            ((f.userA === user.id && f.userB === friendUserId) ||
              (f.userB === user.id && f.userA === friendUserId)),
        );
        if (!friendship) return { ok: false, error: t("community.empty") };
        const age = diffDays(friendship.createdAt.slice(0, 10), today);
        if (age < GAME_CONFIG.FRIENDSHIP_BOND_MIN_DAYS) {
          return { ok: false, error: t("community.needFriends") };
        }
        const mine = get().creatures.find(
          (c) => c.ownerId === user.id && c.status === "active",
        );
        const theirs = get().creatures.find(
          (c) => c.ownerId === friendUserId && c.status === "active",
        );
        if (!mine || !theirs) return { ok: false, error: t("community.needAdult") };
        if (resolvedGender(mine) === resolvedGender(theirs)) {
          return { ok: false, error: t("community.needOpposite") };
        }
        if (
          !isUnionReady(
            mine.adultReachedAt,
            mine.adultGpSnapshot,
            mine.totalGp,
            today,
            mine.stage,
          ) ||
          !isUnionReady(
            theirs.adultReachedAt,
            theirs.adultGpSnapshot,
            theirs.totalGp,
            today,
            theirs.stage,
          )
        ) {
          return { ok: false, error: t("community.needAdult") };
        }
        const already = get().pairs.some(
          (p) =>
            p.status !== "married" &&
            ((p.userA === user.id && p.userB === friendUserId) ||
              (p.userB === user.id && p.userA === friendUserId)),
        );
        if (already) return { ok: false };
        const pair: Pair = {
              id: uid(),
              userA: user.id,
              userB: friendUserId,
              creatureAId: mine.id,
              creatureBId: theirs.id,
              status: "bonded",
              syncPoints: 0,
              bondedAt: new Date().toISOString(),
              marriedAt: null,
            };
        set({
          pairs: [
            ...get().pairs,
            pair,
          ],
        });
        void cloudInsertPair(pair);
        return { ok: true };
      },
      markNoticesRead: () => {
        const user = currentUser(get());
        if (!user) return;
        set({
          notices: get().notices.map((n) =>
            n.userId === user.id ? { ...n, read: true } : n,
          ),
        });
        void cloudMarkNoticesRead(user.id);
      },
      markNoticeRead: (id) => {
        set({
          notices: get().notices.map((n) => (n.id === id ? { ...n, read: true } : n)),
        });
      },
      pushNotice: (input) => {
        const user = currentUser(get());
        if (!user) return false;
        if (get().notices.some((n) => n.id === input.id)) return false;
        set({
          notices: [
            ...get().notices,
            {
              id: input.id,
              userId: user.id,
              kind: input.kind,
              title: input.title,
              body: input.body,
              href: input.href,
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
        });
        return true;
      },
      pushToast: (text) => {
        const id = uid();
        set({ toasts: [...get().toasts, { id, text }] });
        setTimeout(() => {
          get().dismissToast(id);
        }, 2800);
      },
      dismissToast: (id) =>
        set({ toasts: get().toasts.filter((x) => x.id !== id) }),
      setWidgetAnim: (a) => set({ widgetAnim: a }),
      dismissHatch: () => set({ pendingHatch: false }),
      dismissMutation: () => set({ pendingMutation: false }),
      dismissLetter: () => set({ pendingLetter: null }),
      dismissTogether: () => set({ pendingTogether: false }),
      markWoke: () => set({ sessionWoke: true, widgetAnim: "idle" }),
      proposeTogether: (friendId, title) => {
        const user = currentUser(get());
        if (!user) return { ok: false };
        const trimmed = title.trim();
        if (!trimmed) return { ok: false };
        const friendship = get().friendships.find(
          (f) =>
            f.status === "accepted" &&
            ((f.userA === user.id && f.userB === friendId) ||
              (f.userB === user.id && f.userA === friendId)),
        );
        if (!friendship) return { ok: false, error: t("community.empty") };
        const today = todayKey(user.timezone);
        const exists = get().sharedQuests.some(
          (q) =>
            q.date === today &&
            ((q.fromUser === user.id && q.toUser === friendId) ||
              (q.toUser === user.id && q.fromUser === friendId)),
        );
        if (exists) return { ok: false, error: t("together.exists") };
        const taskA: Task = hydrateTask({
          id: uid(),
          userId: user.id,
          goalId: null,
          date: today,
          title: trimmed,
          note: t("together.note"),
        });
        const taskB: Task = {
          ...taskA,
          id: uid(),
          userId: friendId,
        };
        const quest: SharedQuest = {
          id: uid(),
          fromUser: user.id,
          toUser: friendId,
          date: today,
          title: trimmed,
          taskAId: taskA.id,
          taskBId: taskB.id,
        };
        set({
          tasks: [...get().tasks, taskA, taskB],
          sharedQuests: [...get().sharedQuests, quest],
        });
        return { ok: true };
      },
      inviteCompanion: (taskId, friendId) => {
        const user = currentUser(get());
        if (!user) return { ok: false };
        const task = get().tasks.find((x) => x.id === taskId);
        if (!task) return { ok: false, error: t("together.needSave") };
        const friendship = get().friendships.find(
          (f) =>
            f.status === "accepted" &&
            ((f.userA === user.id && f.userB === friendId) ||
              (f.userB === user.id && f.userA === friendId)),
        );
        if (!friendship) return { ok: false, error: t("together.noFriends") };
        const dup = get().taskCompanions.some(
          (c) =>
            c.taskId === taskId &&
            c.status !== "declined" &&
            ((c.fromUser === user.id && c.toUser === friendId) ||
              (c.toUser === user.id && c.fromUser === friendId)),
        );
        if (dup) return { ok: false, error: t("together.exists") };
        const companion: TaskCompanion = {
          id: uid(),
          taskId,
          fromUser: user.id,
          toUser: friendId,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        const title = t("together.invite", { name: user.username, task: task.title });
        set({
          taskCompanions: [...get().taskCompanions, companion],
          notices: [
            ...get().notices,
            {
              id: uid(),
              userId: friendId,
              kind: "together",
              title,
              body: companion.id,
              read: false,
              createdAt: companion.createdAt,
              href: `companion:${companion.id}`,
            },
          ],
        });
        void cloudInsertTogetherInvite(friendId, title, companion.id);
        return { ok: true };
      },
      respondCompanion: (id, accept) => {
        const user = currentUser(get());
        if (!user) return;
        const companion = get().taskCompanions.find((c) => c.id === id);
        if (!companion || companion.toUser !== user.id || companion.status !== "pending") return;
        const markRead = (n: Notice) =>
          n.href === `companion:${id}` || n.body === id ? { ...n, read: true } : n;
        if (!accept) {
          set({
            taskCompanions: get().taskCompanions.map((c) =>
              c.id === id ? { ...c, status: "declined" as const } : c,
            ),
            notices: get().notices.map(markRead),
          });
          return;
        }
        const source = get().tasks.find((x) => x.id === companion.taskId);
        const taskB = source
          ? hydrateTask({
              ...source,
              id: uid(),
              userId: user.id,
              completed: false,
              completedAt: null,
              status: "pending",
              note: source.note || t("together.note"),
            })
          : null;
        const quest: SharedQuest | null = source && taskB
          ? {
              id: uid(),
              fromUser: companion.fromUser,
              toUser: companion.toUser,
              date: source.date,
              title: source.title,
              taskAId: source.id,
              taskBId: taskB.id,
            }
          : null;
        set({
          taskCompanions: get().taskCompanions.map((c) =>
            c.id === id ? { ...c, status: "accepted" as const } : c,
          ),
          tasks: taskB ? [...get().tasks, taskB] : get().tasks,
          sharedQuests: quest ? [...get().sharedQuests, quest] : get().sharedQuests,
          notices: get().notices.map(markRead),
        });
      },
      cancelCompanion: (id) => {
        const user = currentUser(get());
        if (!user) return;
        const companion = get().taskCompanions.find((c) => c.id === id);
        if (!companion || companion.fromUser !== user.id || companion.status !== "pending") return;
        set({
          taskCompanions: get().taskCompanions.filter((c) => c.id !== id),
          notices: get().notices.filter((n) => n.href !== `companion:${id}` && n.body !== id),
        });
      },
      saveChatThread: ({ id, messages }) => {
        const user = currentUser(get());
        if (!user || messages.length === 0) return id ?? "";
        const first = messages.find((m) => m.role === "user")?.text.replace(/\s+/g, " ").trim() ?? "";
        const title = (first || "Sohbet").slice(0, 48);
        const threadId = id || uid();
        const thread: ChatThread = {
          id: threadId,
          userId: user.id,
          title,
          updatedAt: new Date().toISOString(),
          messages: messages.slice(-80),
        };
        const all = get().chatThreads ?? [];
        const mine = all.filter((c) => c.userId === user.id && c.id !== threadId);
        const others = all.filter((c) => c.userId !== user.id);
        set({ chatThreads: [...others, thread, ...mine].slice(0, others.length + 40) });
        return threadId;
      },
      deleteChatThread: (id) => {
        set({ chatThreads: (get().chatThreads ?? []).filter((c) => c.id !== id) });
      },
      addMemoryNotes: (notes) => {
        const user = currentUser(get());
        if (!user || notes.length === 0) return [];
        const now = new Date().toISOString();
        const have = new Set(
          (get().aiMemory ?? [])
            .filter((n) => n.userId === user.id)
            .map((n) => n.text.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim()),
        );
        const extra: AiMemoryNote[] = [];
        for (const note of notes) {
          const text = note.text.replace(/\s+/g, " ").trim();
          const key = text.toLocaleLowerCase("tr");
          if (!text || have.has(key)) continue;
          have.add(key);
          extra.push({
            id: uid(),
            userId: user.id,
            text,
            source: note.source === "observed" ? "observed" : "said",
            createdAt: now,
          });
        }
        if (extra.length === 0) return [];
        const mine = [...extra, ...(get().aiMemory ?? []).filter((n) => n.userId === user.id)].slice(0, 40);
        const others = (get().aiMemory ?? []).filter((n) => n.userId !== user.id);
        set({ aiMemory: [...others, ...mine] });
        for (const note of extra) void cloudUpsertMemory(note);
        return extra;
      },
      removeMemory: (id) => {
        set({ aiMemory: (get().aiMemory ?? []).filter((n) => n.id !== id) });
        void cloudDeleteMemory(id);
      },
      clearMemory: () => {
        const user = currentUser(get());
        if (!user) return;
        set({ aiMemory: (get().aiMemory ?? []).filter((n) => n.userId !== user.id) });
        void cloudClearMemory(user.id);
      },
      markMemoryDistilled: (seen) => {
        const user = currentUser(get());
        if (!user) return;
        set({
          aiMemoryCursor: {
            ...(get().aiMemoryCursor ?? {}),
            [user.id]: { seen, at: new Date().toISOString() },
          },
        });
      },
      saveFocusRun: (key, run) => {
        set({ focusRuns: { ...(get().focusRuns ?? {}), [key]: run } });
      },
      clearFocusRun: (key) => {
        const next = { ...(get().focusRuns ?? {}) };
        delete next[key];
        set({ focusRuns: next });
      },
    }),
    {
      name: "tofiby-db",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 9,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.aiMemory)) state.aiMemory = [];
        if (!state.aiMemoryCursor) state.aiMemoryCursor = {};
      },
      migrate: (persisted) => {
        try {
          const p = persisted as {
            creatures?: Creature[];
            users?: Account[];
            goals?: Goal[];
            tasks?: Task[];
          } & Record<string, unknown>;
          return {
            ...p,
            creatures: (p.creatures ?? []).flatMap((c) => {
              try {
                return [normalizeCreature(c)];
              } catch {
                return [];
              }
            }),
            users: (p.users ?? []).map((u) => normalizeUser(u)),
            goals: (p.goals ?? []).map((g) => hydrateGoal(g)),
            tasks: (p.tasks ?? []).map((task) => hydrateTask(task)),
            milestones: p.milestones ?? [],
            busySlots: p.busySlots ?? [],
            offlineOps: p.offlineOps ?? [],
            sharedQuests: p.sharedQuests ?? [],
            taskCompanions: (p.taskCompanions as TaskCompanion[] | undefined) ?? [],
            achievements: p.achievements ?? [],
            chatThreads: (p.chatThreads as ChatThread[] | undefined) ?? [],
            aiMemory: (p.aiMemory as AiMemoryNote[] | undefined) ?? [],
            aiMemoryCursor: (p.aiMemoryCursor as Record<string, { seen: number; at: string }> | undefined) ?? {},
            focusRuns: (p.focusRuns as Record<string, FocusRun> | undefined) ?? {},
            scores: p.scores ?? [],
            friendships: p.friendships ?? [],
            pairs: p.pairs ?? [],
            pokes: p.pokes ?? [],
            notices: p.notices ?? [],
          };
        } catch {
          return persisted;
        }
      },
      partialize: (s) => ({
        users: s.users,
        sessionUserId: s.sessionUserId,
        creatures: s.creatures,
        goals: s.goals,
        milestones: s.milestones,
        tasks: s.tasks,
        busySlots: s.busySlots,
        offlineOps: s.offlineOps,
        scores: s.scores,
        friendships: s.friendships,
        pairs: s.pairs,
        pokes: s.pokes,
        notices: s.notices,
        offspring: s.offspring,
        sharedQuests: s.sharedQuests,
        taskCompanions: s.taskCompanions,
        achievements: s.achievements,
        chatThreads: s.chatThreads,
        aiMemory: Array.isArray(s.aiMemory) ? s.aiMemory : [],
        aiMemoryCursor: s.aiMemoryCursor ?? {},
        focusRuns: s.focusRuns,
      }),
    },
  ),
);

function currentUser(state: AppState): Account | undefined {
  return state.users.find((u) => u.id === state.sessionUserId);
}

function makeAccount(input: {
  id: string;
  username: string;
  email: string;
  password: string;
}): Account {
  return {
    id: input.id,
    username: input.username,
    email: input.email,
    timezone: detectTimezone(),
    createdAt: new Date().toISOString(),
    onboarded: false,
    theme: "ink",
    notifyPoke: true,
    notifyEvolution: true,
    restDayOfWeek: null,
    preferredWindow: null,
    yearWrapSeen: null,
    weeklyReviewSeen: null,
    softDayCaps: {},
    aiOptIn: false,
    passwordHash: hashPass(input.password),
  };
}

function mergeCloudProfiles(users: Account[], profiles: CloudProfile[]): Account[] {
  const next = [...users];
  for (const p of profiles) {
    const i = next.findIndex((u) => u.id === p.id);
    if (i >= 0) {
      next[i] = { ...next[i], username: p.username || next[i].username };
      continue;
    }
    next.push({
      ...makeAccount({
        id: p.id,
        username: p.username,
        email: p.email || `${p.id}@tofiby.cloud`,
        password: "",
      }),
      onboarded: true,
    });
  }
  return next;
}

function upsertDayScore(scores: DailyScore[], live: DailyScore): DailyScore[] {
  const i = scores.findIndex((s) => s.userId === live.userId && s.date === live.date);
  if (i >= 0) {
    const prev = scores[i];
    if (prev.finalized) return scores;
    const next = scores.slice();
    next[i] = live;
    return next;
  }
  return [...scores, live];
}

function normalizeUser(u: Account): Account {
  return {
    ...u,
    restDayOfWeek: u.restDayOfWeek ?? null,
    preferredWindow: u.preferredWindow ?? null,
    yearWrapSeen: u.yearWrapSeen ?? null,
    weeklyReviewSeen: u.weeklyReviewSeen ?? null,
    softDayCaps: u.softDayCaps ?? {},
    aiOptIn: u.aiOptIn ?? false,
  };
}

function normalizeCreature(c: Creature): Creature {
  const hue = c.hueShift ?? 330;
  return {
    ...c,
    gender: resolvedGender(c),
    hatchedAt: c.hatchedAt ?? (c.stage !== "egg" ? c.createdAt : null),
    health: c.health ?? "active",
    consecutiveZeroDays: c.consecutiveZeroDays ?? 0,
    recoveryStreak: c.recoveryStreak ?? 0,
    parentAId: c.parentAId ?? null,
    parentBId: c.parentBId ?? null,
    generation: c.generation ?? 1,
    genetics: c.genetics ?? defaultGenetics(c.speciesId, hue, [c.id, c.createdAt]),
    eggShellVariant: c.eggShellVariant ?? eggShellVariant(c.speciesId, hue),
    rareMutation: c.rareMutation ?? false,
    unlockedRoomItems: c.unlockedRoomItems ?? [],
    letters: c.letters ?? [],
  };
}

export function useSession() {
  return useApp((s) => s.users.find((u) => u.id === s.sessionUserId) ?? null);
}

export function useActiveCreature() {
  const uid = useApp((s) => s.sessionUserId);
  return useApp(
    (s) => s.creatures.find((c) => c.ownerId === uid && c.status === "active") ?? null,
  );
}

export function useTodayBundle() {
  const user = useSession();
  const tasks = useApp((s) => s.tasks);
  const creature = useActiveCreature();
  if (!user) return { user: null, tasks: [], score: null, creature: null, rest: false };
  const date = todayKey(user.timezone);
  const rest = isRestWeekday(date, user.restDayOfWeek ?? null);
  const todayTasks = tasks.filter((t) => t.userId === user.id && t.date === date);
  return {
    user,
    date,
    rest,
    tasks: todayTasks,
    score: scoreFromTasks(
      user.id,
      date,
      todayTasks,
      creature?.currentStreak ?? 0,
      creature?.health === "sick",
      rest,
    ),
    creature,
  };
}

export function liveUnion(creature: Creature | null, today: string) {
  if (!creature) return 0;
  return unionBarPct(
    creature.adultReachedAt,
    creature.adultGpSnapshot,
    creature.totalGp,
    today,
  );
}

export function liveProgress(creature: Creature | null, extraGp = 0) {
  if (!creature) return gpToNextStage(0, false);
  return gpToNextStage(
    creature.totalGp + Math.max(0, extraGp),
    Boolean(creature.hatchedAt) || creature.stage !== "egg",
  );
}

export function liveHealth(
  creature: Creature | null,
  todayDcs: number | null,
) {
  if (!creature) {
    return { health: "active" as const, consecutiveZeroDays: 0, recoveryStreak: 0, bar: 0 };
  }
  const n = normalizeCreature(creature);
  if (n.health === "sick") {
    const overlay = nextHealth({
      health: n.health,
      consecutiveZeroDays: n.consecutiveZeroDays,
      recoveryStreak: n.recoveryStreak,
      dcs: todayDcs,
    });
    return { ...overlay, bar: recoveryBarPct(overlay.recoveryStreak) };
  }
  return {
    health: n.health,
    consecutiveZeroDays: n.consecutiveZeroDays,
    recoveryStreak: n.recoveryStreak,
    bar: 0,
  };
}

export function stageLabel(stage: CreatureStage) {
  return t(`stage.${stage}`);
}

export function speciesLabel(id: SpeciesId) {
  return t(`species.${id}`);
}
