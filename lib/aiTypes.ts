export type AiAction = "parseSchedule" | "suggestStudyHours" | "planGoal" | "chat";

export interface ScheduleLesson {
  gun: string;
  weekday: number;
  baslangicSaati: string;
  bitisSaati: string;
  dersAdi: string;
}

export interface StudySlot {
  weekday: number;
  start: string;
  end: string;
  title: string;
  goalTitle?: string;
}

export interface GoalPlanDraft {
  taskTitle: string;
  note: string;
  weeklyFrequency: number;
  dailyDurationMinutes: number;
  frequencyKind: "daily" | "weekdays" | "times_per_week" | "custom";
  weekdays: number[];
  milestones: { title: string; weight: number }[];
}

export interface ChatLink {
  label: string;
  href: string;
}

export interface ChatCalendarAdd {
  title: string;
  date: string | null;
  weekday: number | null;
  recurring: boolean;
  start: string;
  end: string;
}

export interface ChatReply {
  reply: string;
  links: ChatLink[];
  calendarAdds: ChatCalendarAdd[];
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface CreatureSnapshot {
  name: string;
  stage: string;
  streak: number;
  longest: number;
  totalGp: number;
  health: string;
  todayDcs: number | null;
  todayDone: number;
  todayPlanned: number;
  today: string;
  weekday: number;
  goals: { title: string; weeklyFrequency: number | null; dailyMins: number | null }[];
}

export interface FreeWindow {
  date: string;
  weekday: number;
  start: string;
  end: string;
}

export interface StudySuggestInput {
  title: string;
  weeklyMinutes: number;
  weeklyFrequency: number;
  free: FreeWindow[];
  goals: { title: string }[];
}

export interface GoalPlanInput {
  title: string;
  note: string;
  targetDate: string | null;
  weeklyFrequency: number;
  dailyDurationMinutes: number;
  free: FreeWindow[];
}

export type AiOk<T> = { ok: true; data: T };
export type AiFail = { ok: false; error: "unavailable" | "rate_limited" | "bad_input" };
export type AiResult<T> = AiOk<T> | AiFail;
