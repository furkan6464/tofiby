"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { History, Paperclip, Plus, Trash2, X } from "lucide-react";
import { friendName, t } from "@/lib/i18n";
import { chat, chatContinue, parseSchedule } from "@/lib/ai";
import { buildChatSnapshot, planFromAccount } from "@/lib/aiContext";
import { aiErrorText } from "@/lib/aiCopy";
import { applyChatCalendarAdds, runAiTools, undoAiAction } from "@/lib/aiToolRuntime";
import type { AiToolTrace, ChatMessage, ChatReply, ChatUndo, ScheduleLesson } from "@/lib/aiTypes";
import { todayKey } from "@/lib/dates";
import { durationBetween } from "@/lib/timeBlock";
import { liveProgress, useActiveCreature, useApp, useSession, useTodayBundle } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { LessonEditor } from "./LessonEditor";

type Bubble = ChatMessage & { links?: ChatReply["links"]; undos?: ChatUndo[] };

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
  const router = useRouter();
  const goals = useApp((s) => s.goals);
  const threads = useApp((s) => s.chatThreads ?? []);
  const addRecurringSessions = useApp((s) => s.addRecurringSessions);
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
  }, [msgs, busy, file, lessons]);

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
    hasAttachedFile: Boolean(file),
  });
  const mine = threads
    .filter((x) => x.userId === user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
    setErr("");
  }

  async function send() {
    const next = text.trim();
    if (busy || !user || !creature) return;
    if (!next && !file) return;
    const attached = file;
    setText("");
    setErr("");
    setShowHistory(false);

    if (attached && !next) {
      const label = t("ai.attached", { name: attached.name });
      setMsgs((cur) => [...cur, { role: "user", text: label }]);
      setBusy(true);
      const parsed = await parseSchedule(attached, "");
      setBusy(false);
      if (!parsed.ok) {
        setErr(aiErrorText(parsed.error));
        return;
      }
      if (parsed.data.length === 0) {
        setErr(t("ai.emptyLessons"));
        return;
      }
      setLessons(parsed.data);
      setMsgs((cur) => [...cur, { role: "model", text: t("ai.chatFileAck") }]);
      return;
    }

    const userText = attached
      ? `${next}\n${t("ai.attached", { name: attached.name })}`
      : next;
    const history: ChatMessage[] = [
      ...msgs.map(({ role, text: body }) => ({ role, text: body })),
      { role: "user", text: userText },
    ];
    setMsgs((cur) => [...cur, { role: "user", text: userText }]);
    setBusy(true);

    const snap = { ...snapshot, hasAttachedFile: Boolean(attached) };
    let result = await chat(history, snap);
    const undos: ChatUndo[] = [];
    let usedTools = false;
    let last: ChatReply | null = null;
    let pendingHref: string | null = null;

    for (let i = 0; i < 4; i++) {
      if (!result.ok) {
        setBusy(false);
        if (attached) clearFile();
        if (undos.length || last) {
          setMsgs((cur) => [
            ...cur,
            {
              role: "model",
              text: last?.reply.trim() || t("ai.done"),
              links: last?.links ?? [],
              undos,
            },
          ]);
        }
        setErr(aiErrorText(result.error));
        return;
      }
      last = {
        ...result.data,
        toolCalls: result.data.toolCalls ?? [],
        links: result.data.links ?? [],
        calendarAdds: result.data.calendarAdds ?? [],
      };
      if (!last.toolCalls.length) break;
      usedTools = true;
      const ran = runAiTools(last.toolCalls, {
        navigate: (href) => {
          pendingHref = href;
        },
        hasFile: Boolean(attached),
      });
      undos.push(...ran.undos);

      const traces: AiToolTrace[] = last.toolCalls.map((call, idx) => {
        const row = ran.results[idx] ?? {
          id: call.id,
          name: call.name,
          ok: false,
          data: { error: "missing" },
        };
        return { call, result: row };
      });

      for (const trace of traces) {
        if (trace.call.name !== "parseSchedulePhoto" || !attached || !trace.result.ok) continue;
        const parsed = await parseSchedule(attached, next);
        if (!parsed.ok) {
          trace.result.ok = false;
          trace.result.data = { error: parsed.error };
          continue;
        }
        setLessons(parsed.data);
        trace.result.data = {
          parsed: true,
          count: parsed.data.length,
          lessons: parsed.data.slice(0, 12),
        };
        if (parsed.data.length === 0) {
          setErr(t("ai.emptyLessons"));
        }
      }

      result = await chatContinue(history, { ...snap, hasAttachedFile: Boolean(attached) }, traces);
    }

    if (!usedTools && last) {
      const adds = last.calendarAdds.length ? last.calendarAdds : planFromAccount(next, snap);
      undos.push(...applyChatCalendarAdds(adds, today));
    }

    setBusy(false);
    if (attached) clearFile();
    if (!last) return;
    const links = [...last.links];
    if (pendingHref && undos.length && !links.some((l) => l.href === pendingHref)) {
      links.push({ label: t("ai.go"), href: pendingHref });
    }
    const reply = last.reply.trim() || (undos.length || links.length ? t("ai.done") : "");
    if (!reply && !undos.length && !links.length && !pendingHref) return;
    setMsgs((cur) => [
      ...cur,
      { role: "model", text: reply, links, undos },
    ]);
    if (pendingHref && undos.length === 0) router.push(pendingHref);
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
                {m.undos?.length ? (
                  <div className="mt-2 space-y-2">
                    {m.undos.map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-raised px-3 py-2 text-sm"
                      >
                        <p className="min-w-0 flex-1">{card.label}</p>
                        <button
                          type="button"
                          className="shrink-0 rounded-chip bg-pink/15 px-2.5 py-1 text-xs text-pink"
                          onClick={() => {
                            undoAiAction(card);
                            setMsgs((cur) =>
                              cur.map((row, idx) =>
                                idx === i
                                  ? { ...row, undos: row.undos?.filter((u) => u.id !== card.id) }
                                  : row,
                              ),
                            );
                          }}
                        >
                          {t("ai.undo")}
                        </button>
                      </div>
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
