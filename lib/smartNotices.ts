import { collectBusy, remainingToStreak } from "./plan";
import { zonedParts } from "./dates";
import { minutesOf } from "./timeBlock";
import type { BusySlot, Goal, NoticeKind, Task } from "./types";

export interface InboxDraft {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  href?: string;
}

export function collectInboxNotices(input: {
  userId: string;
  timezone: string;
  today: string;
  tasks: Task[];
  busy: BusySlot[];
  goals: Goal[];
  friendName: string;
  now?: Date;
}): InboxDraft[] {
  const now = input.now ?? new Date();
  const parts = zonedParts(now, input.timezone);
  const minutesNow = parts.hour * 60 + parts.minute;
  const todayTasks = input.tasks.filter(
    (x) => x.userId === input.userId && x.date === input.today && x.status !== "postponed",
  );
  const pending = todayTasks.filter((x) => !x.completed && x.status !== "done");
  const out: InboxDraft[] = [];

  for (const task of pending) {
    if (!task.time) continue;
    const start = minutesOf(task.time);
    const offset = task.reminderOffsetMinutes ?? 120;
    if (minutesNow >= start - offset && minutesNow < start) {
      out.push({
        id: `soon-${task.id}-${input.today}`,
        kind: "remind",
        title: task.title,
        body: `${task.time} · ${input.friendName} hatırlattı`,
        href: "/takvim",
      });
    }
    if (minutesNow >= start && minutesNow < start + 20) {
      out.push({
        id: `now-${task.id}-${input.today}`,
        kind: "remind",
        title: task.title,
        body: "Zamanı geldi",
        href: "/anasayfa",
      });
    }
  }

  if (parts.hour >= 6 && parts.hour < 12 && todayTasks.length > 0) {
    const first = pending
      .filter((x) => x.time)
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))[0];
    out.push({
      id: `smart-morning-${input.today}`,
      kind: "smart",
      title: `Bugün ${pending.length} işin var`,
      body: first
        ? `İlk saatli iş ${first.time} · ${first.title}`
        : `${input.friendName} takvimine baktı`,
      href: "/anasayfa",
    });
  }

  const streak = remainingToStreak(todayTasks);
  if (parts.hour >= 16 && !streak.met && streak.remaining > 0 && streak.planned > 0) {
    out.push({
      id: `smart-streak-${input.today}`,
      kind: "smart",
      title: "Seri tehlikede",
      body: `Bugün ${streak.remaining} iş daha yeter`,
      href: "/anasayfa",
    });
  }

  const timed = pending.filter((x) => x.time).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  for (let i = 1; i < timed.length; i++) {
    const prev = timed[i - 1];
    const cur = timed[i];
    const prevEnd = minutesOf(prev.time ?? "00:00") + (prev.estimatedDurationMinutes ?? 30);
    if (minutesOf(cur.time ?? "00:00") < prevEnd) {
      out.push({
        id: `smart-clash-${input.today}`,
        kind: "smart",
        title: "Saatler çakışıyor",
        body: `${prev.title} ile ${cur.title} üst üste`,
        href: "/takvim",
      });
      break;
    }
  }

  const minutes = pending.reduce((s, x) => s + (x.estimatedDurationMinutes ?? 30), 0);
  if (minutes >= 300) {
    out.push({
      id: `smart-load-${input.today}`,
      kind: "smart",
      title: "Bugün yoğun",
      body: `Planlanan ${Math.round(minutes / 60)} saat — birini kaydırmak seriyi korur`,
      href: "/takvim",
    });
  }

  const goal = input.goals.find((g) => g.userId === input.userId && g.status === "active");
  if (goal && parts.hour >= 17 && parts.hour < 22 && pending.length <= 2) {
    const busy = collectBusy(input.tasks, input.busy, input.userId, input.today);
    const eve = 19 * 60;
    const taken = busy.some((b) => b.startMin < eve + 60 && b.endMin > eve);
    if (!taken) {
      out.push({
        id: `smart-slot-${input.today}`,
        kind: "smart",
        title: `${goal.title} için boşluk`,
        body: "19:00–20:00 takvimde boş",
        href: "/takvim",
      });
    }
  }

  if (parts.hour === 23 && streak.planned > 0 && !streak.met) {
    const need = Math.max(1, streak.remaining);
    out.push({
      id: `streak-${input.today}`,
      kind: "streak",
      title: "Tofiby",
      body: `Seri için ${need} iş daha`,
      href: "/anasayfa",
    });
  }

  return out;
}
