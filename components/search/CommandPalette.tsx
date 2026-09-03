"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { addDays, prettyDate, todayKey } from "@/lib/dates";
import { useActiveCreature, useApp, useSession } from "@/lib/store";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const user = useSession();
  const tasks = useApp((s) => s.tasks);
  const goals = useApp((s) => s.goals);
  const creature = useActiveCreature();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "Escape") setOpen(false);
      if (typing) return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const today = user ? todayKey(user.timezone) : "";
  const q = query.trim().toLowerCase();
  const hits = useMemo(() => {
    if (!user) return [];
    const out: { key: string; label: string; href: string; kind: string }[] = [];
    if (creature?.name && creature.name.toLowerCase().includes(q || creature.name.toLowerCase())) {
      if (!q || creature.name.toLowerCase().includes(q)) {
        out.push({
          key: "friend",
          kind: t("search.friend"),
          label: creature.name,
          href: "/yaratigim",
        });
      }
    }
    for (const g of goals.filter((g) => g.userId === user.id)) {
      if (q && !g.title.toLowerCase().includes(q)) continue;
      out.push({
        key: `g-${g.id}`,
        kind: t("search.goal"),
        label: g.title,
        href: `/hedeflerim/${g.id}`,
      });
    }
    for (const task of tasks.filter((x) => x.userId === user.id)) {
      if (q && !task.title.toLowerCase().includes(q) && !task.date.includes(q)) continue;
      out.push({
        key: `t-${task.id}`,
        kind: t("search.task"),
        label: `${task.title} · ${task.date}`,
        href: `/takvim?d=${task.date}`,
      });
      if (out.length > 24) break;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(q)) {
      out.unshift({
        key: "date",
        kind: t("search.date"),
        label: prettyDate(q),
        href: `/takvim?d=${q}`,
      });
    }
    if (q === "bugün" || q === "today") {
      out.unshift({
        key: "today",
        kind: t("search.date"),
        label: prettyDate(today),
        href: "/anasayfa",
      });
    }
    if (!q) {
      out.unshift({
        key: "tomorrow",
        kind: t("search.date"),
        label: prettyDate(addDays(today, 1)),
        href: `/takvim?d=${addDays(today, 1)}`,
      });
    }
    return out.slice(0, 12);
  }, [user, q, goals, tasks, creature, today]);

  if (!open || !user) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 pt-[15vh]">
      <div className="w-[min(32rem,92vw)] rounded-nest border border-white/[0.06] bg-surface p-3">
        <p className="px-2 pb-2 text-xs text-faint">{t("search.title")}</p>
        <input
          autoFocus
          className="w-full px-3 py-2"
          placeholder={t("common.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && hits[0]) {
              router.push(hits[0].href);
              setOpen(false);
              setQuery("");
            }
          }}
        />
        <div className="mt-2 max-h-72 overflow-y-auto">
          {hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-faint">{t("search.empty")}</p>
          ) : (
            hits.map((h) => (
              <button
                key={h.key}
                className="block w-full rounded-chip px-3 py-2 text-left text-sm hover:bg-raised"
                onClick={() => {
                  router.push(h.href);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="text-[10px] text-faint">{h.kind}</span>
                <span className="ml-2">{h.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
