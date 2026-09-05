"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { t } from "@/lib/i18n";
import { celebrate } from "@/lib/confetti";
import { useApp } from "@/lib/store";
import type { FocusRun, Task } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const PRESETS = [15, 25, 45, 60, 90];
const R = 128;
const RING = 2 * Math.PI * R;
const FOCUS_EVENT = "tofiby:focus";
const FREE_KEY = "free";

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function knownMins(task?: Task | null) {
  const n = task?.estimatedDurationMinutes;
  return n && n >= 5 ? n : null;
}

export function focusKey(task?: Task | null) {
  return task?.id ?? FREE_KEY;
}

export function isFocusResume(run?: FocusRun) {
  return Boolean(run && run.leftMs > 1000);
}

export function openFocus(task?: Task | null) {
  window.dispatchEvent(new CustomEvent(FOCUS_EVENT, { detail: { taskId: task?.id ?? FREE_KEY } }));
}

export function FocusHost() {
  const [openId, setOpenId] = useState<string | null>(null);
  const task = useApp((s) => (openId && openId !== FREE_KEY ? s.tasks.find((x) => x.id === openId) : null));

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ taskId?: string | null }>).detail;
      setOpenId(detail?.taskId ?? FREE_KEY);
    };
    window.addEventListener(FOCUS_EVENT, onOpen);
    return () => window.removeEventListener(FOCUS_EVENT, onOpen);
  }, []);

  if (!openId) return null;
  if (openId !== FREE_KEY && !task) return null;
  return (
    <FocusSession
      key={openId}
      task={openId === FREE_KEY ? null : task}
      onClose={() => setOpenId(null)}
    />
  );
}

export function FocusSession({
  task,
  onClose,
}: {
  task?: Task | null;
  onClose: () => void;
}) {
  const update = useApp((s) => s.updateTask);
  const toggle = useApp((s) => s.toggleTask);
  const pushToast = useApp((s) => s.pushToast);
  const saveRun = useApp((s) => s.saveFocusRun);
  const clearRun = useApp((s) => s.clearFocusRun);
  const key = focusKey(task);
  const saved = useApp.getState().focusRuns?.[key];
  const resume = isFocusResume(saved);
  const suggested = knownMins(task) ?? 25;
  const startMs = resume ? saved!.leftMs : suggested * 60_000;
  const startTotal = resume ? saved!.totalMs : suggested * 60_000;
  const startPlanned = resume ? saved!.plannedMs : suggested * 60_000;
  const [phase, setPhase] = useState<"setup" | "clock" | "done">(
    resume || knownMins(task) ? "clock" : "setup",
  );
  const [mins, setMins] = useState(String(Math.round(startPlanned / 60_000)));
  const [totalMs, setTotalMs] = useState(startTotal);
  const [leftMs, setLeftMs] = useState(startMs);
  const [plannedMs, setPlannedMs] = useState(startPlanned);
  const [running, setRunning] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [mounted, setMounted] = useState(false);
  const endAt = useRef<number | null>(null);
  const hideChrome = useRef<number | undefined>(undefined);
  const leftRef = useRef(startMs);
  const totalRef = useRef(startTotal);
  const plannedRef = useRef(startPlanned);
  const touched = useRef(resume);
  const skipSave = useRef(false);
  leftRef.current = leftMs;
  totalRef.current = totalMs;
  plannedRef.current = plannedMs;
  const title = task?.title ?? t("focus.timer");

  function persist(next?: Partial<FocusRun>) {
    if (skipSave.current || !touched.current) return;
    const left = next?.leftMs ?? leftRef.current;
    if (left <= 1000) {
      clearRun(key);
      return;
    }
    saveRun(key, {
      leftMs: left,
      totalMs: next?.totalMs ?? totalRef.current,
      plannedMs: next?.plannedMs ?? plannedRef.current,
    });
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onHide = () => persist();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      persist();
      document.body.style.overflow = prev;
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  useEffect(() => {
    if (phase !== "clock" || !running) return;
    if (endAt.current == null) endAt.current = Date.now() + leftRef.current;
    const tick = () => {
      const next = (endAt.current ?? Date.now()) - Date.now();
      if (next <= 0) {
        setLeftMs(0);
        setRunning(false);
        setPhase("done");
        skipSave.current = true;
        clearRun(key);
        celebrate("streak");
        return;
      }
      setLeftMs(next);
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [phase, running, key, clearRun]);

  useEffect(() => {
    if (phase !== "clock" || !running || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request("screen").then((s) => {
      lock = s;
    }).catch(() => {});
    return () => {
      void lock?.release();
    };
  }, [phase, running]);

  useEffect(() => {
    const prev = document.title;
    if (phase === "clock") document.title = `${clock(leftMs)} · ${title}`;
    if (phase === "done") document.title = t("focus.finished");
    return () => {
      document.title = prev;
    };
  }, [phase, leftMs, title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leave(false);
      if (e.code === "Space" && phase === "clock") {
        e.preventDefault();
        toggleRun();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const ratio = totalMs > 0 ? leftMs / totalMs : 0;
  const chosen = Math.min(180, Math.max(5, Number(mins) || suggested));
  const waiting = phase === "clock" && !running;

  function arm(minutes = chosen) {
    if (task) update(task.id, { estimatedDurationMinutes: minutes });
    const ms = minutes * 60_000;
    setTotalMs(ms);
    setLeftMs(ms);
    setPlannedMs(ms);
    setRunning(false);
    endAt.current = null;
    setPhase("clock");
    setChrome(true);
    persist({ leftMs: ms, totalMs: ms, plannedMs: ms });
  }

  function toggleRun() {
    setRunning((was) => {
      if (was) {
        endAt.current = null;
        persist();
        return false;
      }
      touched.current = true;
      endAt.current = Date.now() + leftRef.current;
      return true;
    });
  }

  function addMinutes(n: number) {
    touched.current = true;
    const extra = n * 60_000;
    const nextLeft = leftRef.current + extra;
    const nextTotal = totalRef.current + extra;
    setLeftMs(nextLeft);
    setTotalMs(nextTotal);
    if (running) endAt.current = Date.now() + nextLeft;
    persist({ leftMs: nextLeft, totalMs: nextTotal });
  }

  function reset() {
    setRunning(false);
    endAt.current = null;
    setLeftMs(plannedRef.current);
    setTotalMs(plannedRef.current);
    setPhase("clock");
    setChrome(true);
    persist({ leftMs: plannedRef.current, totalMs: plannedRef.current });
  }

  function leave(mark: boolean) {
    if (mark && task && !task.completed) {
      const res = toggle(task.id);
      if (res.streakJustHit) pushToast(t("home.streakToast"));
      skipSave.current = true;
      clearRun(key);
    } else if (phase === "done" || leftRef.current <= 1000) {
      skipSave.current = true;
      clearRun(key);
    } else {
      persist();
    }
    onClose();
  }

  function peek() {
    setChrome(true);
    window.clearTimeout(hideChrome.current);
    if (running) hideChrome.current = window.setTimeout(() => setChrome(false), 2200);
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="focus-veil fixed inset-0 z-[120] flex flex-col items-center justify-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseMove={phase === "clock" ? peek : undefined}
        onPointerDown={phase === "clock" ? peek : undefined}
      >
        {phase === "setup" ? (
          <div className="w-full max-w-sm text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-faint">{t("focus.kicker")}</p>
            <h2 className="mt-3 font-display text-4xl">{title}</h2>
            {task?.time ? <p className="mt-2 text-sm text-muted">{task.time}</p> : null}
            <p className="mt-8 text-xs text-faint">{t("focus.setMins")}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMins(String(n))}
                  className={`rounded-full px-3.5 py-1.5 text-sm ${
                    Number(mins) === n ? "bg-pink text-base" : "bg-raised text-muted"
                  }`}
                >
                  {n} dk
                </button>
              ))}
            </div>
            <input
              className="mx-auto mt-4 w-28 px-3 py-2 text-center"
              type="number"
              min={5}
              max={180}
              value={mins}
              onChange={(e) => setMins(e.target.value)}
            />
            <div className="mt-8 flex justify-center gap-3">
              <Button tone="ghost" type="button" onClick={() => leave(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={() => arm()}>
                {t("common.continue")}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "clock" || phase === "done" ? (
          <div className="flex flex-col items-center">
            <button
              type="button"
              className="focus-ring relative grid h-[22rem] w-[22rem] place-items-center bg-transparent"
              onClick={phase === "clock" ? toggleRun : undefined}
              aria-label={running ? t("focus.pause") : t("focus.resume")}
            >
              <svg className="absolute inset-0" viewBox="0 0 320 320" aria-hidden>
                {Array.from({ length: 60 }, (_, i) => {
                  const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
                  const outer = 154;
                  const inner = i % 5 === 0 ? 142 : 148;
                  return (
                    <line
                      key={i}
                      x1={160 + Math.cos(a) * inner}
                      y1={160 + Math.sin(a) * inner}
                      x2={160 + Math.cos(a) * outer}
                      y2={160 + Math.sin(a) * outer}
                      className={i % 5 === 0 ? "focus-tick-strong" : "focus-tick"}
                    />
                  );
                })}
                <circle cx="160" cy="160" r={R} className="focus-track" />
                <circle
                  cx="160"
                  cy="160"
                  r={R}
                  className={`focus-progress ${waiting ? "focus-progress-paused" : ""}`}
                  strokeDasharray={RING}
                  strokeDashoffset={RING * (1 - ratio)}
                  transform="rotate(-90 160 160)"
                />
              </svg>
              <p
                className={`font-display text-[4.6rem] leading-none tracking-wide tabular-nums ${
                  waiting ? "opacity-55" : ""
                }`}
              >
                {phase === "done" ? "00:00" : clock(leftMs)}
              </p>
            </button>

            {phase === "done" ? (
              <div className="mt-10 flex flex-col items-center gap-3">
                <p className="text-sm text-muted">{t("focus.finished")}</p>
                {task ? (
                  <Button type="button" onClick={() => leave(true)}>
                    {t("focus.markDone")}
                  </Button>
                ) : null}
                <button type="button" className="text-xs text-faint" onClick={() => leave(false)}>
                  {t("focus.leave")}
                </button>
              </div>
            ) : (
              <div
                className={`mt-10 flex max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-3 transition-opacity duration-500 ${
                  waiting || chrome ? "opacity-80" : "pointer-events-none opacity-0"
                }`}
              >
                <button type="button" className="text-sm text-pink" onClick={toggleRun}>
                  {running ? t("focus.pause") : t("focus.resume")}
                </button>
                <button type="button" className="text-sm text-muted" onClick={() => addMinutes(5)}>
                  {t("focus.plus5")}
                </button>
                <button type="button" className="text-sm text-muted" onClick={() => addMinutes(15)}>
                  {t("focus.plus15")}
                </button>
                <button type="button" className="text-sm text-muted" onClick={reset}>
                  {t("focus.reset")}
                </button>
                {task ? (
                  <button type="button" className="text-sm text-muted" onClick={() => leave(true)}>
                    {t("focus.markDone")}
                  </button>
                ) : null}
                <button type="button" className="text-sm text-faint" onClick={() => leave(false)}>
                  {t("focus.leave")}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
