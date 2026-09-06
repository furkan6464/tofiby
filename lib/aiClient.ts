import { APP_ROUTES, coachingRulesForAi, gameRulesForAi, routeMapForAi } from "./aiRules";
import { AI_TOOL_DECLARATIONS, groqToolDefs, normalizeToolCalls, toolRulesForAi } from "./aiTools";
import type {
  AiFail,
  AiResult,
  AiToolTrace,
  ChatCalendarAdd,
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

function asJsonSchema(schema: JsonSchema): JsonSchema {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const src = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      if (k === "type" && typeof v === "string") out.type = v.toLowerCase();
      else out[k] = walk(v);
    }
    return out;
  };
  return walk(schema) as JsonSchema;
}

async function geminiOnce(
  key: string,
  body: Record<string, unknown>,
  useQueryKey: boolean,
): Promise<{ status: number; text: string }> {
  const base = `${GEMINI_URL}/${geminiModel()}:generateContent`;
  const url = useQueryKey ? `${base}?key=${encodeURIComponent(key)}` : base;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!useQueryKey) headers["x-goog-api-key"] = key;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: res.status, text: await res.text() };
}

function extractGeminiText(raw: string): string {
  try {
    const json = JSON.parse(raw) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? raw;
  } catch {
    return raw;
  }
}

function extractGeminiTurn(raw: string): { text: string; calls: ChatReply["toolCalls"] } {
  try {
    const json = JSON.parse(raw) as {
      candidates?: { content?: { parts?: Record<string, unknown>[] } }[];
    };
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => String(p.text ?? "")).join("").trim();
    const calls = normalizeToolCalls(parts.filter((p) => p.functionCall));
    return { text, calls };
  } catch {
    return { text: extractGeminiText(raw), calls: [] };
  }
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
      parts.push({ inlineData: { mimeType: input.file.mime, data: input.file.data } });
    }
    return { role: m.role === "model" ? "model" : "user", parts };
  });
  const base = {
    system_instruction: { parts: [{ text: input.system }] },
    contents,
  };
  const configs: Record<string, unknown>[] = [
    {
      temperature: input.temperature ?? 0.3,
      responseMimeType: "application/json",
      responseJsonSchema: asJsonSchema(input.schema),
    },
    {
      temperature: input.temperature ?? 0.3,
      responseMimeType: "application/json",
      responseSchema: input.schema,
    },
    { temperature: input.temperature ?? 0.3, responseMimeType: "application/json" },
  ];
  let last = { status: 503, text: "gemini empty" };
  for (const useQueryKey of [false, true]) {
    for (const generationConfig of configs) {
      last = await geminiOnce(key, { ...base, generationConfig }, useQueryKey);
      if (last.status === 200) {
        const out = extractGeminiText(last.text);
        return { status: 200, text: out || last.text };
      }
      if (last.status === 429) return last;
    }
  }
  console.error("[ai] gemini failed", last.status, last.text.slice(0, 240));
  return last;
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
      /* fall through to Groq for text */
    }
    if (input.file || !input.allowGroq) return fail("unavailable");
  } else if (input.file || !input.allowGroq) {
    return fail(isRateLimit(gemini.status, gemini.text) ? "rate_limited" : "unavailable");
  }

  let groq: { status: number; text: string };
  try {
    groq = await groqJson(input);
  } catch {
    return fail(isRateLimit(gemini.status, gemini.text) ? "rate_limited" : "unavailable");
  }
  if (groq.status !== 200) {
    console.error("[ai] groq failed", groq.status, groq.text.slice(0, 240));
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
    calendarAdds: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          date: { type: "STRING" },
          weekday: { type: "INTEGER" },
          recurring: { type: "BOOLEAN" },
          start: { type: "STRING" },
          end: { type: "STRING" },
        },
        required: ["title", "start", "end"],
      },
    },
    toolCalls: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          args: { type: "OBJECT" },
        },
        required: ["name"],
      },
    },
  },
  required: ["reply"],
};

const MEMORY_SCHEMA: JsonSchema = {
  type: "OBJECT",
  properties: {
    notes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          source: { type: "STRING" },
        },
        required: ["text", "source"],
      },
    },
  },
  required: ["notes"],
};

export async function distillMemory(
  messages: ChatMessage[],
  existing: string[],
  snapshot: CreatureSnapshot,
): Promise<AiResult<{ notes: { text: string; source: "said" | "observed" }[] }>> {
  return completeJson({
    system: [
      "Konuşmadan kalıcı hafıza notları çıkar. Kısa maddeler, Türkçe.",
      "SADECE kullanıcının açıkça söylediği veya snapshot verilerinden net gözlenen gerçekler.",
      "Varsayım, tahmin, yorum, kişilik analizi YASAK. Şüphen varsa not yazma.",
      "Zaten listedeki notları tekrarlama. Yeni bir şey yoksa boş dizi dön.",
      `Mevcut notlar: ${JSON.stringify(existing)}`,
      `Gözlem için veri (sayılar gerçek; yorum katma): ${JSON.stringify({
        preferredWindow: snapshot.preferredWindow,
        restDay: snapshot.restDay,
        dcs7: snapshot.dcs7,
        goals: snapshot.goals,
        streak: snapshot.streak,
        memory: snapshot.memory,
      })}`,
    ].join("\n"),
    messages: messages.slice(-40),
    schema: MEMORY_SCHEMA,
    schemaHint: '{ "notes": [{ "text": "gece geç saatlerde çalışmayı tercih ediyor", "source": "said" }] }',
    allowGroq: true,
    temperature: 0.1,
    parse: (raw) => {
      const r = raw as Record<string, unknown>;
      if (!Array.isArray(r.notes)) return { notes: [] };
      const notes = r.notes
        .map((item) => {
          const row = item as Record<string, unknown>;
          const text = String(row.text ?? "").replace(/\s+/g, " ").trim();
          const source = String(row.source ?? "") === "observed" ? "observed" : "said";
          return { text, source } as { text: string; source: "said" | "observed" };
        })
        .filter((n) => n.text.length >= 8 && n.text.length <= 160)
        .slice(0, 8);
      return { notes };
    },
  });
}

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

function chatSystem(snapshot: CreatureSnapshot) {
  const memory = (snapshot.memory ?? []).filter(Boolean);
  return [
    "Tofiby adlı bir planlama uygulamasının dostusun. Kısa, sıcak, Türkçe konuş.",
    gameRulesForAi(),
    coachingRulesForAi(),
    routeMapForAi(),
    toolRulesForAi(),
    "Büyüme tavsiyesinde yalnızca yukarıdaki gerçek formülleri ve kullanıcının güncel sayılarını kullan.",
    "Takvim belleği snapshot.week'tedir. SADECE onu kullan. Okul/ders programı uydurma.",
    "calendarEmpty true ise program sorma. preferredWindow ve free boşluklardan saat seç.",
    "Çalışma koyarken busy ile çakışma. Çakışırsa uyar ve en yakın free aralığı kullan.",
    memory.length
      ? `Kalıcı hafıza (yalnızca doğrulanmış notlar, varsayım ekleme):\n${memory.map((n) => `- ${n}`).join("\n")}`
      : "Kalıcı hafıza boş. Kullanıcı hakkında tahmin yazma.",
    "Kullanıcının güncel durumu:",
    JSON.stringify(snapshot),
  ].join("\n\n");
}

function allowedLinks(raw: unknown): ChatReply["links"] {
  const allowed = new Set<string>(APP_ROUTES.map((r) => r.href));
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l) => {
      const row = l as Record<string, unknown>;
      const href = String(row.href ?? "");
      const label = String(row.label ?? "Git").trim() || "Git";
      if (!allowed.has(href)) return null;
      return { label, href };
    })
    .filter((x): x is ChatReply["links"][number] => Boolean(x));
}

function emptyReply(): ChatReply {
  return { reply: "", links: [], calendarAdds: [], toolCalls: [] };
}

function contentsFromChat(messages: ChatMessage[], traces?: AiToolTrace[]) {
  const contents: Record<string, unknown>[] = messages.map((m) => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: m.text }],
  }));
  if (traces && traces.length) {
    contents.push({
      role: "model",
      parts: traces.map((t) => ({ functionCall: { name: t.call.name, args: t.call.args } })),
    });
    contents.push({
      role: "user",
      parts: traces.map((t) => ({
        functionResponse: { name: t.call.name, response: t.result.data },
      })),
    });
  }
  return contents;
}

async function geminiToolTurn(input: {
  system: string;
  messages: ChatMessage[];
  traces?: AiToolTrace[];
}): Promise<{ status: number; text: string; turn: ChatReply | null }> {
  const key = geminiKey();
  if (!key) return { status: 503, text: "missing gemini key", turn: null };
  const body = {
    system_instruction: { parts: [{ text: input.system }] },
    contents: contentsFromChat(
      input.messages.length ? input.messages : [{ role: "user", text: "Merhaba" }],
      input.traces,
    ),
    tools: [{ functionDeclarations: AI_TOOL_DECLARATIONS }],
    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
    generationConfig: { temperature: 0.4 },
  };
  let last = { status: 503, text: "gemini empty" };
  for (const useQueryKey of [false, true]) {
    last = await geminiOnce(key, body, useQueryKey);
    if (last.status === 200) {
      const parsed = extractGeminiTurn(last.text);
      if (parsed.text || parsed.calls.length) {
        return {
          status: 200,
          text: last.text,
          turn: { reply: parsed.text, links: [], calendarAdds: [], toolCalls: parsed.calls },
        };
      }
    }
    if (last.status === 429) return { status: last.status, text: last.text, turn: null };
  }
  return { status: last.status, text: last.text, turn: null };
}

async function groqToolTurn(input: {
  system: string;
  messages: ChatMessage[];
  traces?: AiToolTrace[];
}): Promise<{ status: number; turn: ChatReply | null }> {
  const key = groqKey();
  if (!key) return { status: 503, turn: null };
  const messages: Record<string, unknown>[] = [
    { role: "system", content: input.system },
    ...input.messages.map((m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.text,
    })),
  ];
  if (input.traces?.length) {
    messages.push({
      role: "assistant",
      tool_calls: input.traces.map((t) => ({
        id: t.call.id,
        type: "function",
        function: { name: t.call.name, arguments: JSON.stringify(t.call.args) },
      })),
    });
    for (const t of input.traces) {
      messages.push({
        role: "tool",
        tool_call_id: t.call.id,
        content: JSON.stringify(t.result.data),
      });
    }
  }
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: groqModel(),
      temperature: 0.4,
      tools: groqToolDefs(),
      tool_choice: "auto",
      messages,
    }),
  });
  const text = await res.text();
  if (!res.ok) return { status: res.status, turn: null };
  try {
    const json = JSON.parse(text) as {
      choices?: { message?: { content?: string; tool_calls?: unknown[] } }[];
    };
    const msg = json.choices?.[0]?.message;
    return {
      status: 200,
      turn: {
        reply: String(msg?.content ?? "").trim(),
        links: [],
        calendarAdds: [],
        toolCalls: normalizeToolCalls(msg?.tool_calls ?? []),
      },
    };
  } catch {
    return { status: 200, turn: null };
  }
}

async function chatTurn(
  messages: ChatMessage[],
  snapshot: CreatureSnapshot,
  traces?: AiToolTrace[],
): Promise<AiResult<ChatReply>> {
  const system = chatSystem(snapshot);
  const recent = messages.slice(-20);
  const gemini = await geminiToolTurn({ system, messages: recent, traces });
  if (gemini.status === 429) return fail("rate_limited");
  if (gemini.turn && (gemini.turn.reply || gemini.turn.toolCalls.length)) {
    return { ok: true, data: gemini.turn };
  }
  const groq = await groqToolTurn({ system, messages: recent, traces });
  if (groq.status === 429) return fail("rate_limited");
  if (groq.turn && (groq.turn.reply || groq.turn.toolCalls.length)) {
    return { ok: true, data: groq.turn };
  }
  const fallback = await completeJson({
    system,
    messages: recent.length ? recent : [{ role: "user", text: "Merhaba" }],
    schema: CHAT_SCHEMA,
    schemaHint:
      '{ "reply": "…", "links": [{ "label": "Takvime git", "href": "/takvim" }], "calendarAdds": [], "toolCalls": [{ "name": "createTask", "args": { "title": "Python", "date": "2026-09-08", "time": "19:00" } }] }',
    allowGroq: true,
    temperature: 0.5,
    parse: (raw) => {
      const r = raw as Record<string, unknown>;
      const reply = String(r.reply ?? "").trim();
      const toolCalls = normalizeToolCalls(Array.isArray(r.toolCalls) ? r.toolCalls : []);
      if (!reply && toolCalls.length === 0) return null;
      const today = String(snapshot?.today ?? "").slice(0, 10);
      return {
        reply,
        links: allowedLinks(r.links),
        calendarAdds: parseCalendarAdds(r.calendarAdds, today, Number(snapshot?.weekday)),
        toolCalls,
      };
    },
  });
  if (!fallback.ok) return fallback;
  return { ok: true, data: { ...emptyReply(), ...fallback.data } };
}

export async function chat(
  messages: ChatMessage[],
  snapshot: CreatureSnapshot,
): Promise<AiResult<ChatReply>> {
  return chatTurn(messages, snapshot);
}

export async function chatContinue(
  messages: ChatMessage[],
  snapshot: CreatureSnapshot,
  traces: AiToolTrace[],
): Promise<AiResult<ChatReply>> {
  return chatTurn(messages, snapshot, traces);
}

function parseCalendarAdds(raw: unknown, today: string, todayWeekday: number): ChatCalendarAdd[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatCalendarAdd[] = [];
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const title = String(row.title ?? "").trim();
    const start = normalizeTime(String(row.start ?? ""));
    if (!title || !start) continue;
    const end = normalizeTime(String(row.end ?? "")) ?? start;
    const recurring = Boolean(row.recurring);
    const dateRaw = String(row.date ?? "").trim();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : today || null;
    let weekday = weekdayFromLabel(String(row.weekday ?? ""));
    if (weekday === null && Number.isInteger(Number(row.weekday))) {
      const n = Number(row.weekday);
      if (n >= 0 && n <= 6) weekday = n;
    }
    out.push({
      title,
      date: recurring ? null : date,
      weekday: recurring ? (weekday ?? (Number.isFinite(todayWeekday) ? todayWeekday : null)) : null,
      recurring,
      start,
      end,
    });
  }
  return out;
}
