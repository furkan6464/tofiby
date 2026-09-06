export type AiAction =
  | "parseSchedule"
  | "suggestStudyHours"
  | "planGoal"
  | "chat"
  | "chatContinue"
  | "distillMemory";

export type AiToolName =
  | "createTask"
  | "createGoal"
  | "scheduleStudyHours"
  | "postponeTask"
  | "markTaskComplete"
  | "parseSchedulePhoto"
  | "getUserStats"
  | "getGoalProgress"
  | "navigateTo";

export interface AiToolCall {
  id: string;
  name: AiToolName;
  args: Record<string, unknown>;
}

export interface AiToolResult {
  id: string;
  name: AiToolName;
  ok: boolean;
  data: Record<string, unknown>;
}

export interface AiToolTrace {
  call: AiToolCall;
  result: AiToolResult;
}

export interface ChatUndo {
  id: string;
  label: string;
  kind: AiToolName;
  payload: Record<string, unknown>;
}

export interface TaskDraft {
  title: string;
  date: string;
  time?: string | null;
  durationMinutes?: number | null;
  goalId?: string | null;
  priority?: string;
}

export type ChatPending =
  | {
      kind: "consultHours";
      title: string;
      hours: number;
      goalId?: string | null;
      week: "this" | "next";
    }
  | { kind: "consultTime"; draft: TaskDraft }
  | {
      kind: "pickSlots";
      title: string;
      hours?: number;
      goalId?: string | null;
      week: "this" | "next";
      draft?: TaskDraft;
      mode: "hours" | "task";
    }
  | { kind: "confirmTask"; draft: TaskDraft }
  | {
      kind: "nextWeek";
      title: string;
      hours: number;
      leftoverHours: number;
      goalId?: string | null;
    };

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
  toolCalls: AiToolCall[];
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface ChatBusyItem {
  title: string;
  start: string;
  end: string;
}

export interface ChatDay {
  date: string;
  wd: number;
  busy: ChatBusyItem[];
  free: { start: string; end: string }[];
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
  preferredWindow: string | null;
  restDay: number | null;
  calendarEmpty: boolean;
  week: ChatDay[];
  goals: {
    id: string;
    title: string;
    weeklyFrequency: number | null;
    dailyMins: number | null;
    pct?: number;
    next?: string | null;
  }[];
  hasAttachedFile?: boolean;
  now?: string;
  insightEnough?: boolean;
  bestHourWindow?: string | null;
  remainingWeek?: string[];
  dcs7?: { date: string; dcs: number | null }[];
  memory?: string[];
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
