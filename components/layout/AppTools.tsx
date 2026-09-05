"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Timer } from "lucide-react";
import { t } from "@/lib/i18n";
import { useApp, useSession } from "@/lib/store";
import { openFocus } from "@/components/focus/FocusSession";

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-ink"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function SearchButton() {
  return (
    <IconBtn label={t("common.search")} onClick={() => window.dispatchEvent(new Event("tofiby:search"))}>
      <Search size={18} strokeWidth={1.75} />
    </IconBtn>
  );
}

export function NoticeBell() {
  const user = useSession();
  const router = useRouter();
  const notices = useApp((s) => s.notices);
  const markRead = useApp((s) => s.markNoticesRead);
  const markOne = useApp((s) => s.markNoticeRead);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const mine = notices
    .filter((n) => n.userId === user?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 16);
  const unread = mine.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <IconBtn
        label={t("community.notices")}
        onClick={() => {
          setOpen((v) => !v);
          if (typeof Notification !== "undefined" && Notification.permission === "default") {
            void Notification.requestPermission();
          }
        }}
      >
        <Bell size={18} strokeWidth={1.75} />
        {unread > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F87171]" /> : null}
      </IconBtn>
      {open ? (
        <div className="absolute right-0 z-[80] mt-2 w-[min(92vw,20rem)] overflow-hidden rounded-2xl border border-white/[0.08] bg-surface shadow-glow">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <p className="text-sm">{t("community.notices")}</p>
            {unread > 0 ? (
              <button type="button" className="text-[11px] text-violet" onClick={() => markRead()}>
                {t("common.done")}
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {mine.length === 0 ? (
              <p className="px-3 py-6 text-sm text-faint">{t("community.noticeEmpty")}</p>
            ) : (
              mine.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`block w-full px-3 py-2.5 text-left ${n.read ? "text-faint" : "text-ink"}`}
                  onClick={() => {
                    markOne(n.id);
                    setOpen(false);
                    if (n.href) router.push(n.href);
                  }}
                >
                  <p className="text-sm">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-[11px] text-muted">{n.body}</p> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FocusButton() {
  return (
    <IconBtn label={t("focus.timer")} onClick={() => openFocus()}>
      <Timer size={18} strokeWidth={1.75} />
    </IconBtn>
  );
}

export function AppTools({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <SearchButton />
      <FocusButton />
      <NoticeBell />
    </div>
  );
}
