"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { remainingToStreak } from "@/lib/plan";
import { addDays, prettyDate, weekKeys } from "@/lib/dates";
import { DEMO_TZ, DEMO_USER } from "@/lib/landingDemo";
import { liveProgress } from "@/lib/store";
import type { Creature, Goal, Task } from "@/lib/types";
import { WeekGrid } from "@/components/calendar/WeekGrid";
import { CreatureView } from "@/components/creature/CreatureView";
import { StageProgress } from "@/components/creature/StageProgress";
import { Progress } from "@/components/ui/Progress";

export function DemoToday({
  today,
  tasks,
  onToggle,
  compact = false,
}: {
  today: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  compact?: boolean;
}) {
  const day = tasks
    .filter((x) => x.date === today && x.status !== "postponed")
    .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
  const coach = remainingToStreak(day);
  const pct = coach.planned ? Math.round((coach.done / coach.planned) * 100) : 0;
  return (
    <div className={`h-full overflow-y-auto text-left ${compact ? "px-3 py-3" : "px-4 py-4"}`}>
      <p className="text-[11px] text-faint">{t("home.todayKicker", { date: prettyDate(today) })}</p>
      <h2 className={`mt-1 font-display ${compact ? "text-xl" : "text-2xl"}`}>{t("home.todayTitle")}</h2>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-faint">
          <span>{t("home.todayBar")}</span>
          <span>
            %{pct} · {t("home.todayCount", { done: coach.done, total: coach.planned })}
          </span>
        </div>
        <Progress value={pct} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {coach.met
          ? t("home.todayCueMet")
          : t("home.coach", { planned: coach.planned, done: coach.done, need: coach.remaining })}
      </p>
      <ul className="mt-3">
        {day.map((task) => (
          <li key={task.id} className="border-b border-white/[0.04] py-2.5 last:border-0">
            <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => onToggle(task.id)}>
              <span
                className={`grid h-5 w-5 place-items-center rounded-[5px] border ${
                  task.completed ? "border-mint bg-mint/20" : "border-white/15"
                }`}
              >
                {task.completed ? <span className="text-[10px] text-mint">✓</span> : null}
              </span>
              {task.time ? <span className="pixel-num text-[10px] text-faint">{task.time}</span> : null}
              <span className={task.completed ? "text-muted line-through" : ""}>{task.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DemoCalendar({
  today,
  tasks,
  goals,
  cursor,
  onCursor,
  onMove,
  onSlot,
}: {
  today: string;
  tasks: Task[];
  goals: Goal[];
  cursor: string;
  onCursor: (d: string) => void;
  onMove: (id: string, date: string, time: string) => void;
  onSlot: (date: string, time: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col px-2 pt-3">
      <div className="flex items-end justify-between px-2 pb-2">
        <p className="text-left font-display text-xl">{t("nav.calendar")}</p>
        <p className="text-[11px] text-faint">{prettyDate(cursor)}</p>
      </div>
      <WeekGrid
        week={weekKeys(today)}
        today={today}
        cursor={cursor}
        tasks={tasks}
        goals={goals}
        quests={[]}
        userId={DEMO_USER}
        partners={[]}
        timezone={DEMO_TZ}
        onCursor={onCursor}
        onOpen={() => undefined}
        onSlot={(date, time) => onSlot(date, time)}
        onMove={onMove}
      />
    </div>
  );
}

export function DemoFriend({ creature, compact = false }: { creature: Creature; compact?: boolean }) {
  const progress = liveProgress(creature);
  return (
    <div className={`flex h-full flex-col items-center justify-center px-5 ${compact ? "gap-3 py-4" : "gap-4 py-6"}`}>
      <CreatureView
        speciesId={creature.speciesId}
        stage="baby"
        hueShift={creature.hueShift}
        genetics={creature.genetics}
        pixelSize={compact ? 5 : 7}
        state="idle"
      />
      <div className="w-full max-w-[14rem]">
        <p className={`text-center font-display ${compact ? "text-lg" : "text-xl"}`}>{creature.name}</p>
        <p className="mt-1 text-center text-xs text-faint">
          {t("home.greetDay", { name: creature.name })} · {t("stage.baby")}
        </p>
        <div className="mt-3">
          <StageProgress progress={progress} size={compact ? "sm" : "md"} />
        </div>
        <p className="mt-3 text-center text-sm text-muted">
          {t("landing.demoStreak", { n: creature.currentStreak })}
        </p>
      </div>
    </div>
  );
}

export function DemoTogether() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-4 py-6">
      <div className="flex items-end gap-6">
        <CreatureView speciesId="tofiby" stage="adult" hueShift={330} pixelSize={5} state="idle" />
        <CreatureView speciesId="bulut" stage="adult" hueShift={268} pixelSize={5} state="idle" />
      </div>
      <p className="max-w-[16rem] text-center text-sm text-muted">{t("landing.togetherHint")}</p>
    </div>
  );
}

export function DemoChat({
  today,
  onPlace,
  compact = false,
}: {
  today: string;
  onPlace: (title: string, date: string, time: string) => void;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<{ role: "user" | "model"; text: string }[]>([
    { role: "model", text: t("landing.demoChatHi") },
  ]);
  function send(raw?: string) {
    const next = (raw ?? text).trim();
    if (!next) return;
    const tomorrow = addDays(today, 1);
    const placed = /ingilizce|i̇ngilizce|english/i.test(next);
    setMsgs((cur) => [
      ...cur,
      { role: "user", text: next },
      {
        role: "model",
        text: placed ? t("landing.demoChatDone") : t("landing.demoChatReply"),
      },
    ]);
    if (placed) onPlace("İngilizce", tomorrow, "20:00");
    setText("");
  }
  return (
    <div className={`flex h-full flex-col ${compact ? "px-2.5 py-2.5" : "px-3 py-3"}`}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-faint">{t("ai.chat")}</p>
      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {msgs.map((m, i) => (
          <p
            key={`${m.role}-${i}`}
            className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
              m.role === "user" ? "ml-auto bg-violet text-base" : "bg-raised text-ink"
            }`}
          >
            {m.text}
          </p>
        ))}
      </div>
      <button
        type="button"
        className="mt-2 rounded-2xl bg-raised px-3 py-2 text-left text-xs text-muted"
        onClick={() => send(t("onboarding.previewAiType"))}
      >
        {t("onboarding.previewAiType")}
      </button>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          className="min-w-0 flex-1 px-3 py-2 text-sm"
          placeholder={t("ai.chatPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="rounded-chip bg-pink px-3 py-2 text-xs text-base">
          {t("ai.send")}
        </button>
      </form>
    </div>
  );
}
