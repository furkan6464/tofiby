"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { GAME_CONFIG } from "@/lib/gameConfig";
import { celebrate } from "@/lib/confetti";
import { canMutateTaskDate } from "@/lib/dates";
import { useApp, useSession } from "@/lib/store";
import type { Task } from "@/lib/types";

export function TaskRow({ task }: { task: Task }) {
  const user = useSession();
  const toggle = useApp((s) => s.toggleTask);
  const update = useApp((s) => s.updateTask);
  const pushToast = useApp((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const locked = user ? !canMutateTaskDate(task.date, user.timezone) : true;

  return (
    <div className="border-b border-white/[0.04] py-2.5 last:border-0">
      <div className="flex items-start gap-3">
        <button
          disabled={locked}
          onClick={() => {
            const res = toggle(task.id);
            if (res.closed) {
              pushToast(t("calendar.closedDay"));
              return;
            }
            if (!task.completed) {
              if (res.hatched) return;
              celebrate(res.streakJustHit ? "streak" : "task");
              if (res.streakJustHit) pushToast(t("home.streakToast"));
              else pushToast(t("toast.taskOn"));
            }
          }}
          className={`mt-0.5 grid h-5 w-5 place-items-center rounded-[5px] border ${
            task.completed
              ? "border-mint bg-mint/20"
              : "border-white/15 bg-transparent"
          }`}
        >
          {task.completed ? <span className="text-[10px] text-mint">✓</span> : null}
        </button>
        <div className="min-w-0 flex-1">
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={task.completed ? "text-muted line-through" : ""}>
              {task.title}
            </span>
            {task.weight === GAME_CONFIG.PRIORITY_TASK_WEIGHT ? (
              <span className="text-[10px] text-violet">{t("common.priority")}</span>
            ) : null}
          </button>
          {open ? (
            <textarea
              className="mt-2 w-full px-2 py-2 text-sm"
              placeholder={t("common.note")}
              value={task.note}
              onChange={(e) => update(task.id, { note: e.target.value })}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
