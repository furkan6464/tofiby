import { addDays, todayKey, weekKeys } from "./dates";
import { defaultGenetics, eggShellVariant } from "./genetics";
import { sampleTask } from "./testTask";
import type { Creature, Goal, Task } from "./types";

export const DEMO_USER = "landing-demo";
export const DEMO_TZ = "Europe/Istanbul";

export function demoToday() {
  return todayKey(DEMO_TZ);
}

export function demoCreature(today: string): Creature {
  const hue = 330;
  return {
    id: "landing-creature",
    ownerId: DEMO_USER,
    name: "Tofiby",
    speciesId: "tofiby",
    gender: "kiz",
    stage: "baby",
    totalGp: 90,
    currentStreak: 4,
    longestStreak: 4,
    hueShift: hue,
    adultReachedAt: null,
    adultGpSnapshot: null,
    hatchedAt: addDays(today, -4),
    health: "active",
    consecutiveZeroDays: 0,
    recoveryStreak: 0,
    status: "active",
    createdAt: addDays(today, -12),
    retiredAt: null,
    spouseOwnerId: null,
    spouseCreatureName: null,
    marriedAt: null,
    parentAId: null,
    parentBId: null,
    generation: 1,
    genetics: defaultGenetics("tofiby", hue, ["landing", "demo"]),
    eggShellVariant: eggShellVariant("tofiby", hue),
    rareMutation: false,
    unlockedRoomItems: [],
    letters: [],
  };
}

export function demoGoals(today: string): Goal[] {
  return [
    {
      id: "landing-g-en",
      userId: DEMO_USER,
      title: "İngilizce",
      note: "",
      startDate: today,
      targetDate: null,
      weeklyFrequency: 5,
      dailyDurationMinutes: 45,
      frequency: { kind: "weekdays" },
      color: "#ff3e9e",
      status: "active",
      createdAt: today,
    },
    {
      id: "landing-g-math",
      userId: DEMO_USER,
      title: "Matematik",
      note: "",
      startDate: today,
      targetDate: null,
      weeklyFrequency: 3,
      dailyDurationMinutes: 40,
      frequency: { kind: "times_per_week", timesPerWeek: 3 },
      color: "#8b5cf6",
      status: "active",
      createdAt: today,
    },
  ];
}

export function seedDemoTasks(today: string): Task[] {
  const week = weekKeys(today);
  const en = "landing-g-en";
  const math = "landing-g-math";
  return [
    sampleTask({
      id: "landing-t1",
      userId: DEMO_USER,
      goalId: math,
      date: today,
      time: "14:00",
      title: "Matematik",
      weight: 1,
      completed: true,
      estimatedDurationMinutes: 45,
    }),
    sampleTask({
      id: "landing-t2",
      userId: DEMO_USER,
      goalId: en,
      date: today,
      time: "19:00",
      title: "İngilizce",
      weight: 1,
      completed: false,
      estimatedDurationMinutes: 45,
    }),
    sampleTask({
      id: "landing-t3",
      userId: DEMO_USER,
      goalId: null,
      date: today,
      time: "21:00",
      title: "Fizik",
      weight: 1,
      completed: false,
      estimatedDurationMinutes: 40,
    }),
    sampleTask({
      id: "landing-t4",
      userId: DEMO_USER,
      goalId: en,
      date: week[1] ?? addDays(today, 1),
      time: "18:00",
      title: "İngilizce",
      weight: 1,
      completed: false,
      estimatedDurationMinutes: 45,
    }),
    sampleTask({
      id: "landing-t5",
      userId: DEMO_USER,
      goalId: math,
      date: week[3] ?? addDays(today, 2),
      time: "13:00",
      title: "Matematik",
      weight: 1,
      completed: false,
      estimatedDurationMinutes: 40,
    }),
  ];
}

export function toggleDemoTask(tasks: Task[], id: string): Task[] {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    const done = !task.completed;
    return {
      ...task,
      completed: done,
      status: done ? "done" : "pending",
      completedAt: done ? new Date().toISOString() : null,
    };
  });
}

export function moveDemoTask(tasks: Task[], id: string, date: string, time: string): Task[] {
  return tasks.map((task) => (task.id === id ? { ...task, date, time } : task));
}

export function addDemoTask(tasks: Task[], title: string, date: string, time: string): Task[] {
  if (tasks.some((task) => task.title === title && task.date === date && task.time === time)) {
    return tasks;
  }
  return [
    ...tasks,
    sampleTask({
      id: `landing-${Date.now()}`,
      userId: DEMO_USER,
      date,
      time,
      title,
      weight: 1,
      completed: false,
      estimatedDurationMinutes: 45,
      goalId: "landing-g-en",
    }),
  ];
}
