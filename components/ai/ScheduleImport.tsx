"use client";

import { useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { parseSchedule, requestAiAccess } from "@/lib/ai";
import { aiErrorText } from "@/lib/aiCopy";
import type { ScheduleLesson } from "@/lib/aiTypes";
import { durationBetween } from "@/lib/timeBlock";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { ConfirmList } from "./ConfirmList";
import { LessonEditor } from "./LessonEditor";

export function ScheduleImportButton() {
  const addRecurringSessions = useApp((s) => s.addRecurringSessions);
  const pushToast = useApp((s) => s.pushToast);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lessons, setLessons] = useState<ScheduleLesson[] | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr("");
    const result = await parseSchedule(file);
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!result.ok) {
      setErr(aiErrorText(result.error));
      return;
    }
    if (result.data.length === 0) {
      setErr(t("ai.emptyLessons"));
      return;
    }
    setLessons(result.data);
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Button
        tone="ghost"
        type="button"
        disabled={busy}
        onClick={() => requestAiAccess(() => input.current?.click())}
      >
        {busy ? t("ai.reading") : t("ai.uploadSchedule")}
      </Button>
      {err && !lessons ? <p className="mt-1 text-[11px] text-pink">{err}</p> : null}
      <ConfirmList
        open={Boolean(lessons)}
        title={t("ai.uploadSchedule")}
        hint={t("ai.preview")}
        canConfirm={Boolean(lessons?.length)}
        error={err}
        onClose={() => setLessons(null)}
        onConfirm={() => {
          if (!lessons?.length) return;
          const result = addRecurringSessions(
            lessons.map((row) => ({
              title: row.dersAdi,
              weekday: Number(row.weekday),
              time: row.baslangicSaati,
              estimatedDurationMinutes: durationBetween(row.baslangicSaati, row.bitisSaati),
            })),
          );
          if (!result.added) {
            setErr(t("ai.noneAdded"));
            return;
          }
          pushToast(t("ai.addedLessons", { n: result.added }));
          setLessons(null);
          if (result.firstDate) {
            window.location.assign(`/takvim?d=${result.firstDate}&view=week`);
          }
        }}
      >
        <LessonEditor lessons={lessons ?? []} onChange={(rows) => setLessons(rows)} />
      </ConfirmList>
    </>
  );
}
