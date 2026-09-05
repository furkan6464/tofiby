import { gameRulesForAi, routeMapForAi } from "./aiRules";
import type {
  AiFail,
  AiResult,
  ChatMessage,
  ChatReply,
  CreatureSnapshot,
  GoalPlanDraft,
  GoalPlanInput,
  ScheduleLesson,
  StudySlot,
  StudySuggestInput,
} from "./aiTypes";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type JsonSchema = Record<string, unknown>;

function geminiKey() {
  return process.env.GEMINI_API_KEY?.trim() ?? "";
}
function groqKey() {
  return process.env.GROQ_API_KEY?.trim() ?? "";
}
function geminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
}
function groqModel() {
  return process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
}

function isRateLimit(status: number, body: string) {
  return status === 429 || /RESOURCE_EXHAUSTED|rate[_ ]?limit|too many requests/i.test(body);
}

function parseJsonText(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

function fail(error: AiFail["error"] = "unavailable"): AiResult<never> {
  return { ok: false, error };
}

function normalizeTime(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(".", ":").replace(/\s+/g, "");
  const ampm = s.match(/^(\d{1,2}):?(\d{2})?(am|pm)$/);
  if (ampm) {
    let h = Number(ampm[1]);
    const min = Number(ampm[2] ?? "0");
    if (ampm[3] === "pm" && h < 12) h += 12;
    if (ampm[3] === "am" && h === 12) h = 0;
    if (h > 23 || min > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const DAY_ALIASES: Record<string, number> = {
  pazar: 0,
  sun: 0,
  sunday: 0,
  pazartesi: 1,
  pzt: 1,
  mon: 1,
  monday: 1,
  sali: 2,
  salı: 2,
  tue: 2,
  tuesday: 2,
  carsamba: 3,
  çarşamba: 3,
  car: 3,
  wed: 3,
  wednesday: 3,
  persembe: 4,
  perşembe: 4,
  per: 4,
  thu: 4,
  thursday: 4,
  cuma: 5,
  fri: 5,
  friday: 5,
  cumartesi: 6,
  cmt: 6,
  sat: 6,
  saturday: 6,
};

function fold(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function weekdayFromLabel(raw: string): number | null {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 0 && n <= 6) return n;
  const key = fold(raw);
  if (key in DAY_ALIASES) return DAY_ALIASES[key];
  return null;
}

async function geminiJson(input: {
  system: string;
  messages: ChatMessage[];
  schema: JsonSchema;
  file?: { mime: string; data: string };
  temperature?: number;
}): Promise<{ status: number; text: string }> {
  const key = geminiKey();
  if (!key) return { status: 503, text: "missing gemini key" };
  const contents = input.messages.map((m, i) => {
    const parts: Record<string, unknown>[] = [{ text: m.text }];
    if (i === input.messages.length - 1 && m.role === "user" && input.file) {
      parts.push({ inline_data: { mime_type: input.file.mime, data: input.file.data } });
    }
    return { role: m.role === "model" ? "model" : "user", parts };
  });
  const res = await fetch(`${GEMINI_URL}/${geminiModel()}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: input.system }] },
      contents,
      generationConfig: {
        temperature: input.temperature ?? 0.3,
        responseMimeType: "application/json",
        responseSchema: input.schema,
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) return { status: res.status, text };
  try {
    const json = JSON.parse(text) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const out = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { status: 200, text: out || text };
  } catch {
    return { status: 200, text };
  }
}

async function groqJson(input: {
  system: string;
  messages: ChatMessage[];
  schemaHint: string;
  temperature?: number;
}): Promise<{ status: number; text: string }> {
  const key = groqKey();
  if (!key) return { status: 503, text: "missing groq key" };
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: groqModel(),
      temperature: input.temperature ?? 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${input.system}\n\nYanıtın SADECE şu JSON şemasına uysun:\n${input.schemaHint}`,
        },
        ...input.messages.map((m) => ({
          role: m.role === "model" ? "assistant" : "user",
          content: m.text,
        })),
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) return { status: res.status, text };
  try {
    const json = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
    return { status: 200, text: json.choices?.[0]?.message?.content ?? text };
  } catch {
    return { status: 200, text };
  }
}

async function completeJson<T>(input: {
  system: string;
  messages: ChatMessage[];
  schema: JsonSchema;
  schemaHint: string;
  file?: { mime: string; data: string };
  allowGroq: boolean;
  temperature?: number;
  parse: (raw: unknown) => T | null;
}): Promise<AiResult<T>> {
  let gemini: { status: number; text: string };
  try {
    gemini = await geminiJson(input);
  } catch {
    gemini = { status: 503, text: "gemini network" };
  }

  if (gemini.status === 200) {
    try {
      const parsed = input.parse(parseJsonText(gemini.text));
      if (parsed) return { ok: true, data: parsed };
    } catch {
      /* fall through */
    }
    return fail("unavailable");
  }

  if (input.file || !input.allowGroq) {
    return fail(isRateLimit(gemini.status, gemini.text) ? "rate_limited" : "unavailable");
  }

  if (!isRateLimit(gemini.status, gemini.text) && gemini.status < 500 && gemini.status !== 503) {
    return fail("unavailable");
  }

  let groq: { status: number; text: string };
  try {
    groq = await groqJson(input);
  } catch {
    return fail(isRateLimit(gemini.status, gemini.text) ? "rate_limited" : "unavailable");
  }
  if (groq.status !== 200) {
    return fail(isRateLimit(groq.status, groq.text) ? "rate_limited" : "unavailable");
  }
  try {
    const parsed = input.parse(parseJsonText(groq.text));
    if (parsed) return { ok: true, data: parsed };
  } catch {
    /* ignore */
  }
  return fail("unavailable");
}

const LESSON_SCHEMA: JsonSchema = {
  type: "OBJECT",
  properties: {
    lessons: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          gun: { type: "STRING" },
          baslangicSaati: { type: "STRING" },
          bitisSaati: { type: "STRING" },
          dersAdi: { type: "STRING" },
        },
        required: ["gun", "baslangicSaati", "bitisSaati", "dersAdi"],
      },
    },
  },
  required: ["lessons"],
};

const SLOT_SCHEMA: JsonSchema = {
  type: "OBJECT",
  properties: {
    slots: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          weekday: { type: "INTEGER" },
          start: { type: "STRING" },
          end: { type: "STRING" },
          title: { type: "STRING" },
          goalTitle: { type: "STRING" },
        },
        required: ["weekday", "start", "end", "title"],
      },
    },
  },
  required: ["slots"],
};

const PLAN_SCHEMA: JsonSchema = {
  type: "OBJECT",
  properties: {
    taskTitle: { type: "STRING" },
    note: { type: "STRING" },
    weeklyFrequency: { type: "INTEGER" },
    dailyDurationMinutes: { type: "INTEGER" },
    frequencyKind: { type: "STRING" },
    weekdays: { type: "ARRAY", items: { type: "INTEGER" } },
    milestones: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          weight: { type: "INTEGER" },
        },
        required: ["title"],
      },
    },
  },
  required: ["taskTitle", "weeklyFrequency", "dailyDurationMinutes", "frequencyKind", "milestones"],
};

const CHAT_SCHEMA: JsonSchema = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    links: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          href: { type: "STRING" },
        },
        required: ["label", "href"],
      },
    },
  },
  required: ["reply"],
};

export async function parseSchedule(
  file: { mime: string; data: string },
  note = "",
): Promise<AiResult<ScheduleLesson[]>> {
  if (!file.data || (!file.mime.startsWith("image/") && file.mime !== "application/pdf")) {
    return fail("bad_input");
  }
  const extra = note.trim()
    ? `\nKullanıcının notu (buna uy, çelişen satırları atla veya istediği gibi kaydır): ${note.trim()}`
    : "";
  return completeJson({
    system:
      "Ders programı görseli veya PDF'inden tekrarlayan haftalık dersleri çıkar. Saatleri 24 saat HH:MM yaz. Gün adını Türkçe yaz. Uydurma ders ekleme; okuyamadığın satırı atla. Kullanıcı not verdiyse o notu uygula (ör. sadece bazı dersler, saat kaydırma, dinlenme günü).",
    messages: [
      {
        role: "user",
        text: `Bu programdaki dersleri JSON olarak çıkar: gün, başlangıçSaati, bitişSaati, dersAdı.${extra}`,
      },
    ],
    schema: LESSON_SCHEMA,
    schemaHint: '{ "lessons": [{ "gun": "Pazartesi", "baslangicSaati": "09:00", "bitisSaati": "10:00", "dersAdi": "Matematik" }] }',
    file,
    allowGroq: false,
    parse: (raw) => {
      const lessons = (raw as { lessons?: unknown[] }).lessons;
      if (!Array.isArray(lessons)) return null;
      const out: ScheduleLesson[] = [];
      for (const row of lessons) {
        const r = row as Record<string, unknown>;
        const start = normalizeTime(String(r.baslangicSaati ?? ""));
        const end = normalizeTime(String(r.bitisSaati ?? ""));
        const weekday = weekdayFromLabel(String(r.gun ?? ""));
        const title = String(r.dersAdi ?? "").trim();
        if (!start || !end || weekday === null || !title) continue;
        out.push({
          gun: String(r.gun ?? ""),
          weekday,
          baslangicSaati: start,
          bitisSaati: end,
          dersAdi: title,
        });
      }
      return out;
    },
  });
}

export async function suggestStudyHours(data: StudySuggestInput): Promise<AiResult<StudySlot[]>> {
  return completeJson({
    system:
      "Rolün: var olan bir çalışma hedefini, kullanıcının boş zaman aralıklarına dağıtmak. Yeni hedef icat etme. Sadece verilen boşlukların içine otur. weekday 0=Pazar … 6=Cumartesi. Saatler HH:MM.",
    messages: [
      {
        role: "user",
        text: JSON.stringify({
          title: data.title,
          weeklyMinutes: data.weeklyMinutes,
          weeklyFrequency: data.weeklyFrequency,
          free: data.free,
          goals: data.goals,
        }),
      },
    ],
    schema: SLOT_SCHEMA,
    schemaHint:
      '{ "slots": [{ "weekday": 2, "start": "19:00", "end": "20:00", "title": "İngilizce", "goalTitle": "İngilizce" }] }',
    allowGroq: true,
    parse: (raw) => {
      const slots = (raw as { slots?: unknown[] }).slots;
      if (!Array.isArray(slots)) return null;
      const out: StudySlot[] = [];
      for (const row of slots) {
        const r = row as Record<string, unknown>;
        const weekday = weekdayFromLabel(String(r.weekday ?? ""));
        const start = normalizeTime(String(r.start ?? ""));
        const end = normalizeTime(String(r.end ?? ""));
        const title = String(r.title ?? data.title).trim();
        if (weekday === null || !start || !end || !title) continue;
        out.push({
          weekday,
          start,
          end,
          title,
          goalTitle: r.goalTitle ? String(r.goalTitle) : undefined,
        });
      }
      return out;
    },
  });
}

export async function planGoal(data: GoalPlanInput): Promise<AiResult<GoalPlanDraft>> {
  return completeJson({
    system:
      "Kullanıcının yazdığı hedefi kilometre taşlarına böl. Hedefi değiştirme, sadece taslak plan üret. frequencyKind: daily | weekdays | times_per_week | custom. weekday 0=Pazar … 6=Cumartesi.",
    messages: [{ role: "user", text: JSON.stringify(data) }],
    schema: PLAN_SCHEMA,
    schemaHint:
      '{ "taskTitle": "İngilizce çalış", "note": "", "weeklyFrequency": 4, "dailyDurationMinutes": 30, "frequencyKind": "times_per_week", "weekdays": [1,2,4,5], "milestones": [{ "title": "A1", "weight": 1 }] }',
    allowGroq: true,
    parse: (raw) => {
      const r = raw as Record<string, unknown>;
      const milestones = Array.isArray(r.milestones)
        ? r.milestones
            .map((m) => {
              const row = m as Record<string, unknown>;
              return { title: String(row.title ?? "").trim(), weight: Number(row.weight) || 1 };
            })
            .filter((m) => m.title)
        : [];
      const kind = String(r.frequencyKind ?? "times_per_week");
      const frequencyKind =
        kind === "daily" || kind === "weekdays" || kind === "custom" || kind === "times_per_week"
          ? kind
          : "times_per_week";
      const weekdays = Array.isArray(r.weekdays)
        ? r.weekdays.map((d) => weekdayFromLabel(String(d))).filter((d): d is number => d !== null)
        : [];
      const title = String(r.taskTitle ?? "").trim();
      if (!title || milestones.length === 0) return null;
      return {
        taskTitle: title,
        note: String(r.note ?? ""),
        weeklyFrequency: Math.min(7, Math.max(1, Number(r.weeklyFrequency) || 3)),
        dailyDurationMinutes: Math.min(180, Math.max(10, Number(r.dailyDurationMinutes) || 30)),
        frequencyKind,
        weekdays,
        milestones,
      };
    },
  });
}

export async function chat(
  messages: ChatMessage[],
  snapshot: CreatureSnapshot,
): Promise<AiResult<ChatReply>> {
  const system = [
    "Tofiby adlı bir planlama uygulamasının dostusun. Kısa, sıcak, Türkçe konuş.",
    gameRulesForAi(),
    routeMapForAi(),
    "Büyüme tavsiyesinde yalnızca yukarıdaki gerçek formülleri ve kullanıcının güncel sayılarını kullan.",
    "Ders programı için soldaki ataşla fotoğraf veya PDF eklemelerini söyle. Programı metinden uydurma.",
    "Kullanıcının güncel durumu:",
    JSON.stringify(snapshot),
  ].join("\n\n");
  const recent = messages.slice(-12);
  return completeJson({
    system,
    messages: recent.length ? recent : [{ role: "user", text: "Merhaba" }],
    schema: CHAT_SCHEMA,
    schemaHint: '{ "reply": "…", "links": [{ "label": "Hedeflere git", "href": "/hedeflerim" }] }',
    allowGroq: true,
    temperature: 0.5,
    parse: (raw) => {
      const r = raw as Record<string, unknown>;
      const reply = String(r.reply ?? "").trim();
      if (!reply) return null;
      const allowed = new Set([
        "/anasayfa",
        "/gorevler",
        "/takvim",
        "/hedeflerim",
        "/analiz",
        "/yaratigim",
        "/topluluk",
        "/nesil",
        "/profil",
        "/ayarlar",
      ]);
      const links = Array.isArray(r.links)
        ? r.links
            .map((l) => {
              const row = l as Record<string, unknown>;
              const href = String(row.href ?? "");
              const label = String(row.label ?? "Git").trim() || "Git";
              if (!allowed.has(href)) return null;
              return { label, href };
            })
            .filter((x): x is ChatReply["links"][number] => Boolean(x))
        : [];
      return { reply, links };
    },
  });
}
