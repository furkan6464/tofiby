"use client";

import { t } from "@/lib/i18n";
import { postponeTo } from "@/lib/plan";
import { useApp } from "@/lib/store";

export function PostponeMenu({
  taskId,
  today,
}: {
  taskId: string;
  today: string;
}) {
  const postpone = useApp((s) => s.postponeTask);
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        className="rounded-chip bg-raised px-2 py-1 text-[11px] text-muted"
        onClick={() => postpone(taskId, postponeTo("tomorrow", today))}
      >
        {t("postpone.tomorrow")}
      </button>
      <button
        className="rounded-chip bg-raised px-2 py-1 text-[11px] text-muted"
        onClick={() => postpone(taskId, postponeTo("week", today))}
      >
        {t("postpone.week")}
      </button>
      <label className="rounded-chip bg-raised px-2 py-1 text-[11px] text-muted">
        {t("postpone.custom")}
        <input
          type="date"
          className="ml-2 bg-transparent text-[11px]"
          min={today}
          onChange={(e) => {
            if (e.target.value) postpone(taskId, postponeTo("date", today, e.target.value));
          }}
        />
      </label>
    </div>
  );
}
