"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2,
  Bell,
  Calendar,
  Home,
  MessageCircle,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { initials } from "@/lib/timeBlock";
import { useApp, useSession } from "@/lib/store";

const ICONS = [
  { id: "home", href: "/anasayfa", Icon: Home, label: "nav.home" },
  { id: "calendar", href: "/takvim", Icon: Calendar, label: "nav.calendar" },
  { id: "users", href: "/topluluk", Icon: Users, label: "nav.community" },
  { id: "charts", href: "/analiz", Icon: BarChart2, label: "nav.analytics" },
  { id: "messages", href: "/topluluk", Icon: MessageCircle, label: "nav.bond" },
  { id: "settings", href: "/ayarlar", Icon: Settings, label: "nav.settings" },
] as const;

export function CalendarTopBar() {
  const path = usePathname();
  const router = useRouter();
  const user = useSession();
  const notices = useApp((s) => s.notices);
  const markRead = useApp((s) => s.markNoticesRead);
  const unread = notices.filter((n) => n.userId === user?.id && !n.read).length;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-base px-6 lg:h-[68px] lg:px-8">
      <Link href="/anasayfa" className="flex items-center gap-2 text-[15px] font-medium lowercase tracking-wide">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-pink/20 text-xs text-pink">
          t
        </span>
        {t("brand.name")}
      </Link>

      <nav className="hidden items-center gap-2 md:flex">
        {ICONS.map((item) => {
          const active =
            item.id === "calendar"
              ? path === "/takvim" || path.startsWith("/takvim/")
              : item.id === "messages"
                ? false
                : path === item.href || path.startsWith(`${item.href}/`);
          const Icon = item.Icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={t(item.label)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                active ? "bg-white/10 text-ink" : "text-muted hover:bg-white/5 hover:text-ink"
              }`}
            >
              <Icon size={18} strokeWidth={1.75} />
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t("common.search")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-ink"
          onClick={() => window.dispatchEvent(new Event("tofiby:search"))}
        >
          <Search size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label={t("nav.community")}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-ink"
          onClick={() => {
            markRead();
            router.push("/topluluk");
          }}
        >
          <Bell size={18} strokeWidth={1.75} />
          {unread > 0 ? (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F87171]" />
          ) : null}
        </button>
        <span className="hidden h-8 w-px bg-white/10 sm:block" />
        <Link href="/profil" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-medium">
            {initials(user?.username ?? "T")}
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-medium text-ink">{user?.username ?? t("brand.name")}</span>
            <span className="block text-[11px] text-muted">{t("calendar.userRole")}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
