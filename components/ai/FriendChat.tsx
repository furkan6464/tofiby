"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Paperclip, Plus, Trash2, X } from "lucide-react";
import { friendName, t } from "@/lib/i18n";
import { chat, parseSchedule } from "@/lib/ai";
import { calendarAddMinutes } from "@/lib/aiCalendar";
import { buildChatSnapshot, calendarConflicts, planFromAccount } from "@/lib/aiContext";
import { aiErrorText } from "@/lib/aiCopy";
import type { ChatCalendarAdd, ChatMessage, ChatReply, ScheduleLesson } from "@/lib/aiTypes";
import { todayKey } from "@/lib/dates";
import { durationBetween, endTime } from "@/lib/timeBlock";
import { liveProgress, useActiveCreature, useApp, useSession, useTodayBundle } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { LessonEditor } from "./LessonEditor";

type Bubble = ChatMessage & { links?: ChatReply["links"] };

export function FriendChatHost() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [history, setHistory] = useState(false);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ threadId?: string; history?: boolean }>).detail ?? {};
      setThreadId(d.threadId ?? null);
      setHistory(Boolean(d.history) && !d.threadId);
      setOpen(true);
    };
    window.addEventListener("tofiby:aichat", on);
    return () => window.removeEventListener("tofiby:aichat", on);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  if (!open) return null;
  return (
    <FriendChat
      threadId={threadId}
      startInHistory={history}
      onThread={setThreadId}
      onClose={() => setOpen(false)}
    />
  );
}

function FriendChat({
  threadId,
  startInHistory,
  onThread,
  onClose,
}: {
  threadId: string | null;
  startInHistory: boolean;
  onThread: (id: string | null) => void;
  onClose: () => void;
}) {
  const user = useSession();
  const creature = useActiveCreature();
  const goals = useApp((s) => s.goals);
  const threads = useApp((s) => s.chatThreads ?? []);
  const addRecurringSessions = useApp((s) => s.addRecurringSessions);
  const addTask = useApp((s) => s.addTask);
  const saveChatThread = useApp((s) => s.saveChatThread);
  const deleteChatThread = useApp((s) => s.deleteChatThread);
  const pushToast = useApp((s) => s.pushToast);
  const { tasks: todayTasks, score } = useTodayBundle();
  const allTasks = useApp((s) => s.tasks);
  const busySlots = useApp((s) => s.busySlots);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msgs, setMsgs] = useState<Bubble[]>([]);
  const [lessons, setLessons] = useState<ScheduleLesson[] | null>(null);
  const [calendarAdds, setCalendarAdds] = useState<ChatCalendarAdd[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [showHistory, setShowHistory] = useState(startInHistory);
  const dragCount = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const skipSave = useRef(false);

  useEffect(() => {
    setShowHistory(startInHistory && !threadId);
  }, [startInHistory, threadId]);

  useEffect(() => {
    if (!threadId || msgs.length) return;
    const found = threads.find((x) => x.id === threadId);
    if (!found) return;
    skipSave.current = true;
    setMsgs(found.messages.map((m) => ({ ...m })));
  }, [threadId, threads, msgs.length]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs, busy, file, lessons, calendarAdds]);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (!msgs.length) return;
    const id = saveChatThread({
      id: threadId,
      messages: msgs.map(({ role, text: body }) => ({ role, text: body })),
    });
    if (id && id !== threadId) onThread(id);
  }, [msgs, threadId, saveChatThread, onThread]);

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
  const today = todayKey(user.timezone);
  const todayGp = score && !score.finalized ? score.gpEarned : 0;
  const growth = liveProgress(creature, todayGp);
  const active = todayTasks.filter((x) => x.status !== "postponed");
  const snapshot = buildChatSnapshot({
    name: creature.name,
    stage: creature.stage,
    streak: creature.currentStreak,
    longest: creature.longestStreak,
    totalGp: Number((creature.totalGp + todayGp).toFixed(1)),
    health: creature.health,
    todayDcs: score?.dcs ?? null,
    todayDone: active.filter((x) => x.completed || x.status === "done").length,
    todayPlanned: active.length,
    timezone: user.timezone,
    userId: user.id,
    preferredWindow: user.preferredWindow,
    restDay: user.restDayOfWeek,
    tasks: allTasks,
    busy: busySlots,
    goals,
  });
  const clashes = calendarAdds?.length ? calendarConflicts(calendarAdds, snapshot.week) : [];
  const mine = threads
    .filter((x) => x.userId === user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const weekdays = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setLessons(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function startNew() {
    skipSave.current = true;
    onThread(null);
    setMsgs([]);
    setShowHistory(false);
    setLessons(null);
    setCalendarAdds(null);
    setErr("");
  }

  async function send() {
    const next = text.trim();
    if (busy || !user || !creature) return;
    if (!next && !file) return;
    setText("");
    setErr("");
    setShowHistory(false);
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
    const history: ChatMessage[] = [
      ...msgs.map(({ role, text: body }) => ({ role, text: body })),
      { role: "user", text: next },
    ];
    setMsgs((cur) => [...cur, { role: "user", text: next }]);
    setBusy(true);
    const result = await chat(history, snapshot);
    setBusy(false);
    if (!result.ok) {
      setErr(aiErrorText(result.error));
      return;
    }
    const specifiedTime = /\d{1,2}[.:]\d{2}/.test(next);
    const wantsBest = /uygun saat|en uygun|hangisi ise/i.test(next);
    let adds =
      result.data.calendarAdds.length > 0 ? result.data.calendarAdds : planFromAccount(next, snapshot);
    if (adds.length && (!specifiedTime || wantsBest) && calendarConflicts(adds, snapshot.week).length) {
      const shifted = planFromAccount(next, snapshot);
      if (shifted.length) adds = shifted;
    }
    const claimed = /ekledim|yazdım|yazdim|koydum|eklendi/i.test(result.data.reply);
    const reply = claimed && adds.length ? t("ai.calendarAsk") : result.data.reply;
    if (adds.length) setCalendarAdds(adds);
    setMsgs((cur) => [...cur, { role: "model", text: reply, links: result.data.links }]);
  }

  function confirmCalendar() {
    const rows = calendarAdds ?? [];
    let added = 0;
    let firstDate: string | null = null;
    for (const row of rows) {
      const title = row.title.trim();
      if (!title || !row.start) continue;
      const mins = calendarAddMinutes(row);
      if (row.recurring && row.weekday != null) {
        const result = addRecurringSessions([
          { title, weekday: row.weekday, time: row.start, estimatedDurationMinutes: mins },
        ]);
        added += result.added;
        firstDate = firstDate ?? result.firstDate;
        continue;
      }
      const date = row.date || today;
      addTask({ date, title, time: row.start, estimatedDurationMinutes: mins });
      added += 1;
      firstDate = firstDate ?? date;
    }
    if (!added) {
      setErr(t("ai.noneAdded"));
      return;
    }
    setCalendarAdds(null);
    pushToast(t("ai.addedTasks", { n: added }));
    if (firstDate) {
      setMsgs((cur) => [
        ...cur,
        { role: "model", text: t("ai.addedTasks", { n: added }), links: [{ label: t("nav.calendar"), href: "/takvim" }] },
      ]);
    }
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

  function addLabel(row: ChatCalendarAdd) {
    const when = row.recurring
      ? `${weekdays[row.weekday ?? 0] ?? ""} · ${t("ai.weekly")}`
      : row.date === today
        ? t("common.today")
        : (row.date ?? today);
    const finish = row.end && row.end !== row.start ? row.end : endTime(row.start, 60);
    return `${row.title} · ${when} · ${row.start}–${finish}`;
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
            <p className="text-[10px] uppercase tracking-wide text-faint">AI · {t("ai.chat")}</p>
            <h3 className="font-display text-xl">{fname}</h3>
            <p className="text-[11px] text-muted">
              {t("widget.streak", { n: creature.currentStreak })} · %{Math.round(growth.ratio * 100)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-chip p-1.5 text-faint hover:text-ink"
              aria-label={t("ai.history")}
              onClick={() => setShowHistory((v) => !v)}
            >
              <History size={16} />
            </button>
            <button type="button" className="rounded-chip p-1.5 text-faint hover:text-ink" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </header>
        {showHistory ? (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-2xl bg-raised px-3 py-2 text-sm"
              onClick={startNew}
            >
              <Plus size={14} />
              {t("ai.newChat")}
            </button>
            {mine.length === 0 ? <p className="text-sm text-faint">{t("ai.historyEmpty")}</p> : null}
            {mine.map((thread) => (
              <div key={thread.id} className="flex items-stretch gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-2xl bg-raised px-3 py-2 text-left"
                  onClick={() => {
                    skipSave.current = true;
                    onThread(thread.id);
                    setMsgs(thread.messages.map((m) => ({ ...m })));
                    setShowHistory(false);
                  }}
                >
                  <p className="truncate text-sm">{thread.title}</p>
                  <p className="text-[10px] text-faint">
                    {thread.updatedAt.slice(0, 10)} {thread.updatedAt.slice(11, 16)}
                  </p>
                </button>
                <button
                  type="button"
                  className="rounded-2xl px-2 text-faint hover:text-pink"
                  aria-label={t("ai.deleteThread")}
                  onClick={() => {
                    deleteChatThread(thread.id);
                    if (threadId === thread.id) startNew();
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
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
            {calendarAdds?.length ? (
              <div className="rounded-2xl border border-pink/40 bg-raised p-3">
                <p className="mb-2 text-xs text-pink">{t("ai.calendarPreview")}</p>
                <ul className="space-y-1 text-sm">
                  {calendarAdds.map((row, i) => (
                    <li key={`${row.title}-${i}`}>{addLabel(row)}</li>
                  ))}
                </ul>
                {clashes.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-pink">
                    {clashes.map((c, i) => (
                      <li key={`${c.when}-${i}`}>
                        {t("ai.conflict", { when: c.when, title: c.title })}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Button className="mt-3 w-full" type="button" disabled={busy} onClick={confirmCalendar}>
                  {t("ai.confirm")}
                </Button>
                <button
                  type="button"
                  className="mt-2 w-full text-center text-[11px] text-faint"
                  onClick={() => setCalendarAdds(null)}
                >
                  {t("ai.reject")}
                </button>
              </div>
            ) : null}
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
        )}
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
