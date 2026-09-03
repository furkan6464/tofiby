"use client";

import { useRef, useState } from "react";
import { Calendar, Link as LinkIcon, Pencil } from "lucide-react";
import { t } from "@/lib/i18n";
import { prettyDate } from "@/lib/dates";
import { durationBetween, endTime, timeOptions } from "@/lib/timeBlock";
import type { Goal, Task, TaskPriority } from "@/lib/types";
import { TogetherInvite } from "./TogetherInvite";

export type ComposerDraft = {
  id?: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  goalId: string;
  note: string;
  description?: string;
  priority?: TaskPriority;
  tag?: string | null;
};

const TIMES = timeOptions(15);

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
  faces?: { id: string; name: string }[];
  onChange: (next: ComposerDraft) => void;
  onSave: () => void;
  onClose: () => void;
  onMore?: () => void;
}) {
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [noteOpen, setNoteOpen] = useState(Boolean(draft.note));
  const [editingTitle, setEditingTitle] = useState(!draft.title.trim());
  const end = draft.time ? endTime(draft.time, draft.duration) : "";

  function startEditTitle() {
    setEditingTitle(true);
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  return (
    <div className="event-pop max-h-[min(85dvh,40rem)] w-[min(23rem,92vw)] overflow-y-auto rounded-[24px] bg-[#f7f7f8] px-6 py-6 text-[#141414] shadow-[0_36px_90px_rgba(0,0,0,0.55)]">
      <div className="flex items-start justify-between gap-3">
        {editingTitle ? (
          <input
            ref={titleRef}
            className="w-full rounded-xl !border !border-[#d8d8de] !bg-white px-2 py-1 text-[21px] font-bold leading-tight text-[#141414] outline-none"
            placeholder={t("calendar.taskName")}
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            onBlur={() => {
              if (draft.title.trim()) setEditingTitle(false);
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="w-full text-left text-[21px] font-bold leading-tight text-[#141414]"
            onClick={startEditTitle}
          >
            {draft.title || t("calendar.taskName")}
          </button>
        )}
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#888] hover:bg-black/5"
          aria-label={t("common.edit")}
          onClick={startEditTitle}
        >
          <Pencil size={16} />
        </button>
      </div>

      <div className="mt-5 space-y-5 text-sm">
        <div className="flex items-center gap-2.5 text-[#333]">
          <Calendar size={16} className="text-[#888]" />
          <span className="capitalize">{prettyDate(draft.date)}</span>
          <input
            type="date"
            className="ml-auto w-[8.5rem] rounded-xl bg-[#ececee] px-2 py-1.5 text-xs"
            value={draft.date}
            onChange={(e) => onChange({ ...draft, date: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="text-[11px] text-[#888]">{t("calendar.start")}</span>
            <select
              className="w-full rounded-xl bg-[#ececee] px-3 py-2.5 text-[#141414]"
              value={draft.time}
              onChange={(e) => onChange({ ...draft, time: e.target.value })}
            >
              {TIMES.map((tm) => (
                <option key={`s-${tm}`} value={tm}>
                  {tm}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] text-[#888]">{t("calendar.end")}</span>
            <select
              className="w-full rounded-xl bg-[#ececee] px-3 py-2.5 text-[#141414]"
              value={end}
              onChange={(e) =>
                onChange({ ...draft, duration: durationBetween(draft.time, e.target.value) })
              }
            >
              {TIMES.map((tm) => (
                <option key={`e-${tm}`} value={tm}>
                  {tm}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2.5">
          <LinkIcon size={16} className="shrink-0 text-[#888]" />
          <input
            className="w-full rounded-xl bg-[#ececee] px-3 py-2 text-sm"
            placeholder={t("calendar.link")}
            value={draft.description ?? ""}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[11px] text-[#888]">{t("calendar.attachGoal")}</span>
          <select
            className="w-full rounded-xl bg-[#ececee] px-3 py-2.5 text-[#141414]"
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

        <TogetherInvite taskId={draft.id} />

        {noteOpen ? (
          <textarea
            ref={noteRef}
            className="min-h-20 w-full rounded-xl bg-[#ececee] px-3 py-2 text-sm"
            placeholder={t("common.note")}
            value={draft.note}
            onChange={(e) => onChange({ ...draft, note: e.target.value })}
          />
        ) : null}
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-full bg-[#111] py-3 text-sm font-medium text-white"
        onClick={() => {
          if (!noteOpen) {
            setNoteOpen(true);
            requestAnimationFrame(() => noteRef.current?.focus());
            return;
          }
          onSave();
        }}
      >
        {noteOpen ? t("common.save") : t("calendar.addNote")}
      </button>
      <div className="mt-3 flex justify-between">
        <button type="button" className="text-[11px] text-[#b0b0b6]" onClick={onClose}>
          {t("common.close")}
        </button>
        {draft.id && onMore ? (
          <button type="button" className="text-[11px] text-[#b0b0b6]" onClick={onMore}>
            {t("calendar.more")}
          </button>
        ) : (
          <button type="button" className="text-[11px] text-[#b0b0b6]" onClick={onSave}>
            {t("common.save")}
          </button>
        )}
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
    description: task.description,
    priority: task.priority,
    tag: task.tag,
  };
}
