export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function hashPass(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function validUsername(name: string): boolean {
  return /^[a-zA-Z0-9_]{3,16}$/.test(name);
}

export function parseFriendHandle(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("ekle");
    if (fromQuery) return fromQuery.replace(/^@/, "").toLowerCase();
  } catch {
    /* not a URL */
  }
  const handle = trimmed.replace(/^@/, "").split("/").pop() ?? trimmed;
  const clean = handle.toLowerCase();
  return validUsername(clean) ? clean : null;
}
