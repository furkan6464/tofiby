import { GAME_CONFIG } from "./gameConfig";

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul";
  } catch {
    return "Europe/Istanbul";
  }
}

export function zonedParts(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

export function dateKeyInZone(now: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(now, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayKey(timeZone: string, now = new Date()): string {
  return dateKeyInZone(now, timeZone);
}

/** Two-click mini-calendar range: empty → single day → extend → reset. */
export function nextCalendarRange(
  rangeStart: string | null,
  rangeEnd: string | null,
  clicked: string,
): { rangeStart: string; rangeEnd: string } {
  if (!rangeStart || !rangeEnd) {
    return { rangeStart: clicked, rangeEnd: clicked };
  }
  if (rangeStart !== rangeEnd) {
    return { rangeStart: clicked, rangeEnd: clicked };
  }
  if (clicked === rangeStart) {
    return { rangeStart, rangeEnd };
  }
  if (clicked > rangeStart) {
    return { rangeStart, rangeEnd: clicked };
  }
  return { rangeStart: clicked, rangeEnd: rangeStart };
}

export function dateKeysBetween(from: string, to: string, cap = Number.POSITIVE_INFINITY): string[] {
  const a = from <= to ? from : to;
  const b = from <= to ? to : from;
  const n = diffDays(a, b) + 1;
  const count = Math.max(1, Math.min(n, cap));
  return Array.from({ length: count }, (_, i) => addDays(a, i));
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function diffDays(fromKey: string, toKey: string): number {
  const a = Date.parse(`${fromKey}T00:00:00Z`);
  const b = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function startOfMonth(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

export function monthGrid(dateKey: string): string[] {
  const start = startOfMonth(dateKey);
  const firstWeekday = weekdayOf(start);
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const days: string[] = [];
  for (let i = -offset; i < 42 - offset; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

export function monthLabel(dateKey: string, locale = "tr-TR"): string {
  const [y, m] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function prettyDate(dateKey: string, locale = "tr-TR"): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function canMutateTaskDate(
  taskDate: string,
  timeZone: string,
  now = new Date(),
): boolean {
  const today = todayKey(timeZone, now);
  if (taskDate > today) return true;
  if (taskDate === today) return true;
  const yesterday = addDays(today, -1);
  if (taskDate !== yesterday) return false;
  const { hour } = zonedParts(now, timeZone);
  return hour < GAME_CONFIG.MIDNIGHT_GRACE_HOURS;
}

export function hourInZone(timeZone: string, now = new Date()): number {
  return zonedParts(now, timeZone).hour;
}

export function weekKeys(dateKey: string): string[] {
  const wd = weekdayOf(dateKey);
  const mondayOffset = wd === 0 ? -6 : 1 - wd;
  const monday = addDays(dateKey, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function addMonths(dateKey: string, months: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function weekdayLabel(weekday: number): string {
  const fallback = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  return fallback[weekday] ?? "";
}

export function shortDate(dateKey: string, locale = "tr-TR"): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** 53 week columns × 7 Mon–Sun days, ending on the week of `endKey`. */
export function contributionWeeks(endKey: string, weeks = 53): string[][] {
  const endWeek = weekKeys(endKey);
  const startMonday = addDays(endWeek[0], -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => addDays(startMonday, w * 7 + i)),
  );
}

/** Weeks from the Monday of `startKey`'s week through the week of `endKey` (capped at 53). */
export function contributionWeeksSince(startKey: string, endKey: string): string[][] {
  const startMonday = weekKeys(startKey)[0];
  const endMonday = weekKeys(endKey)[0];
  const span = Math.max(0, Math.round((Date.parse(`${endMonday}T00:00:00Z`) - Date.parse(`${startMonday}T00:00:00Z`)) / (7 * 86_400_000)));
  const weeks = Math.min(53, span + 1);
  const firstMonday = addDays(endMonday, -(weeks - 1) * 7);
  // Prefer starting at signup week when the journey is shorter than a year.
  const alignedStart = firstMonday < startMonday ? startMonday : firstMonday;
  const alignedWeeks =
    Math.round((Date.parse(`${endMonday}T00:00:00Z`) - Date.parse(`${alignedStart}T00:00:00Z`)) / (7 * 86_400_000)) + 1;
  return Array.from({ length: Math.max(1, alignedWeeks) }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => addDays(alignedStart, w * 7 + i)),
  );
}
