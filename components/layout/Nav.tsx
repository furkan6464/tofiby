"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { friendName, t } from "@/lib/i18n";
import { useActiveCreature } from "@/lib/store";

const PRODUCTIVITY = [
  { href: "/anasayfa", key: "nav.home" },
  { href: "/gorevler", key: "nav.tasks" },
  { href: "/takvim", key: "nav.calendar" },
  { href: "/hedeflerim", key: "nav.goals" },
  { href: "/analiz", key: "nav.analytics" },
] as const;

const CREATURE = [
  { href: "/yaratigim", key: "nav.growth" },
  { href: "/topluluk", key: "nav.bond" },
  { href: "/nesil", key: "nav.generation" },
] as const;

const MOBILE = [
  { href: "/anasayfa", key: "nav.home" },
  { href: "/gorevler", key: "nav.tasks" },
  { href: "/takvim", key: "nav.calendar" },
  { href: "/hedeflerim", key: "nav.goals" },
  { href: "/profil", key: "nav.profile" },
] as const;

function Item({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-chip px-3 py-2.5 text-sm ${active ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}
    >
      {label}
    </Link>
  );
}

export function DesktopNav({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const path = usePathname();
  const creature = useActiveCreature();
  return (
    <aside
      className={`flex h-dvh shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-base py-6 transition-[width] duration-200 ease-out ${
        collapsed ? "w-12 px-1.5" : "w-[13.5rem] px-4"
      }`}
    >
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between gap-2"}`}>
        {!collapsed ? (
          <Link href="/anasayfa" className="min-w-0 truncate font-display text-2xl">
            {t("brand.name")}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-chip p-1.5 text-muted hover:bg-raised hover:text-ink"
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      {!collapsed ? (
        <>
          <p className="mt-8 px-3 text-[10px] uppercase tracking-wide text-faint">
            {t("nav.productivity")}
          </p>
          <nav className="mt-2 flex flex-col gap-1">
            {PRODUCTIVITY.map((item) => (
              <Item
                key={item.href}
                href={item.href}
                label={t(item.key)}
                active={path === item.href || path.startsWith(`${item.href}/`)}
              />
            ))}
          </nav>
          <p className="mt-8 px-3 text-[10px] uppercase tracking-wide text-faint">
            {t("nav.creatureCol")}
          </p>
          <nav className="mt-2 flex flex-col gap-1">
            {CREATURE.map((item) => (
              <Item
                key={item.href}
                href={item.href}
                label={item.href === "/yaratigim" ? friendName(creature?.name) : t(item.key)}
                active={path === item.href}
              />
            ))}
          </nav>
          <div className="mt-auto space-y-1">
            <Item href="/profil" label={t("nav.profile")} active={path === "/profil"} />
            <Item href="/ayarlar" label={t("nav.settings")} active={path === "/ayarlar"} />
          </div>
        </>
      ) : null}
    </aside>
  );
}

export function MobileTabs() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-base/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {MOBILE.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[8px] py-2 text-center text-[11px] ${active ? "text-pink" : "text-faint"}`}
            >
              {t(item.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
