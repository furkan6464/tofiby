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
