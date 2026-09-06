import { insightBundle, isTaskDone, splitStudySessions } from "./plan";
import { dayMonth, minutesInZone, remainingWeekKeys, todayKey, zonedParts } from "./dates";
import { minutesOf } from "./timeBlock";
import { useApp } from "./store";
import type { AiToolCall, AiToolResult, ChatPending } from "./aiTypes";
import type { DayPart } from "./types";

export const INSIGHT_WINDOWS: Record<DayPart, { label: string; startMin: number }> = {
  morning: { label: "06:00–12:00", startMin: 9 * 60 },
  noon: { label: "12:00–17:00", startMin: 14 * 60 },
  evening: { label: "17:00–22:00", startMin: 19 * 60 },
  night: { label: "22:00–06:00", startMin: 21 * 60 },
};

const CLOCK =
  /\b([01]?\d|2[0-3])[.:][0-5]\d\b|\bsaat\s*([01]?\d|2[0-3])\b|\b([01]?\d|2[0-3])\s*(am|pm)\b/i;
const WHEN =
  /bugün|bugun|yarın|yarin|pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar|ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik|\d{4}-\d{2}-\d{2}|\b\d{1,2}[./]\d{1,2}\b/i;

export function userSpecifiedClock(text: string) {
  return CLOCK.test(text);
}

export function userSpecifiedWhen(text: string) {
  return WHEN.test(text);
}

export function userGaveFullTaskSpec(text: string) {
  return userSpecifiedClock(text) && userSpecifiedWhen(text);
}

export function clockFromText(text: string): string | null {
  const hm = text.match(/\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/);
  if (hm) return `${hm[1].padStart(2, "0")}:${hm[2]}`;
  const saat = text.match(/\bsaat\s*([01]?\d|2[0-3])\b/i);
  if (saat) return `${saat[1].padStart(2, "0")}:00`;
  return null;
}

export function insightReady() {
  const s = useApp.getState();
  const user = s.users.find((u) => u.id === s.sessionUserId);
  if (!user) return { enough: false, window: null as string | null, startMin: null as number | null };
  const today = todayKey(user.timezone);
  const scoredDays = s.scores.filter((x) => x.userId === user.id && x.dcs !== null).length;
  const doneTasks = s.tasks.filter((x) => x.userId === user.id && isTaskDone(x)).length;
  const enough = scoredDays >= 14 || doneTasks >= 10;
  if (!enough) return { enough: false, window: null, startMin: null };
  const bundle = insightBundle({
    userId: user.id,
    today,
    timezone: user.timezone,
    tasks: s.tasks,
    scores: s.scores,
    goals: s.goals,
  });
  const key = bundle.routine.dominant;
  if (!key) return { enough: true, window: null, startMin: null };
  return { enough: true, window: INSIGHT_WINDOWS[key].label, startMin: INSIGHT_WINDOWS[key].startMin };
}

export function planningNow() {
  const s = useApp.getState();
  const user = s.users.find((u) => u.id === s.sessionUserId);
  const tz = user?.timezone ?? "Europe/Istanbul";
  const today = todayKey(tz);
  const parts = zonedParts(new Date(), tz);
  return {
    today,
    nowMin: minutesInZone(tz),
    now: `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
    remainingWeek: remainingWeekKeys(today),
    timezone: tz,
  };
}

export function isPastSlot(date: string, time?: string | null) {
  const { today, nowMin } = planningNow();
  if (date < today) return true;
  if (date > today) return false;
  if (!time) return false;
  return minutesOf(time) < nowMin;
}

export function yesNo(text: string): "yes" | "no" | null {
  const s = text.trim().toLocaleLowerCase("tr");
  if (/^(evet|olur|tamam|ok|peki|ayarla|ekle|taşı|tasi)\b/.test(s)) return "yes";
  if (/^(hayır|hayir|yok|iptal|vazgeç|vazgec|olmasın|olmasin)\b/.test(s)) return "no";
  return null;
}

export function deferToolCalls(
  calls: AiToolCall[],
  userText: string,
): {
  pass: AiToolCall[];
  pending: ChatPending | null;
  deferred: AiToolResult[];
} {
  const pass: AiToolCall[] = [];
  const deferred: AiToolResult[] = [];
  let pending: ChatPending | null = null;
  const insight = insightReady();

  for (const call of calls) {
    if (call.name === "scheduleStudyHours") {
      const hours = Number(call.args.hoursPerWeek);
      const title = String(call.args.goalTitle || call.args.title || "Çalışma").trim();
      const goalId = String(call.args.goalId || "").trim() || null;
      if (!Number.isFinite(hours) || hours <= 0) {
        pass.push(call);
        continue;
      }
      if (userSpecifiedClock(userText)) {
        pass.push({
          ...call,
          args: { ...call.args, preferStartMin: minutesOf(clockFromText(userText) ?? "19:00") },
        });
        continue;
      }
      pending = {
        kind: "planSession",
        title,
        hours,
        goalId,
        week: "this",
        sessions: splitStudySessions(hours),
        index: 0,
        step: "day",
        placed: [],
      };
      deferred.push({
        id: call.id,
        name: call.name,
        ok: true,
        data: { deferred: true, reason: "sessions", count: pending.sessions.length },
      });
      continue;
    }

    if (call.name === "createTask") {
      const title = String(call.args.title ?? "").trim();
      const date = String(call.args.date ?? "").trim();
      const rawTime = String(call.args.time ?? "").trim();
      const time = userSpecifiedClock(userText) ? rawTime || clockFromText(userText) : "";
      const durationMinutes = Number(call.args.durationMinutes) || null;
      const goalId = String(call.args.goalId || "").trim() || null;
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
      if (userGaveFullTaskSpec(userText) && title && validDate) {
        pass.push({ ...call, args: { ...call.args, time: time || rawTime } });
        continue;
      }
      if (!title || !validDate) {
        deferred.push({
          id: call.id,
          name: call.name,
          ok: false,
          data: { error: "need_title_or_date" },
        });
        continue;
      }
      const draft = { title, date, time: time || null, durationMinutes, goalId };
      if (!draft.time) {
        pending = insight.window
          ? { kind: "consultTime", draft }
          : { kind: "pickSlots", title, draft, week: "this", mode: "task" };
      } else {
        pending = { kind: "confirmTask", draft };
      }
      deferred.push({
        id: call.id,
        name: call.name,
        ok: true,
        data: { deferred: true, reason: pending.kind },
      });
      continue;
    }

    pass.push(call);
  }
  return { pass, pending, deferred };
}

export function taskWhenLabel(date: string, time?: string | null) {
  const day = dayMonth(date);
  return time ? `${day} saat ${time}'e` : `${day}'e`;
}

export function consultChoice(text: string): "auto" | "pick" | null {
  if (/ben seç|kendim|seçeceğim|sececegim|saatleri ben/i.test(text)) return "pick";
  if (/sen ayarla|bu saat|sana bırak|sana birak|uygun olan/i.test(text)) return "auto";
  return null;
}
