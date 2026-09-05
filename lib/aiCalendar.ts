import { addDays, weekdayOf } from "./dates";
import { durationBetween } from "./timeBlock";
import type { ChatCalendarAdd } from "./aiTypes";

const ADD_HINT = /ekle|koy|yaz|planla|hatirlat|hatırlat|takvim|ayarlar|uygun saat/i;
const TIME_PAIR = /(\d{1,2})[.:](\d{2})/g;

function padTime(h: number, m: number): string | null {
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timesIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(TIME_PAIR)) {
    const t = padTime(Number(m[1]), Number(m[2]));
    if (t) out.push(t);
  }
  return out;
}

export function titleFromChat(text: string): string {
  const cleaned = text
    .replace(TIME_PAIR, " ")
    .replace(
      /\b(takvime|takvim|lutfen|lütfen|benim|icin|için|ekle|koy|yaz|planla|ayarlar|ayarlar mısın|misin|mısın|her gün|her gun|aralığa kadar|araliga kadar|en uygun saat|hangisi ise|ona göre)\b/gi,
      " ",
    )
    .replace(/çalışacağım/gi, "çalışma")
    .replace(/çalışmam[ıi]/gi, "çalışma")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,!?]+$/, "");
  if (!cleaned) return "Çalışma";
  return cleaned.charAt(0).toLocaleUpperCase("tr") + cleaned.slice(1);
}

function weekdayIn(text: string): number | null {
  const fold = text
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const days: [RegExp, number][] = [
    [/\bpazar\b/, 0],
    [/\bpazartesi|\bpzt\b/, 1],
    [/\bsali\b/, 2],
    [/\bcarsamba|\bcar\b/, 3],
    [/\bpersembe|\bper\b/, 4],
    [/\bcuma\b/, 5],
    [/\bcumartesi|\bcmt\b/, 6],
  ];
  for (const [re, n] of days) {
    if (re.test(fold)) return n;
  }
  return null;
}

/** If the user asked to put something on the calendar, recover a draft even when the model only talks. */
export function guessCalendarAdds(text: string, today: string): ChatCalendarAdd[] {
  if (!ADD_HINT.test(text)) return [];
  const times = timesIn(text);
  if (times.length === 0) return [];
  const start = times[0];
  const end = times[1] ?? null;
  const weekday = weekdayIn(text);
  const tomorrow = /\byarin\b|\byarın\b/i.test(text);
  const recurring = /her (gun|gün|hafta)|her gun|tekrar/i.test(text) || weekday !== null;
  const date = recurring ? null : tomorrow ? addDays(today, 1) : today;
  return [
    {
      title: titleFromChat(text),
      date,
      weekday: recurring ? (weekday ?? weekdayOf(today)) : null,
      recurring,
      start,
      end: end ?? start,
    },
  ];
}

export function calendarAddMinutes(row: ChatCalendarAdd): number {
  if (row.end && row.end !== row.start) return durationBetween(row.start, row.end);
  return 60;
}
