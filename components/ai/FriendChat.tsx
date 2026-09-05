"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Paperclip, X } from "lucide-react";
import { friendName, t } from "@/lib/i18n";
import { chat, parseSchedule, useAiEnabled } from "@/lib/ai";
import { aiErrorText } from "@/lib/aiCopy";
import type { ChatMessage, ChatReply, ScheduleLesson } from "@/lib/aiTypes";
import { durationBetween } from "@/lib/timeBlock";
import { liveProgress, useActiveCreature, useApp, useSession, useTodayBundle } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { LessonEditor } from "./LessonEditor";

type Bubble = ChatMessage & { links?: ChatReply["links"] };

export function FriendChatHost() {
  const enabled = useAiEnabled();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("tofiby:aichat", on);
    return () => window.removeEventListener("tofiby:aichat", on);
  }, []);

  if (!enabled || !open) return null;
  return <FriendChat onClose={() => setOpen(false)} />;
}

function FriendChat({ onClose }: { onClose: () => void }) {
  const user = useSession();
  const creature = useActiveCreature();
  const goals = useApp((s) => s.goals);
  const addRecurringSessions = useApp((s) => s.addRecurringSessions);
  const pushToast = useApp((s) => s.pushToast);
  const { tasks, score } = useTodayBundle();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msgs, setMsgs] = useState<Bubble[]>([]);
  const [lessons, setLessons] = useState<ScheduleLesson[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const dragCount = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs, busy, file, lessons]);

  useEffect(() => {
    const block = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!user || !creature) return null;
  const fname = friendName(creature.name);
  const todayGp = score && !score.finalized ? score.gpEarned : 0;
  const growth = liveProgress(creature, todayGp);
  const active = tasks.filter((x) => x.status !== "postponed");

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setLessons(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function send() {
    const next = text.trim();
    if (busy || !user || !creature) return;
    if (!next && !file) return;
    setText("");
    setErr("");
    if (file) {
      const label = next
        ? `${next}\n${t("ai.attached", { name: file.name })}`
        : t("ai.attached", { name: file.name });
      setMsgs((cur) => [...cur, { role: "user", text: label }]);
      setBusy(true);
      const result = await parseSchedule(file, next);
      setBusy(false);
      if (!result.ok) {
        setErr(aiErrorText(result.error));
        return;
      }
      if (result.data.length === 0) {
        setErr(t("ai.emptyLessons"));
        return;
      }
      setLessons(result.data);
      setMsgs((cur) => [...cur, { role: "model", text: t("ai.chatFileAck") }]);
      return;
    }
    const history: ChatMessage[] = [...msgs.map(({ role, text: body }) => ({ role, text: body })), { role: "user", text: next }];
    setMsgs((cur) => [...cur, { role: "user", text: next }]);
    setBusy(true);
    const result = await chat(history, {
      name: creature.name,
      stage: creature.stage,
      streak: creature.currentStreak,
      longest: creature.longestStreak,
      totalGp: Number((creature.totalGp + todayGp).toFixed(1)),
      health: creature.health,
      todayDcs: score?.dcs ?? null,
      todayDone: active.filter((x) => x.completed || x.status === "done").length,
      todayPlanned: active.length,
      goals: goals
        .filter((g) => g.userId === user.id && g.status === "active")
        .map((g) => ({
          title: g.title,
          weeklyFrequency: g.weeklyFrequency,
          dailyMins: g.dailyDurationMinutes,
        })),
    });
    setBusy(false);
    if (!result.ok) {
      setErr(aiErrorText(result.error));
      return;
    }
    setMsgs((cur) => [
      ...cur,
      { role: "model", text: result.data.reply, links: result.data.links },
    ]);
  }

  function onFile(next: File | undefined) {
    if (!next || busy) return;
    if (preview) URL.revokeObjectURL(preview);
    const url = next.type.startsWith("image/") ? URL.createObjectURL(next) : null;
    setFile(next);
    setPreview(url);
    setLessons(null);
    setErr("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCount.current += 1;
    setDrag(true);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCount.current = Math.max(0, dragCount.current - 1);
    if (dragCount.current === 0) setDrag(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCount.current = 0;
    setDrag(false);
    void onFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-end p-3 sm:p-5"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <button className="absolute inset-0 bg-black/40" aria-label={t("common.close")} onClick={onClose} />
      <section
        className={`relative flex h-[min(36rem,88dvh)] w-full max-w-md flex-col overflow-hidden rounded-nest border bg-surface shadow-glow ${
          drag ? "border-pink" : "border-white/[0.08]"
        }`}
      >
        {drag ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-nest border-2 border-dashed border-pink bg-base/80">
            <p className="font-display text-xl text-pink">{t("ai.dropHere")}</p>
          </div>
        ) : null}
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-faint">{t("ai.chat")}</p>
            <h3 className="font-display text-xl">{fname}</h3>
            <p className="text-[11px] text-muted">
              {t("widget.streak", { n: creature.currentStreak })} · %{Math.round(growth.ratio * 100)}
            </p>
          </div>
          <button type="button" className="rounded-chip p-1.5 text-faint hover:text-ink" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {msgs.length === 0 && !file ? <p className="text-sm text-faint">{t("ai.chatEmpty")}</p> : null}
          {msgs.map((m, i) => (
            <div key={`${m.role}-${i}`} className={`max-w-[90%] ${m.role === "user" ? "ml-auto" : ""}`}>
              <p
                className={`rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-violet text-base" : "bg-raised text-ink"
                }`}
              >
                {m.text}
              </p>
              {m.links?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      className="rounded-chip bg-pink px-3 py-1.5 text-xs text-base"
                    >
                      {t("ai.go")} · {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {lessons?.length ? (
            <div className="rounded-2xl border border-white/[0.08] bg-raised p-3">
              <p className="mb-2 text-xs text-muted">{t("ai.preview")}</p>
              <LessonEditor lessons={lessons} onChange={(rows) => setLessons(rows)} />
              <Button
                className="mt-3 w-full"
                type="button"
                disabled={busy}
                onClick={() => {
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
                  onClose();
                  window.location.assign(`/takvim?d=${result.firstDate}&view=week`);
                }}
              >
                {t("ai.confirm")}
              </Button>
            </div>
          ) : null}
          {busy ? <p className="text-xs text-faint">{t("ai.thinking")}</p> : null}
          {err ? <p className="text-xs text-pink">{err}</p> : null}
        </div>
        {file ? (
          <div className="flex items-center gap-3 border-t border-white/[0.06] px-3 pt-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-raised text-[10px] text-faint">
                PDF
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{file.name}</p>
              <p className="text-[11px] text-faint">{t("ai.fileReady")}</p>
            </div>
            <button
              type="button"
              className="rounded-chip p-1 text-faint hover:text-ink"
              aria-label={t("ai.removeFile")}
              onClick={clearFile}
            >
              <X size={14} />
            </button>
          </div>
        ) : null}
        <form
          className="flex items-center gap-2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            className="shrink-0 rounded-chip p-2 text-muted hover:bg-raised hover:text-ink"
            aria-label={t("ai.attach")}
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip size={18} />
          </button>
          <input
            className="min-w-0 flex-1 px-3 py-2 text-sm"
            placeholder={t("ai.chatPlaceholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="submit" disabled={busy || (!text.trim() && !file)}>
            {t("common.continue")}
          </Button>
        </form>
      </section>
    </div>
  );
}
