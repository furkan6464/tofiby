import { collectBusy, findFreeSlots, goalCardProgress } from "./plan";
import { addDays, remainingWeekKeys, todayKey, weekdayOf, zonedParts } from "./dates";
import { minutesOf, timeFromMinutes } from "./timeBlock";
import type { ChatBusyItem, ChatCalendarAdd, ChatDay, CreatureSnapshot } from "./aiTypes";
import type { BusySlot, DailyScore, DayPart, Goal, Milestone, Task } from "./types";
import { calendarAddMinutes, guessCalendarAdds, titleFromChat } from "./aiCalendar";

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

const WINDOW_HOURS: Record<DayPart, number> = {
  morning: 9,
  noon: 14,
  evening: 19,
  night: 21,
};

export function chatWeek(
  userId: string,
  timezone: string,
  tasks: Task[],
  busy: BusySlot[],
  days = 7,
): ChatDay[] {
  const today = todayKey(timezone);
  const out: ChatDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const blocks = collectBusy(tasks, busy, userId, date);
    const free = findFreeSlots(blocks);
    out.push({
      date,
      wd: weekdayOf(date),
      busy: blocks.slice(0, 10).map((b) => ({
        title: b.title?.trim() || "dolu",
        start: timeFromMinutes(b.startMin),
        end: timeFromMinutes(b.endMin),
      })),
      free: free.slice(0, 5).map((s) => ({
        start: timeFromMinutes(s.startMin),
        end: timeFromMinutes(s.endMin),
      })),
    });
  }
  return out;
}

export function buildChatSnapshot(input: {
  name: string;
  stage: string;
  streak: number;
  longest: number;
  totalGp: number;
  health: string;
  todayDcs: number | null;
  todayDone: number;
  todayPlanned: number;
  timezone: string;
  userId: string;
  preferredWindow: DayPart | null;
  restDay: number | null;
  tasks: Task[];
  busy: BusySlot[];
  goals: Goal[];
  milestones?: Milestone[];
  scores?: DailyScore[];
  memory?: string[];
  hasAttachedFile?: boolean;
}): CreatureSnapshot {
  const today = todayKey(input.timezone);
  const week = chatWeek(input.userId, input.timezone, input.tasks, input.busy);
  const dcs7 = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    const score = (input.scores ?? []).find((s) => s.userId === input.userId && s.date === date);
    return { date, dcs: score?.dcs ?? null };
  });
  return {
    name: input.name,
    stage: input.stage,
    streak: input.streak,
    longest: input.longest,
    totalGp: input.totalGp,
    health: input.health,
    todayDcs: input.todayDcs,
    todayDone: input.todayDone,
    todayPlanned: input.todayPlanned,
    today,
    weekday: weekdayOf(today),
    preferredWindow: input.preferredWindow,
    restDay: input.restDay,
    calendarEmpty: week.every((d) => d.busy.length === 0),
    week,
    goals: input.goals
      .filter((g) => g.userId === input.userId && g.status === "active")
      .map((g) => {
        const card = goalCardProgress({
          goal: g,
          milestones: input.milestones ?? [],
          tasks: input.tasks,
          today,
        });
        return {
          id: g.id,
          title: g.title,
          weeklyFrequency: g.weeklyFrequency,
          dailyMins: g.dailyDurationMinutes,
          pct: card.pct,
          next: card.nextTitle,
        };
      }),
    dcs7,
    memory: (input.memory ?? []).slice(0, 24),
    hasAttachedFile: Boolean(input.hasAttachedFile),
    now: `${String(zonedParts(new Date(), input.timezone).hour).padStart(2, "0")}:${String(zonedParts(new Date(), input.timezone).minute).padStart(2, "0")}`,
    remainingWeek: remainingWeekKeys(today),
  };
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return minutesOf(aStart) < minutesOf(bEnd) && minutesOf(bStart) < minutesOf(aEnd);
}

export function calendarConflicts(
  adds: ChatCalendarAdd[],
  week: ChatDay[],
): { addIndex: number; when: string; title: string }[] {
  const hits: { addIndex: number; when: string; title: string }[] = [];
  adds.forEach((row, addIndex) => {
    const mins = calendarAddMinutes(row);
    const end = row.end && row.end !== row.start ? row.end : timeFromMinutes(minutesOf(row.start) + mins);
    for (const day of week) {
      const match = row.recurring
        ? day.wd === row.weekday
        : day.date === (row.date || week[0]?.date);
      if (!match) continue;
      for (const item of day.busy) {
        if (overlaps(row.start, end, item.start, item.end)) {
          hits.push({
            addIndex,
            when: `${DAY_NAMES[day.wd] ?? ""} ${item.start}`,
            title: item.title,
          });
        }
      }
    }
  });
  return hits;
}

export function slotFits(free: { start: string; end: string }[], start: string, minutes: number) {
  const end = minutesOf(start) + minutes;
  return free.some((f) => minutesOf(f.start) <= minutesOf(start) && minutesOf(f.end) >= end);
}

/** Shared hour that is free on as many days as possible, biased to preferred window. */
export function bestSharedStart(week: ChatDay[], minutes: number, preferred: DayPart | null): string {
  const prefer = preferred ? WINDOW_HOURS[preferred] * 60 : 19 * 60;
  let best = "19:00";
  let bestScore = -1;
  for (let h = 8; h <= 21; h++) {
    const start = timeFromMinutes(h * 60);
    let freeDays = 0;
    for (const day of week) {
      if (slotFits(day.free, start, minutes)) freeDays += 1;
    }
    const closeness = 1 - Math.min(180, Math.abs(h * 60 - prefer)) / 180;
    const score = freeDays * 10 + closeness;
    if (score > bestScore) {
      bestScore = score;
      best = start;
    }
  }
  return best;
}

export function conflictLabel(item: ChatBusyItem, wd: number) {
  return `${DAY_NAMES[wd] ?? ""} ${item.start}–${item.end} ${item.title}`.trim();
}

function wantsSchedule(text: string) {
  return /ekle|koy|yaz|planla|takvim|ayarlar|uygun saat|her gün|her gun/i.test(text);
}

function isDaily(text: string) {
  return /her (gun|gün)|aralığ|aralik|aralık/i.test(text);
}

export function expandDailyAdds(
  seed: ChatCalendarAdd,
  restDay: number | null,
): ChatCalendarAdd[] {
  return [0, 1, 2, 3, 4, 5, 6]
    .filter((wd) => wd !== restDay)
    .map((weekday) => ({
      ...seed,
      date: null,
      weekday,
      recurring: true,
    }));
}

/** Fill a confirmable plan from the account calendar when the model talks instead of proposing. */
export function planFromAccount(text: string, snapshot: CreatureSnapshot): ChatCalendarAdd[] {
  if (!wantsSchedule(text)) return [];
  const guessed = guessCalendarAdds(text, snapshot.today);
  const daily = isDaily(text);
  const minutes = guessed[0] ? calendarAddMinutes(guessed[0]) : 60;
  const start = guessed[0]?.start ?? bestSharedStart(snapshot.week, minutes, snapshot.preferredWindow as DayPart | null);
  const end = guessed[0]?.end && guessed[0].end !== guessed[0].start
    ? guessed[0].end
    : timeFromMinutes(minutesOf(start) + minutes);
  const seed: ChatCalendarAdd = {
    title: (guessed[0]?.title && guessed[0].title !== "Çalışma" ? guessed[0].title : titleFromChat(text)) || "Çalışma",
    date: daily ? null : (guessed[0]?.date ?? snapshot.today),
    weekday: daily ? null : (guessed[0]?.weekday ?? null),
    recurring: daily || Boolean(guessed[0]?.recurring),
    start,
    end,
  };
  if (daily) return expandDailyAdds({ ...seed, recurring: true }, snapshot.restDay);
  return [seed];
}
