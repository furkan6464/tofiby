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
import { assignHiddenEggSpecies, breedOffspring } from "./genetics";
import {
  addDays,
  canMutateTaskDate,
  detectTimezone,
  diffDays,
  todayKey,
} from "./dates";
import { enumerateDates, matchesFrequency } from "./frequency";
import { hashPass, uid, validUsername } from "./ids";
import { t } from "./i18n";
import { celebrate } from "./confetti";
import type {
  Creature,
  DailyScore,
  FrequencyPattern,
  Friendship,
  Goal,
  Notice,
  OffspringLog,
  Pair,
  Poke,
  SpeciesId,
  Task,
  UserProfile,
} from "./types";

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
  targetDate: string | null;
  frequency: FrequencyPattern;
  color: string;
}

interface AppState {
  hydrated: boolean;
  users: Account[];
  sessionUserId: string | null;
  creatures: Creature[];
  goals: Goal[];
  tasks: Task[];
  scores: DailyScore[];
  friendships: Friendship[];
  pairs: Pair[];
  pokes: Poke[];
  notices: Notice[];
  offspring: OffspringLog[];
  toasts: Toast[];
  widgetAnim: "idle" | "bounce" | "happy" | "sleepy" | "sick";
  pendingHatch: boolean;
  setHydrated: (v: boolean) => void;
  register: (input: {
    username: string;
    email: string;
    password: string;
  }) => { ok: true } | { ok: false; error: string };
  login: (
    username: string,
    password: string,
  ) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  completeOnboarding: (input: {
    creatureName: string;
    goals: DraftGoal[];
    speciesId?: SpeciesId;
    hueShift?: number;
  }) => void;
  addGoal: (draft: DraftGoal) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  archiveGoal: (id: string, archived: boolean) => void;
  addTask: (input: {
    date: string;
    title: string;
    note?: string;
    goalId?: string | null;
    weight?: number;
  }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  moveTask: (id: string, date: string) => void;
  updateTaskSeries: (
    id: string,
    patch: Partial<Pick<Task, "title" | "note" | "weight">>,
    scope: "one" | "future",
  ) => void;
  toggleTask: (id: string) => { streakJustHit: boolean; closed: boolean; hatched: boolean };
  finalizePending: (now?: Date) => void;
  updateSettings: (patch: Partial<UserProfile>) => void;
  addFriend: (username: string) => { ok: boolean; error?: string };
  acceptFriend: (id: string) => void;
  poke: (toUser: string) => { ok: boolean; error?: string };
  bond: (friendId: string) => { ok: boolean; error?: string };
  markNoticesRead: () => void;
  pushToast: (text: string) => void;
  dismissToast: (id: string) => void;
  setWidgetAnim: (a: AppState["widgetAnim"]) => void;
  dismissHatch: () => void;
}

function makeEgg(ownerId: string, name: string): Creature {
  const now = new Date().toISOString();
  const gene = assignHiddenEggSpecies(ownerId, now);
  return {
    id: uid(),
    ownerId,
    name,
    speciesId: gene.speciesId,
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
  };
}

function generateTasks(goal: Goal, from: string, to: string): Task[] {
  return enumerateDates(from, to)
    .filter((date) => matchesFrequency(date, goal.frequency))
    .map((date) => ({
      id: uid(),
      userId: goal.userId,
      goalId: goal.id,
      date,
      title: goal.title,
      note: goal.note,
      weight: GAME_CONFIG.DEFAULT_TASK_WEIGHT,
      completed: false,
      completedAt: null,
    }));
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      users: [],
      sessionUserId: null,
      creatures: [],
      goals: [],
      tasks: [],
      scores: [],
      friendships: [],
      pairs: [],
      pokes: [],
      notices: [],
      offspring: [],
      toasts: [],
      widgetAnim: "idle",
      pendingHatch: false,
      setHydrated: (v) => set({ hydrated: v }),
      register: ({ username, email, password }) => {
        if (!validUsername(username)) return { ok: false, error: t("auth.errorUser") };
        if (password.length < 6) return { ok: false, error: t("auth.errorShort") };
        const taken = get().users.some(
          (u) =>
            u.username.toLowerCase() === username.toLowerCase() ||
            u.email.toLowerCase() === email.toLowerCase(),
        );
        if (taken) return { ok: false, error: t("auth.errorTaken") };
        const user: Account = {
          id: uid(),
          username,
          email,
          timezone: detectTimezone(),
          createdAt: new Date().toISOString(),
          onboarded: false,
          theme: "ink",
          notifyPoke: true,
          notifyEvolution: true,
          passwordHash: hashPass(password),
        };
        set({ users: [...get().users, user], sessionUserId: user.id });
        return { ok: true };
      },
      login: (username, password) => {
        const user = get().users.find(
          (u) => u.username.toLowerCase() === username.toLowerCase(),
        );
        if (!user || user.passwordHash !== hashPass(password)) {
          return { ok: false, error: t("auth.errorCreds") };
        }
        set({ sessionUserId: user.id });
        return { ok: true };
      },
      logout: () => set({ sessionUserId: null }),
      completeOnboarding: ({ creatureName, goals: drafts, speciesId, hueShift }) => {
        const user = currentUser(get());
        if (!user) return;
        const today = todayKey(user.timezone);
        const horizon = addDays(today, GAME_CONFIG.TASK_HORIZON_DAYS);
        const creature = makeEgg(user.id, creatureName.trim() || t("creature.unnamed"));
        if (speciesId) creature.speciesId = speciesId;
        if (typeof hueShift === "number") creature.hueShift = hueShift;
        const goals: Goal[] = [];
        const tasks: Task[] = [];
        for (const d of drafts) {
          if (!d.title.trim()) continue;
          const goal: Goal = {
            id: uid(),
            userId: user.id,
            title: d.title.trim(),
            note: d.note,
            targetDate: d.targetDate,
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
      },
      addGoal: (draft) => {
        const user = currentUser(get());
        if (!user) return;
        const today = todayKey(user.timezone);
        const horizon = addDays(today, GAME_CONFIG.TASK_HORIZON_DAYS);
        const goal: Goal = {
          id: uid(),
          userId: user.id,
          title: draft.title.trim(),
          note: draft.note,
          targetDate: draft.targetDate,
          frequency: draft.frequency,
          color: draft.color,
          status: "active",
          createdAt: today,
        };
        const end =
          draft.targetDate && draft.targetDate < horizon ? draft.targetDate : horizon;
        const extra = generateTasks(goal, today, end).map((task) => ({
          ...task,
          title: draft.taskTitle.trim() || draft.title.trim(),
        }));
        set({
          goals: [...get().goals, goal],
          tasks: [...get().tasks, ...extra],
        });
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
      addTask: ({ date, title, note, goalId, weight }) => {
        const user = currentUser(get());
        if (!user) return;
        set({
          tasks: [
            ...get().tasks,
            {
              id: uid(),
              userId: user.id,
              goalId: goalId ?? null,
              date,
              title: title.trim(),
              note: note ?? "",
              weight: weight ?? GAME_CONFIG.DEFAULT_TASK_WEIGHT,
              completed: false,
              completedAt: null,
            },
          ],
        });
      },
      updateTask: (id, patch) => {
        set({
          tasks: get().tasks.map((task) =>
            task.id === id ? { ...task, ...patch } : task,
          ),
        });
      },
      moveTask: (id, date) => {
        const user = currentUser(get());
        if (!user) return;
        if (!canMutateTaskDate(date, user.timezone) && date < todayKey(user.timezone)) return;
        set({
          tasks: get().tasks.map((task) => (task.id === id ? { ...task, date } : task)),
        });
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
        const todayTasks = get().tasks.filter(
          (x) => x.userId === user.id && x.date === task.date,
        );
        const dcsBefore = dailyCompletionScore(todayTasks);
        const nextTasks = get().tasks.map((x) =>
          x.id === id
            ? {
                ...x,
                completed: !x.completed,
                completedAt: !x.completed ? new Date().toISOString() : null,
              }
            : x,
        );
        const dcsAfter = dailyCompletionScore(
          nextTasks.filter((x) => x.userId === user.id && x.date === task.date),
        );
        const streakJustHit = !isStreakDay(dcsBefore) && isStreakDay(dcsAfter);
        const mine = get().creatures.find(
          (c) => c.ownerId === user.id && c.status === "active",
        );
        let creatures = get().creatures;
        let pendingHatch = get().pendingHatch;
        let hatched = false;
        if (streakJustHit && mine && !mine.hatchedAt && mine.stage === "egg") {
          const now = new Date().toISOString();
          creatures = creatures.map((c) =>
            c.id === mine.id
              ? {
                  ...c,
                  stage: "baby" as const,
                  hatchedAt: now,
                  currentStreak: Math.max(1, c.currentStreak),
                }
              : c,
          );
          pendingHatch = true;
          hatched = true;
        }
        set({
          tasks: nextTasks,
          creatures,
          pendingHatch,
          widgetAnim: hatched
            ? "happy"
            : streakJustHit
              ? "happy"
              : !task.completed
                ? "bounce"
                : "idle",
        });
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

        const first = creature.createdAt;
        for (let d = first; d < today; d = addDays(d, 1)) {
          if (scores.some((s) => s.userId === user.id && s.date === d && s.finalized)) {
            continue;
          }
          const dayTasks = get().tasks.filter(
            (x) => x.userId === user.id && x.date === d,
          );
          const live = scoreFromTasks(
            user.id,
            d,
            dayTasks,
            creature.currentStreak,
            creature.health === "sick",
          );
          const applied = applyDayFinalization({
            currentStreak: creature.currentStreak,
            longestStreak: creature.longestStreak,
            totalGp: creature.totalGp,
            dcs: live.dcs,
            hatched: Boolean(creature.hatchedAt) || creature.stage !== "egg",
            health: creature.health,
            consecutiveZeroDays: creature.consecutiveZeroDays,
            recoveryStreak: creature.recoveryStreak,
          });
          const prevStage = creature.stage;
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
            parentA: { speciesId: a.speciesId, hueShift: a.hueShift },
            parentB: { speciesId: b.speciesId, hueShift: b.hueShift },
            pairId: pair.id,
            at: bornAt,
          });
          const retire = (c: Creature, spouse: Creature): Creature => ({
            ...c,
            status: "retired",
            retiredAt: today,
            spouseOwnerId: spouse.ownerId,
            spouseCreatureName: spouse.name,
            marriedAt: bornAt,
          });
          const eggFor = (ownerId: string, parentName: string): Creature => ({
            ...makeEgg(ownerId, parentName),
            speciesId: child.speciesId,
            hueShift: child.hueShift,
          });
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

        set({ creatures, scores, notices, pairs, offspring, pendingHatch });
      },
      updateSettings: (patch) => {
        const user = currentUser(get());
        if (!user) return;
        set({
          users: get().users.map((u) => (u.id === user.id ? { ...u, ...patch } : u)),
        });
      },
      addFriend: (username) => {
        const user = currentUser(get());
        if (!user) return { ok: false, error: t("auth.errorGeneric") };
        const other = get().users.find(
          (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
        );
        if (!other || other.id === user.id) {
          return { ok: false, error: t("community.empty") };
        }
        const exists = get().friendships.some(
          (f) =>
            (f.userA === user.id && f.userB === other.id) ||
            (f.userB === user.id && f.userA === other.id),
        );
        if (exists) return { ok: false, error: t("community.friends") };
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
        set({
          pairs: [
            ...get().pairs,
            {
              id: uid(),
              userA: user.id,
              userB: friendUserId,
              creatureAId: mine.id,
              creatureBId: theirs.id,
              status: "bonded",
              syncPoints: 0,
              bondedAt: new Date().toISOString(),
              marriedAt: null,
            },
          ],
        });
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
    }),
    {
      name: "tofiby-db",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 2,
      migrate: (persisted) => {
        const p = persisted as { creatures?: Creature[] } & Record<string, unknown>;
        return {
          ...p,
          creatures: (p.creatures ?? []).map((c) => normalizeCreature(c)),
        };
      },
      partialize: (s) => ({
        users: s.users,
        sessionUserId: s.sessionUserId,
        creatures: s.creatures,
        goals: s.goals,
        tasks: s.tasks,
        scores: s.scores,
        friendships: s.friendships,
        pairs: s.pairs,
        pokes: s.pokes,
        notices: s.notices,
        offspring: s.offspring,
      }),
    },
  ),
);

function currentUser(state: AppState): Account | undefined {
  return state.users.find((u) => u.id === state.sessionUserId);
}

function normalizeCreature(c: Creature): Creature {
  return {
    ...c,
    hatchedAt: c.hatchedAt ?? (c.stage !== "egg" ? c.createdAt : null),
    health: c.health ?? "active",
    consecutiveZeroDays: c.consecutiveZeroDays ?? 0,
    recoveryStreak: c.recoveryStreak ?? 0,
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
  if (!user) return { user: null, tasks: [], score: null, creature: null };
  const date = todayKey(user.timezone);
  const todayTasks = tasks.filter((t) => t.userId === user.id && t.date === date);
  return {
    user,
    date,
    tasks: todayTasks,
    score: scoreFromTasks(
      user.id,
      date,
      todayTasks,
      creature?.currentStreak ?? 0,
      creature?.health === "sick",
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

export function liveProgress(creature: Creature | null) {
  if (!creature) return gpToNextStage(0, false);
  return gpToNextStage(
    creature.totalGp,
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
