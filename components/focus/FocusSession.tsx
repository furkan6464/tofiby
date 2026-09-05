"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { t } from "@/lib/i18n";
import { celebrate } from "@/lib/confetti";
import { useApp } from "@/lib/store";
import type { Task } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const PRESETS = [15, 25, 45, 60, 90];
const R = 128;
const RING = 2 * Math.PI * R;

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function hasDuration(task: Task) {
  return Boolean(task.estimatedDurationMinutes && task.estimatedDurationMinutes >= 5);
}

export function FocusSession({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const update = useApp((s) => s.updateTask);
  const toggle = useApp((s) => s.toggleTask);
  const pushToast = useApp((s) => s.pushToast);
  const suggested = hasDuration(task) ? task.estimatedDurationMinutes! : 25;
  const [phase, setPhase] = useState<"setup" | "run" | "done">(hasDuration(task) ? "run" : "setup");
  const [mins, setMins] = useState(String(suggested));
  const [totalMs, setTotalMs] = useState(suggested * 60_000);
  const [leftMs, setLeftMs] = useState(suggested * 60_000);
  const [paused, setPaused] = useState(false);
  const [chrome, setChrome] = useState(false);
  const [mounted, setMounted] = useState(false);
  const endAt = useRef<number | null>(hasDuration(task) ? Date.now() + suggested * 60_000 : null);
  const hideChrome = useRef<number | undefined>(undefined);
  const leftRef = useRef(suggested * 60_000);
  leftRef.current = leftMs;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (phase !== "run" || paused) return;
    if (endAt.current == null) endAt.current = Date.now() + leftRef.current;
    const tick = () => {
      const next = (endAt.current ?? Date.now()) - Date.now();
      if (next <= 0) {
        setLeftMs(0);
        setPhase("done");
        celebrate("streak");
        return;
      }
      setLeftMs(next);
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [phase, paused]);

  useEffect(() => {
    if (phase !== "run" || paused || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request("screen").then((s) => {
      lock = s;
    }).catch(() => {});
    return () => {
      void lock?.release();
    };
  }, [phase, paused]);

  useEffect(() => {
    const prev = document.title;
    if (phase === "run") document.title = `${clock(leftMs)} · ${task.title}`;
    if (phase === "done") document.title = t("focus.finished");
    return () => {
      document.title = prev;
    };
  }, [phase, leftMs, task.title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.code === "Space" && phase === "run") {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  const ratio = totalMs > 0 ? leftMs / totalMs : 0;
  const chosen = Math.min(180, Math.max(5, Number(mins) || suggested));

  function start(minutes = chosen) {
    update(task.id, { estimatedDurationMinutes: minutes });
    const ms = minutes * 60_000;
    setTotalMs(ms);
    setLeftMs(ms);
    setPaused(false);
    endAt.current = Date.now() + ms;
    setPhase("run");
  }

  function togglePause() {
    setPaused((was) => {
      if (was) endAt.current = Date.now() + leftRef.current;
      else endAt.current = null;
      return !was;
    });
  }

  function addFive() {
    setLeftMs((ms) => {
      const next = ms + 5 * 60_000;
      if (!paused) endAt.current = Date.now() + next;
      return next;
    });
    setTotalMs((ms) => ms + 5 * 60_000);
  }

  function finish(mark: boolean) {
    if (mark && !task.completed) {
      const res = toggle(task.id);
      if (res.streakJustHit) pushToast(t("home.streakToast"));
    }
    onClose();
  }

  function peek() {
    setChrome(true);
    window.clearTimeout(hideChrome.current);
    hideChrome.current = window.setTimeout(() => setChrome(false), 2200);
  }

  useEffect(() => {
    if (phase === "run") peek();
  }, [phase]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="focus-veil fixed inset-0 z-[120] flex flex-col items-center justify-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseMove={phase === "run" ? peek : undefined}
        onPointerDown={phase === "run" ? peek : undefined}
      >
        {phase === "setup" ? (
          <div className="w-full max-w-sm text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-faint">{t("focus.kicker")}</p>
            <h2 className="mt-3 font-display text-4xl">{task.title}</h2>
            {task.time ? <p className="mt-2 text-sm text-muted">{task.time}</p> : null}
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
              <Button tone="ghost" type="button" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={() => start()}>
                {t("focus.startTimer")}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "run" || phase === "done" ? (
          <div className="flex flex-col items-center">
            <button
              type="button"
              className="focus-ring relative grid h-[22rem] w-[22rem] place-items-center bg-transparent"
              onClick={phase === "run" ? togglePause : undefined}
              aria-label={paused ? t("focus.resume") : t("focus.pause")}
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
                  className={`focus-progress ${paused ? "focus-progress-paused" : ""}`}
                  strokeDasharray={RING}
                  strokeDashoffset={RING * (1 - ratio)}
                  transform="rotate(-90 160 160)"
                />
              </svg>
              <p
                className={`font-display text-[4.6rem] leading-none tracking-wide tabular-nums ${
                  paused ? "opacity-55" : ""
                }`}
              >
                {phase === "done" ? "00:00" : clock(leftMs)}
              </p>
            </button>

            {phase === "done" ? (
              <div className="mt-10 flex flex-col items-center gap-3">
                <p className="text-sm text-muted">{t("focus.finished")}</p>
                <Button type="button" onClick={() => finish(true)}>
                  {t("focus.markDone")}
                </Button>
                <button type="button" className="text-xs text-faint" onClick={() => finish(false)}>
                  {t("focus.leave")}
                </button>
              </div>
            ) : (
              <div
                className={`mt-10 flex items-center gap-7 transition-opacity duration-500 ${
                  chrome ? "opacity-70" : "pointer-events-none opacity-0"
                }`}
              >
                <button type="button" className="text-sm text-muted" onClick={togglePause}>
                  {paused ? t("focus.resume") : t("focus.pause")}
                </button>
                <button type="button" className="text-sm text-muted" onClick={addFive}>
                  {t("focus.plus5")}
                </button>
                <button type="button" className="text-sm text-pink" onClick={() => finish(true)}>
                  {t("focus.markDone")}
                </button>
                <button type="button" className="text-sm text-faint" onClick={() => finish(false)}>
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
