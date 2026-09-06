import { APP_ROUTES } from "./aiRules";
import { uid } from "./ids";
import type { AiToolCall, AiToolName } from "./aiTypes";

export const READ_TOOLS = new Set<AiToolName>(["getUserStats", "getGoalProgress", "navigateTo"]);
export const MUTATE_TOOLS = new Set<AiToolName>([
  "createTask",
  "createGoal",
  "scheduleStudyHours",
  "postponeTask",
  "markTaskComplete",
]);
export const BLOCKED_TOOLS = new Set<string>([
  "deleteAccount",
  "addFriend",
  "acceptFriend",
  "poke",
  "bond",
  "pay",
  "deleteUser",
]);

export function toolKind(name: string): "read" | "mutate" | "blocked" | "unknown" {
  if (BLOCKED_TOOLS.has(name)) return "blocked";
  if (READ_TOOLS.has(name as AiToolName)) return "read";
  if (MUTATE_TOOLS.has(name as AiToolName) || name === "parseSchedulePhoto") return "mutate";
  return "unknown";
}

/** Yeni eylem: buraya ekle, runAiTools içine mevcut store/aksiyonu bağla. */
export const AI_TOOL_DECLARATIONS = [
  {
    name: "createTask",
    description: "Takvime veya seçilen güne bir görev ekler. Hemen uygulanır.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        date: { type: "STRING", description: "YYYY-MM-DD" },
        time: { type: "STRING", description: "HH:MM, isteğe bağlı" },
        durationMinutes: { type: "INTEGER" },
        priority: { type: "STRING", description: "low | medium | high" },
        goalId: { type: "STRING" },
        goalTitle: { type: "STRING", description: "goalId yoksa hedef adı" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "createGoal",
    description: "Yeni aktif hedef oluşturur ve tekrarlayan görevlerini üretir.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        targetDate: { type: "STRING", description: "YYYY-MM-DD veya boş" },
        weeklyFrequency: { type: "INTEGER" },
        dailyDurationMinutes: { type: "INTEGER" },
      },
      required: ["title"],
    },
  },
  {
    name: "scheduleStudyHours",
    description: "Mevcut otomatik planlama motoruyla bir hedefe haftalık saat yerleştirir.",
    parameters: {
      type: "OBJECT",
      properties: {
        goalId: { type: "STRING" },
        goalTitle: { type: "STRING" },
        hoursPerWeek: { type: "NUMBER" },
      },
      required: ["hoursPerWeek"],
    },
  },
  {
    name: "postponeTask",
    description: "Bir görevi başka bir güne taşır.",
    parameters: {
      type: "OBJECT",
      properties: {
        taskId: { type: "STRING" },
        taskTitle: { type: "STRING" },
        newDate: { type: "STRING", description: "YYYY-MM-DD" },
      },
      required: ["newDate"],
    },
  },
  {
    name: "markTaskComplete",
    description: "Bir görevi tamamlandı olarak işaretler.",
    parameters: {
      type: "OBJECT",
      properties: {
        taskId: { type: "STRING" },
        taskTitle: { type: "STRING" },
      },
    },
  },
  {
    name: "parseSchedulePhoto",
    description: "Kullanıcının attığı ders programı fotoğrafını/PDF'ini okur. Dosya yoksa isteme.",
    parameters: { type: "OBJECT", properties: { imageRef: { type: "STRING" } } },
  },
  {
    name: "getUserStats",
    description: "Salt okunur: seri, GP, aşama, bugünkü DCS.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "getGoalProgress",
    description: "Salt okunur: bir hedefin ilerleme yüzdesi ve sıradaki kilometre taşı.",
    parameters: {
      type: "OBJECT",
      properties: {
        goalId: { type: "STRING" },
        goalTitle: { type: "STRING" },
      },
    },
  },
  {
    name: "navigateTo",
    description: "Uygulama içinde bir sayfayı açar. Silme/ödeme/arkadaşlık yapamaz.",
    parameters: {
      type: "OBJECT",
      properties: {
        page: {
          type: "STRING",
          description: APP_ROUTES.map((r) => r.href).join(", "),
        },
      },
      required: ["page"],
    },
  },
] as const;

export function groqToolDefs() {
  return AI_TOOL_DECLARATIONS.map((fn) => ({
    type: "function",
    function: {
      name: fn.name,
      description: fn.description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(fn.parameters.properties ?? {}).map(([k, v]) => [
            k,
            { ...v, type: String((v as { type?: string }).type ?? "string").toLowerCase() },
          ]),
        ),
        required: (fn.parameters as { required?: string[] }).required ?? [],
      },
    },
  }));
}

export function parseToolName(raw: string): AiToolName | null {
  const name = raw.trim();
  if (AI_TOOL_DECLARATIONS.some((x) => x.name === name)) return name as AiToolName;
  return null;
}

export function normalizeToolCalls(raw: unknown[]): AiToolCall[] {
  const out: AiToolCall[] = [];
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const fn = (row.functionCall ?? row.function_call ?? row) as Record<string, unknown>;
    const name = parseToolName(String(fn.name ?? row.name ?? ""));
    if (!name) continue;
    let args = fn.args ?? fn.arguments ?? row.args ?? {};
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        args = {};
      }
    }
    out.push({
      id: String(fn.id ?? row.id ?? uid()),
      name,
      args: args && typeof args === "object" ? (args as Record<string, unknown>) : {},
    });
  }
  return out;
}

export function toolRulesForAi(): string {
  return [
    "Araçlar: createTask, createGoal, scheduleStudyHours, postponeTask, markTaskComplete, parseSchedulePhoto, getUserStats, getGoalProgress, navigateTo.",
    "Kullanıcı bir eylem istediğinde ilgili aracı ÇAĞIR. Sadece konuşup 'ekledim' deme — aracı çağır.",
    "getUserStats, getGoalProgress, navigateTo salt okunur; hemen çalışır.",
    "Yazan araçlar hemen uygulanır; sen onay penceresi isteme.",
    "Hesap silme, arkadaşlık isteği, ödeme, profil silme YASAK. Bunları asla çağırma, sohbetten tetikleme.",
    "parseSchedulePhoto yalnızca snapshot.hasAttachedFile true ise. Yoksa ataşlamasını söyle, uydurma program yazma.",
    "scheduleStudyHours mevcut planlama motorudur. 'bu hafta X'e N saat' deyince onu kullan.",
    "goalId/taskId yoksa snapshot'taki ada göre goalTitle/taskTitle yaz.",
    "Çakışan saate görev koyma; snapshot.week busy/free kullan.",
  ].join("\n");
}
