"use client";

import { t } from "@/lib/i18n";
import type { Goal, Task } from "@/lib/types";
import { endTime } from "@/lib/timeBlock";
import { Field, Area } from "@/components/ui/Field";

export type ComposerDraft = {
  id?: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  goalId: string;
  note: string;
};

export function EventComposer({
  draft,
  goals,
  onChange,
  onSave,
  onClose,
  onMore,
}: {
  draft: ComposerDraft;
  goals: Goal[];
  onChange: (next: ComposerDraft) => void;
  onSave: () => void;
  onClose: () => void;
  onMore?: () => void;
}) {
  const end = draft.time ? endTime(draft.time, draft.duration) : "";
  return (
    <div className="event-pop w-[min(22rem,92vw)] rounded-2xl bg-white p-4 text-[#141414] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <input
          className="w-full border-0 bg-transparent px-0 py-1 text-lg font-semibold text-[#141414] outline-none"
          placeholder={t("calendar.taskName")}
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          autoFocus
        />
        <button className="text-sm text-[#666]" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
      <div className="space-y-2">
        <Field
          label={t("calendar.date")}
          type="date"
          value={draft.date}
          onChange={(e) => onChange({ ...draft, date: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field
            label={t("calendar.start")}
            type="time"
            value={draft.time}
            onChange={(e) => onChange({ ...draft, time: e.target.value })}
          />
          <Field
            label={t("calendar.duration")}
            type="number"
            min={15}
            step={15}
            value={draft.duration}
            onChange={(e) => onChange({ ...draft, duration: Number(e.target.value) || 30 })}
          />
        </div>
        {end ? <p className="text-xs text-[#666]">{draft.time} – {end}</p> : null}
        <label className="block space-y-1.5">
          <span className="text-sm text-[#555]">{t("calendar.attachGoal")}</span>
          <select
            className="w-full rounded-xl bg-[#f4f4f5] px-3 py-2.5 text-[#141414]"
            value={draft.goalId}
            onChange={(e) => onChange({ ...draft, goalId: e.target.value })}
          >
            <option value="">{t("calendar.noGoal")}</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <Area
          label={t("common.note")}
          value={draft.note}
          onChange={(e) => onChange({ ...draft, note: e.target.value })}
        />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          className="flex-1 rounded-xl bg-[#111] py-2.5 text-sm text-white"
          onClick={onSave}
        >
          {t("common.save")}
        </button>
        {onMore && draft.id ? (
          <button className="rounded-xl bg-[#f4f4f5] px-3 py-2.5 text-sm text-[#333]" onClick={onMore}>
            {t("calendar.more")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function taskToDraft(task: Task): ComposerDraft {
  return {
    id: task.id,
    title: task.title,
    date: task.date,
    time: task.time ?? "09:00",
    duration: task.estimatedDurationMinutes ?? 30,
    goalId: task.goalId ?? "",
    note: task.note,
  };
}
