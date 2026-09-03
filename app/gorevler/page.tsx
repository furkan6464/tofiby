"use client";

import { useMemo } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { prettyDate, todayKey } from "@/lib/dates";
import { useApp, useSession } from "@/lib/store";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Card } from "@/components/ui/Card";

export default function TasksPage() {
  const user = useSession();
  const tasks = useApp((s) => s.tasks);
  const today = user ? todayKey(user.timezone) : "";
  const upcoming = useMemo(
    () =>
      user
        ? tasks
            .filter((x) => x.userId === user.id && x.date >= today && x.status !== "postponed")
            .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
        : [],
    [tasks, user, today],
  );
  if (!user) return null;
  const groups = upcoming.reduce<Record<string, typeof upcoming>>((acc, task) => {
    acc[task.date] = acc[task.date] ?? [];
    acc[task.date].push(task);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-display text-4xl">{t("tasksPage.title")}</h1>
      <div className="mt-6 space-y-4">
        {Object.keys(groups).length === 0 ? (
          <Card className="p-8 text-center text-muted">{t("tasksPage.empty")}</Card>
        ) : (
          Object.entries(groups).map(([date, list]) => (
            <Card key={date} className="p-4">
              <Link href={`/takvim?d=${date}`} className="text-sm text-muted">
                {prettyDate(date)}
              </Link>
              <div className="mt-2">
                {list.map((task) => (
                  <TaskRow key={task.id} task={task} showTime postpone={date === today} />
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
