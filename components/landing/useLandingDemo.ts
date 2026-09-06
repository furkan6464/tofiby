"use client";

import { useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import {
  addDemoTask,
  demoCreature,
  demoGoals,
  demoToday,
  moveDemoTask,
  seedDemoTasks,
  toggleDemoTask,
} from "@/lib/landingDemo";

export function useLandingDemo() {
  const today = useMemo(() => demoToday(), []);
  const creature = useMemo(() => demoCreature(today), [today]);
  const goals = useMemo(() => demoGoals(today), [today]);
  const [tasks, setTasks] = useState(() => seedDemoTasks(today));
  const [cursor, setCursor] = useState(today);

  return {
    today,
    creature,
    goals,
    tasks,
    cursor,
    setCursor,
    toggle: (id: string) => setTasks((cur) => toggleDemoTask(cur, id)),
    move: (id: string, date: string, time: string) =>
      setTasks((cur) => moveDemoTask(cur, id, date, time)),
    place: (title: string, date: string, time: string) =>
      setTasks((cur) => addDemoTask(cur, title, date, time)),
    addSlot: (date: string, time: string) =>
      setTasks((cur) => addDemoTask(cur, t("landing.demoSlot"), date, time)),
  };
}
