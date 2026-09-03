"use client";

import { useState } from "react";
import { t, tList } from "@/lib/i18n";
import { GOAL_COLORS } from "@/lib/goalColors";
import { todayKey } from "@/lib/dates";
import { useApp, useSession } from "@/lib/store";
import type { FrequencyPattern } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Progress } from "@/components/ui/Progress";

export default function GoalsPage() {
  const user = useSession();
  const goals = useApp((s) => s.goals);
  const tasks = useApp((s) => s.tasks);
  const addGoal = useApp((s) => s.addGoal);
  const archiveGoal = useApp((s) => s.archiveGoal);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState<string>(GOAL_COLORS[0]);
  const [frequency, setFrequency] = useState<FrequencyPattern>({ kind: "daily" });

  if (!user) return null;
  const today = todayKey(user.timezone);
  const mine = goals.filter((g) => g.userId === user.id && g.status === tab);
  const weekdays = tList("onboarding.weekdays");

  return (
    <main className="safe-pad mx-auto max-w-3xl px-5 py-8">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-4xl">{t("goals.title")}</h1>
        <Button onClick={() => setOpen(true)}>{t("goals.new")}</Button>
      </div>
      <div className="mt-6 flex gap-2">
        {(["active", "archived"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-chip px-3 py-1.5 text-sm ${tab === k ? "bg-raised" : "text-faint"}`}
          >
            {t(`goals.${k}`)}
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {mine.length === 0 ? (
          <Card className="p-8 text-center text-muted">{t("goals.empty")}</Card>
        ) : (
          mine.map((g) => {
            const related = tasks.filter((x) => x.goalId === g.id && x.date <= today);
            const done = related.filter((x) => x.completed).length;
            const pct = related.length ? Math.round((done / related.length) * 100) : 0;
            return (
              <Card key={g.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl">{g.title}</p>
                    <p className="mt-1 text-sm text-faint">
                      {t("goals.progress", { pct, done })}
                      {g.targetDate ? ` · ${t("goals.until", { date: g.targetDate })}` : ""}
                    </p>
                  </div>
                  <span className="mt-1 h-3 w-3 rounded-full" style={{ background: g.color }} />
                </div>
                <div className="mt-3">
                  <Progress value={pct} tone="violet" />
                </div>
                <button
                  className="mt-4 text-sm text-violet"
                  onClick={() => archiveGoal(g.id, tab === "active")}
                >
                  {tab === "active" ? t("common.archive") : t("common.restore")}
                </button>
              </Card>
            );
          })
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t("goals.new")}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            addGoal({
              title,
              taskTitle: taskTitle || title,
              note: "",
              targetDate: targetDate || null,
              frequency,
              color,
            });
            setTitle("");
            setTaskTitle("");
            setOpen(false);
          }}
        >
          <Field label={t("onboarding.goalTitle")} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Field
            label={t("onboarding.taskTitle")}
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <Field
            label={t("onboarding.goalDate")}
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["daily", "onboarding.freqDaily"],
                ["weekdays", "onboarding.freqWeekdays"],
                ["times_per_week", "onboarding.freqTimes"],
                ["custom", "onboarding.freqCustom"],
              ] as const
            ).map(([kind, key]) => (
              <button
                key={kind}
                type="button"
                onClick={() => setFrequency({ kind })}
                className={`rounded-chip px-3 py-1.5 text-xs ${frequency.kind === kind ? "bg-raised" : "text-faint"}`}
              >
                {t(key)}
              </button>
            ))}
          </div>
          {frequency.kind === "custom" ? (
            <div className="flex flex-wrap gap-1">
              {weekdays.map((label, d) => {
                const wd = d === 6 ? 0 : d + 1;
                const on = frequency.weekdays?.includes(wd);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      const cur = new Set(frequency.weekdays ?? []);
                      if (cur.has(wd)) cur.delete(wd);
                      else cur.add(wd);
                      setFrequency({ kind: "custom", weekdays: Array.from(cur) });
                    }}
                    className={`rounded-[6px] px-2 py-1 text-xs ${on ? "bg-violet text-base" : "bg-raised text-muted"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="flex gap-2">
            {GOAL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-5 w-5 rounded-[4px]"
                style={{ background: c, outline: color === c ? "2px solid white" : "none" }}
              />
            ))}
          </div>
          <Button className="w-full" type="submit">
            {t("common.save")}
          </Button>
        </form>
      </Modal>
    </main>
  );
}
