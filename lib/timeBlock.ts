export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function timeFromMinutes(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function endTime(time: string, durationMinutes: number): string {
  return timeFromMinutes(minutesOf(time) + Math.max(15, durationMinutes));
}

export function snapMinutes(mins: number, step = 15): number {
  return Math.max(0, Math.min(23 * 60 + 45, Math.round(mins / step) * step));
}

export function weekdayShortTr(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][wd] ?? "";
}

export function dayNum(dateKey: string): string {
  return String(Number(dateKey.slice(8)));
}

export function tint(color: string, alpha = 0.28): string {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  return `${String(h).padStart(2, "0")}:00`;
}

export function durationBetween(start: string, end: string): number {
  let d = minutesOf(end) - minutesOf(start);
  if (d <= 0) d += 24 * 60;
  return Math.max(15, d);
}

export function timeOptions(step = 15): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += step) out.push(timeFromMinutes(m));
  return out;
}

export function gmtOffsetLabel(timeZone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(now);
    const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    return raw.replace("UTC", "GMT").replace("GMT", "GMT ").replace(/\s+/g, " ").trim();
  } catch {
    return "GMT +3";
  }
}

export function initials(name: string): string {
  const clean = name.trim();
  if (!clean) return "?";
  return clean.slice(0, 1).toUpperCase();
}
