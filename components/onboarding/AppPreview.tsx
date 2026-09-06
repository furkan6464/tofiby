"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { t, tList } from "@/lib/i18n";
import { playSfx } from "@/lib/onboardSfx";

export type PreviewKind = "today" | "calendar" | "goals" | "analiz" | "ai";

export function AppPreview({ kind }: { kind: PreviewKind }) {
  return (
    <div className="onboard-phone">
      <div className="onboard-phone-bar">
        <span />
      </div>
      {kind === "today" ? <TodayDemo /> : null}
      {kind === "calendar" ? <CalendarDemo /> : null}
      {kind === "goals" ? <GoalsDemo /> : null}
      {kind === "analiz" ? <AnalizDemo /> : null}
      {kind === "ai" ? <AiDemo /> : null}
    </div>
  );
}

function TodayDemo() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDone(true);
      playSfx("click");
    }, 700);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="px-3 pb-3 pt-2 text-left">
      <p className="text-[10px] text-faint">{t("onboarding.previewTodayKicker")}</p>
      <h3 className="mt-1 font-display text-lg">{t("home.todayTitle")}</h3>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised">
        <motion.div
          className="h-full bg-pink"
          initial={{ width: "33%" }}
          animate={{ width: done ? "66%" : "33%" }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <ul className="mt-3 space-y-2">
        <Row time="14:00" title="Matematik" checked />
        <li className="relative flex items-center gap-2 rounded-2xl bg-raised px-2.5 py-2">
          <motion.span
            className="onboard-tap"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 1.3] }}
            transition={{ duration: 0.7, delay: 0.45 }}
          />
          <span
            className={`grid h-4 w-4 place-items-center rounded-[5px] border text-[10px] ${
              done ? "border-pink bg-pink text-base" : "border-white/20"
            }`}
          >
            {done ? "✓" : ""}
          </span>
          <span className="text-[11px] text-faint">19:00</span>
          <span className={`text-sm ${done ? "text-faint line-through" : ""}`}>İngilizce</span>
        </li>
        <Row time="21:00" title="Fizik" />
      </ul>
    </div>
  );
}

function Row({ time, title, checked }: { time: string; title: string; checked?: boolean }) {
  return (
    <li className="flex items-center gap-2 rounded-2xl bg-raised px-2.5 py-2">
      <span
        className={`grid h-4 w-4 place-items-center rounded-[5px] border text-[10px] ${
          checked ? "border-pink bg-pink text-base" : "border-white/20"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="text-[11px] text-faint">{time}</span>
      <span className={`text-sm ${checked ? "text-faint line-through" : ""}`}>{title}</span>
    </li>
  );
}

function CalendarDemo() {
  const days = tList("onboarding.weekdays").slice(0, 3);
  const nums = ["8", "9", "10"];
  const hours = ["13:00", "14:00", "15:00"];
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setShow(true);
      playSfx("pop");
    }, 550);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="px-2.5 pb-3 pt-1">
      <p className="px-1 text-left font-display text-lg">{t("nav.calendar")}</p>
      <div className="mt-2 grid grid-cols-[2.1rem_repeat(3,minmax(0,1fr))]">
        <span />
        {days.map((d, i) => (
          <div key={d} className="pb-1.5 text-center">
            <p className="text-[10px] uppercase text-muted">{d}</p>
            <span
              className={`mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs ${
                i === 2 ? "bg-white text-black" : "text-ink"
              }`}
            >
              {nums[i]}
            </span>
          </div>
        ))}
        {hours.map((h) => (
          <HourRow key={h} hour={h} show={show} />
        ))}
      </div>
    </div>
  );
}

function CalBlock({ title, tone }: { title: string; tone: "violet" | "pink" }) {
  return (
    <div
      className={`absolute inset-1 flex items-center rounded-xl px-1.5 text-left text-[10px] font-medium leading-tight text-base ${
        tone === "pink" ? "bg-pink shadow-[0_6px_14px_rgba(0,0,0,0.28)]" : "bg-violet"
      }`}
    >
      <span className="block w-full hyphens-auto break-words">{title}</span>
    </div>
  );
}

function HourRow({ hour, show }: { hour: string; show: boolean }) {
  return (
    <>
      <p className="self-start pt-1 pr-1 text-right text-[9px] text-faint">{hour}</p>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={`${hour}-${i}`} className="relative h-14 border-l border-t border-white/5">
          {hour === "13:00" && i === 0 ? <CalBlock title="Tarih" tone="violet" /> : null}
          {hour === "14:00" && i === 2 ? (
            <>
              <motion.span
                className="onboard-tap"
                style={{ left: "36%", top: "30%" }}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 1.35] }}
                transition={{ duration: 0.65, delay: 0.2 }}
              />
              {show ? (
                <motion.div
                  className="absolute inset-0"
                  initial={{ y: 10, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 20 }}
                >
                  <CalBlock title="İngilizce" tone="pink" />
                </motion.div>
              ) : null}
            </>
          ) : null}
        </div>
      ))}
    </>
  );
}

function GoalsDemo() {
  return (
    <div className="px-3 pb-3 pt-2 text-left">
      <p className="font-display text-lg">{t("nav.goals")}</p>
      <div className="mt-3 rounded-panel bg-raised p-3">
        <p className="text-sm">İngilizce</p>
        <p className="mt-1 text-[11px] text-faint">5 / 7 gün</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-base">
          <motion.div
            className="h-full bg-pink"
            initial={{ width: "18%" }}
            animate={{ width: "62%" }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => playSfx("soft")}
          />
        </div>
      </div>
      <div className="mt-2 rounded-panel bg-raised p-3 opacity-70">
        <p className="text-sm">Matematik</p>
        <div className="mt-2 h-2 rounded-full bg-base">
          <div className="h-full w-[40%] rounded-full bg-violet" />
        </div>
      </div>
    </div>
  );
}

function AnalizDemo() {
  const cells = [0, 1, 0, 2, 3, 1, 0, 2, 4, 3, 1, 0, 2, 3, 4, 2, 1, 3, 4, 2, 0, 1, 2, 3, 4, 3, 2, 1];
  const colors = ["#1c1922", "#d6a8ba", "#c47698", "#a83a6c", "#6c123a"];
  return (
    <div className="px-3 pb-3 pt-2 text-left">
      <p className="font-display text-lg">{t("nav.analytics")}</p>
      <p className="mt-1 text-[11px] text-faint">{t("onboarding.previewHeat")}</p>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {cells.map((n, i) => (
          <motion.span
            key={i}
            className="h-3.5 rounded-[3px]"
            style={{ background: colors[n] }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.04 * i, duration: 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

function AiDemo() {
  const full = t("onboarding.previewAiType");
  const [typed, setTyped] = useState("");
  const [reply, setReply] = useState(false);
  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(full.slice(0, i));
      if (i % 2 === 0) playSfx("type");
      if (i >= full.length) {
        window.clearInterval(id);
        window.setTimeout(() => {
          setReply(true);
          playSfx("chime");
        }, 280);
      }
    }, 55);
    return () => window.clearInterval(id);
  }, [full]);
  return (
    <div className="flex h-[15.5rem] flex-col px-3 pb-3 pt-2 text-left">
      <p className="text-[10px] uppercase tracking-[0.16em] text-faint">{t("ai.chat")}</p>
      <div className="mt-3 flex-1 space-y-2">
        {typed ? (
          <div className="ml-auto max-w-[90%] rounded-2xl bg-violet px-3 py-2 text-xs text-base">{typed}</div>
        ) : null}
        {reply ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[92%] rounded-2xl bg-raised px-3 py-2 text-xs"
          >
            {t("onboarding.previewAiReply")}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
