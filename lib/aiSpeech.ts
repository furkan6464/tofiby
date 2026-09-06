import { APP_ROUTES } from "./aiRules";
import { AI_TOOL_DECLARATIONS, BLOCKED_TOOLS } from "./aiTools";
import type { ChatLink, ChatReply } from "./aiTypes";

const EXTRA_INTERNAL = ["toolCalls", "functionCall", "function_call", "functionDeclarations"];

const TOOL_NAME_RE = new RegExp(
  String.raw`[\s]*[\`*_]*\b(?:${[...AI_TOOL_DECLARATIONS.map((d) => d.name), ...BLOCKED_TOOLS, ...EXTRA_INTERNAL]
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})\b[\`*_]*\s*(?:\(\s*\))?`,
  "gi",
);

function hrefFor(raw: string) {
  const path = raw.trim();
  if (APP_ROUTES.some((r) => r.href === path)) return path;
  const hit = APP_ROUTES.find(
    (r) =>
      r.label.toLocaleLowerCase("tr") === path.toLocaleLowerCase("tr") ||
      r.href.slice(1) === path.replace(/^\//, "").toLocaleLowerCase("tr"),
  );
  return hit?.href ?? null;
}

function labelFor(href: string, fallback = "Git") {
  return APP_ROUTES.find((r) => r.href === href)?.label ?? fallback;
}

function addLink(links: ChatLink[], href: string, label?: string) {
  if (!href || links.some((l) => l.href === href)) return;
  links.push({ href, label: labelFor(href, label || "Git") });
}

export function sanitizeAiSpeech(raw: string): { text: string; links: ChatLink[] } {
  let text = String(raw ?? "");
  const links: ChatLink[] = [];

  text = text.replace(/\[([^\]]+)\]\(\s*(\/[a-z0-9/-]+)\s*\)/gi, (_, label: string, href: string) => {
    const path = hrefFor(href);
    if (path) addLink(links, path, String(label));
    return "";
  });
  text = text.replace(/(^|[\s(])(\/[a-z0-9/-]+)(?=[\s).,]|$)/gi, (full, lead: string, href: string) => {
    const path = hrefFor(href);
    if (path) {
      addLink(links, path);
      return lead;
    }
    return full;
  });

  text = text.replace(TOOL_NAME_RE, " ");
  text = text.replace(
    /\s+ile\s+(ekleyebilirim|oluşturabilirim|olusturabilirim|çağırabilirim|cagirabilirim|yapabilirim|eklerim)/gi,
    " $1",
  );
  text = text.replace(/\s+(aracın[ıi]|fonksiyonu(?:nu)?)\s*(kullanarak|ile|çağırarak|cagirarak)?/gi, " ");
  text = text.replace(/`+/g, "");
  text = text.replace(/[ \t]{2,}/g, " ").replace(/ +\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  text = text.replace(/ +\./g, ".").replace(/ +, /g, ", ").replace(/ +: /g, ": ").trim();

  return { text, links };
}

export function polishChatReply(turn: ChatReply): ChatReply {
  const spoken = sanitizeAiSpeech(turn.reply);
  const links = [...(turn.links ?? [])];
  for (const extra of spoken.links) addLink(links, extra.href, extra.label);
  return { ...turn, reply: spoken.text, links };
}
