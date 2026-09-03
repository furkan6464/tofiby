"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { friendName, t } from "@/lib/i18n";
import { useActiveCreature } from "@/lib/store";

const ITEMS = [
  { href: "/anasayfa", key: "nav.home" },
  { href: "/takvim", key: "nav.calendar" },
  { href: "/hedeflerim", key: "nav.goals" },
  { href: "/yaratigim", key: "nav.creature" },
  { href: "/topluluk", key: "nav.community" },
] as const;

export function Nav() {
  const path = usePathname();
  const creature = useActiveCreature();
  const creatureLabel = friendName(creature?.name);
  return (
    <>
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[13.5rem] flex-col border-r border-white/[0.06] bg-base px-4 py-6 md:flex">
        <Link href="/anasayfa" className="font-display text-2xl">
          {t("brand.name")}
        </Link>
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {ITEMS.map((item) => {
            const active = path === item.href;
            const label = item.href === "/yaratigim" ? creatureLabel : t(item.key);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-chip px-3 py-2.5 text-sm ${active ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1">
          <Link href="/profil" className="block rounded-chip px-3 py-2 text-sm text-muted hover:text-ink">
            {t("nav.profile")}
          </Link>
          <Link href="/ayarlar" className="block rounded-chip px-3 py-2 text-sm text-muted hover:text-ink">
            {t("nav.settings")}
          </Link>
        </div>
      </aside>
      <div className="fixed right-4 top-4 z-40 flex gap-3 md:hidden">
        <Link href="/profil" className="text-xs text-muted">
          {t("nav.profile")}
        </Link>
        <Link href="/ayarlar" className="text-xs text-muted">
          {t("nav.settings")}
        </Link>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-base/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {ITEMS.map((item) => {
            const active = path === item.href;
            const label = item.href === "/yaratigim" ? creatureLabel : t(item.key);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-[8px] py-2 text-center text-[11px] ${active ? "text-pink" : "text-faint"}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
