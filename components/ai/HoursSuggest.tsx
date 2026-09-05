"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { goalNeedMinutes, requestAiAccess, suggestStudyHours, weekFreeWindows } from "@/lib/ai";
import { aiErrorText } from "@/lib/aiCopy";
import type { StudySlot } from "@/lib/aiTypes";
import { weekdayLabel } from "@/lib/dates";
import { durationBetween } from "@/lib/timeBlock";
import { useApp, useSession } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { ConfirmList } from "./ConfirmList";

export function HoursSuggestButton({
  title,
  hours,
}: {
  title: string;
  hours: string;
}) {
  const user = useSession();
  const tasks = useApp((s) => s.tasks);
  const busy = useApp((s) => s.busySlots);
  const goals = useApp((s) => s.goals);
  const addRecurringSessions = useApp((s) => s.addRecurringSessions);
  const pushToast = useApp((s) => s.pushToast);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");
  const [slots, setSlots] = useState<StudySlot[] | null>(null);

  if (!user) return null;

  async function run() {
    const name = title.trim();
    if (!name || !user) return;
    const mins = Math.max(30, (Number(hours) || 1) * 60);
    const mine = goals.filter((g) => g.userId === user.id && g.status === "active");
    const fallback = mine[0] ? goalNeedMinutes(mine[0]) : { weeklyFrequency: 3, weeklyMinutes: mins };
    setPending(true);
    setErr("");
    const result = await suggestStudyHours({
      title: name,
      weeklyMinutes: mins || fallback.weeklyMinutes,
      weeklyFrequency: fallback.weeklyFrequency,
      free: weekFreeWindows(user.id, user.timezone, tasks, busy),
      goals: mine.map((g) => ({ title: g.title })),
    });
    setPending(false);
    if (!result.ok) {
      setErr(aiErrorText(result.error));
      return;
    }
    setSlots(result.data);
  }

  return (
    <>
      <Button
        tone="ghost"
        type="button"
        className="w-full"
        disabled={pending || !title.trim()}
        onClick={() => requestAiAccess(() => void run())}
      >
        {pending ? t("ai.thinking") : t("ai.suggestHours")}
      </Button>
      {err && !slots ? <p className="text-[11px] text-pink">{err}</p> : null}
      <ConfirmList
        open={Boolean(slots)}
        title={t("ai.suggestHours")}
        hint={t("ai.suggestPreview")}
        canConfirm={Boolean(slots?.length)}
        error={err}
        onClose={() => setSlots(null)}
        onConfirm={() => {
          const chosen = (slots ?? []).filter((s) => s.title.trim());
          if (!chosen.length) return;
          addRecurringSessions(
            chosen.map((s) => ({
              title: s.title,
              weekday: s.weekday,
              time: s.start,
              estimatedDurationMinutes: durationBetween(s.start, s.end),
            })),
          );
          pushToast(t("ai.addedHours", { n: chosen.length }));
          setSlots(null);
        }}
      >
        {(slots ?? []).map((row, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              defaultChecked
              onChange={(e) => {
                if (!e.target.checked) {
                  setSlots((cur) => (cur ?? []).filter((_, j) => j !== i));
                }
              }}
            />
            <span className="min-w-10 text-faint">{weekdayLabel(row.weekday)}</span>
            <input
              className="w-24 px-2 py-1"
              type="time"
              value={row.start}
              onChange={(e) =>
                setSlots((cur) => (cur ?? []).map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))
              }
            />
            <input
              className="w-24 px-2 py-1"
              type="time"
              value={row.end}
              onChange={(e) =>
                setSlots((cur) => (cur ?? []).map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))
              }
            />
            <input
              className="min-w-0 flex-1 px-2 py-1"
              value={row.title}
              onChange={(e) =>
                setSlots((cur) => (cur ?? []).map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
              }
            />
          </label>
        ))}
      </ConfirmList>
    </>
  );
}
