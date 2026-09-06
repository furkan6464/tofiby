export const PRODUCTIVITY = [
  { href: "/anasayfa", key: "nav.home" },
  { href: "/gorevler", key: "nav.tasks" },
  { href: "/takvim", key: "nav.calendar" },
  { href: "/hedeflerim", key: "nav.goals" },
  { href: "/analiz", key: "nav.analytics" },
] as const;

export const CREATURE = [
  { href: "/yaratigim", key: "nav.growth" },
  { href: "/topluluk", key: "nav.bond" },
  { href: "/nesil", key: "nav.generation" },
] as const;

export const ACCOUNT = [
  { href: "/profil", key: "nav.profile" },
  { href: "/ayarlar", key: "nav.settings" },
] as const;

export function titleKeyForPath(path: string): string {
  const exact = [...PRODUCTIVITY, ...CREATURE, ...ACCOUNT].find(
    (item) => path === item.href || path.startsWith(`${item.href}/`),
  );
  return exact?.key ?? "brand.name";
}

export function parentPath(path: string): string | null {
  if (/^\/hedeflerim\/[^/]+$/.test(path)) return "/hedeflerim";
  return null;
}
