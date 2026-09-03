import tr from "@/locales/tr.json";
import { createRng, seedFrom } from "./genetics";

type Dict = typeof tr;

type NestedKey<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}` | `${K}.${NestedKey<T[K]>}`
        : `${K}`;
    }[keyof T & string]
  : never;

export type MessageKey = NestedKey<Dict>;

function lookup(path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, tr);
}

export function t(
  key: MessageKey | string,
  vars?: Record<string, string | number>,
): string {
  const value = lookup(key);
  if (typeof value !== "string") return key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(vars[name] ?? `{${name}}`),
  );
}

export function tList(key: MessageKey | string): string[] {
  const value = lookup(key);
  return Array.isArray(value) ? (value as string[]) : [];
}

export function friendName(named?: string | null): string {
  const n = named?.trim();
  if (n && n !== t("creature.unnamed") && n !== t("friend.unnamed")) return n;
  return t("friend.genericTiny");
}

export function pickDaily(key: MessageKey | string, salt: string[]): string {
  const list = tList(key);
  if (list.length === 0) return "";
  const rng = createRng(seedFrom(salt));
  return list[Math.floor(rng.next() * list.length)];
}

export { tr };
