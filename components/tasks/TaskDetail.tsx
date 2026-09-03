"use client";

import { t } from "@/lib/i18n";
import { GAME_CONFIG } from "@/lib/gameConfig";
import { uid } from "@/lib/ids";
import { useApp } from "@/lib/store";
import type { ChecklistItem, Task, TaskPriority } from "@/lib/types";
import { Field, Area } from "@/components/ui/Field";
import { PostponeMenu } from "./PostponeMenu";

export function TaskDetail({ task, today }: { task: Task; today: string }) {
  const update = useApp((s) => s.updateTask);
  const move = useApp((s) => s.moveTask);
  const goals = useApp((s) => s.goals);
  const milestones = useApp((s) => s.milestones);
  const mine = goals.filter((g) => g.userId === task.userId && g.status === "active");
  const stones = milestones.filter((m) => m.goalId === (task.goalId ?? ""));

  function patch(partial: Partial<Task>) {
    update(task.id, partial);
  }

  return (
    <div className="space-y-3">
      <Field
        label={t("calendar.taskName")}
        value={task.title}
        onChange={(e) => patch({ title: e.target.value })}
      />
      <Area
        label={t("calendar.desc")}
        value={task.description}
        onChange={(e) => patch({ description: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">{t("calendar.date")}</span>
          <input
            type="date"
            className="w-full px-3 py-2.5"
            value={task.date}
            onChange={(e) => move(task.id, e.target.value, task.time)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">{t("calendar.time")}</span>
          <input
            type="time"
            className="w-full px-3 py-2.5"
            value={task.time ?? ""}
            onChange={(e) => move(task.id, task.date, e.target.value || null)}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={t("calendar.duration")}
          type="number"
          min={5}
          value={task.estimatedDurationMinutes ?? ""}
          onChange={(e) =>
            patch({ estimatedDurationMinutes: e.target.value ? Number(e.target.value) : null })
          }
        />
        <Field
          label={t("calendar.reminder")}
          type="number"
          min={0}
          value={task.reminderOffsetMinutes ?? ""}
          onChange={(e) =>
            patch({ reminderOffsetMinutes: e.target.value ? Number(e.target.value) : null })
          }
        />
      </div>
      <div>
        <p className="mb-1.5 text-sm text-muted">{t("calendar.priority")}</p>
        <div className="flex gap-2">
          {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() =>
                patch({
                  priority: p,
                  weight: p === "high" ? GAME_CONFIG.PRIORITY_TASK_WEIGHT : GAME_CONFIG.DEFAULT_TASK_WEIGHT,
                })
              }
              className={`rounded-chip px-3 py-1.5 text-xs ${task.priority === p ? "bg-raised" : "text-faint"}`}
            >
              {t(p === "low" ? "calendar.priorityLow" : p === "high" ? "calendar.priorityHigh" : "calendar.priorityMid")}
            </button>
          ))}
        </div>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">{t("calendar.attachGoal")}</span>
        <select
          className="w-full rounded-chip bg-raised px-3 py-2.5"
          value={task.goalId ?? ""}
          onChange={(e) => patch({ goalId: e.target.value || null, milestoneId: null })}
        >
          <option value="">{t("calendar.noGoal")}</option>
          {mine.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </label>
      {stones.length > 0 ? (
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">{t("calendar.milestone")}</span>
          <select
            className="w-full rounded-chip bg-raised px-3 py-2.5"
            value={task.milestoneId ?? ""}
            onChange={(e) => patch({ milestoneId: e.target.value || null })}
          >
            <option value="">{t("common.optional")}</option>
            {stones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Field
        label={t("calendar.tag")}
        value={task.tag ?? ""}
        onChange={(e) => patch({ tag: e.target.value || null })}
      />
      <Field
        label={t("common.note")}
        value={task.note}
        onChange={(e) => patch({ note: e.target.value })}
      />
      <div>
        <p className="mb-1.5 text-sm text-muted">{t("calendar.checklist")}</p>
        {(task.checklist ?? []).map((item) => (
          <label key={item.id} className="mt-1 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() =>
                patch({
                  checklist: task.checklist.map((c) =>
                    c.id === item.id ? { ...c, done: !c.done } : c,
                  ),
                })
              }
            />
            <span className={item.done ? "text-faint line-through" : ""}>{item.title}</span>
          </label>
        ))}
        <input
          className="mt-2 w-full px-3 py-2 text-sm"
          placeholder={t("calendar.inlineAdd")}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const title = e.currentTarget.value.trim();
            if (!title) return;
            const item: ChecklistItem = { id: uid(), title, done: false };
            patch({ checklist: [...(task.checklist ?? []), item] });
            e.currentTarget.value = "";
          }}
        />
      </div>
      {!task.completed ? <PostponeMenu taskId={task.id} today={today} /> : null}
    </div>
  );
}
