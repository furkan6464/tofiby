"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, X } from "lucide-react";
import { friendName, t } from "@/lib/i18n";
import { openAiChat } from "@/lib/ai";
import { useActiveCreature } from "@/lib/store";
import { CreatureView } from "@/components/creature/CreatureView";
import { AiChatOrb } from "@/components/ai/AiChatOrb";
import { AppTools } from "./AppTools";
import { ACCOUNT, CREATURE, PRODUCTIVITY, parentPath, titleKeyForPath } from "./navLinks";

function active(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

export function MobileTopBar() {
  const path = usePathname();
  const creature = useActiveCreature();
  const [open, setOpen] = useState(false);
  const back = parentPath(path);
  const title =
    path.startsWith("/yaratigim") && creature?.name
      ? friendName(creature.name)
      : t(titleKeyForPath(path));

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-white/[0.06] bg-base/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
        <button
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-white/5 hover:text-ink"
          aria-label={t("nav.menu")}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>
        {back ? (
          <Link
            href={back}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-white/5 hover:text-ink"
            aria-label={t("common.back")}
          >
            <ArrowLeft size={20} />
          </Link>
        ) : null}
        <p className="min-w-0 flex-1 truncate font-display text-lg">{title}</p>
        <AppTools />
        {creature ? (
          <AiChatOrb
            size="sm"
            speciesId={creature.speciesId}
            stage={creature.stage}
            hueShift={creature.hueShift}
            genetics={creature.genetics}
            onClick={() => openAiChat()}
          />
        ) : null}
      </header>

      {open ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col overflow-y-auto border-r border-white/[0.06] bg-base px-4 pb-[env(safe-area-inset-bottom)] pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl">{t("brand.name")}</p>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-white/5 hover:text-ink"
                aria-label={t("common.close")}
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {creature ? (
              <Link
                href="/yaratigim"
                onClick={() => setOpen(false)}
                className="mt-6 flex items-center gap-3 rounded-2xl bg-raised px-3 py-3"
              >
                <CreatureView
                  speciesId={creature.speciesId}
                  stage={creature.stage}
                  hueShift={creature.hueShift}
                  genetics={creature.genetics}
                  pixelSize={2}
                  state="idle"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{friendName(creature.name)}</span>
                  <span className="block text-[11px] text-faint">{t("nav.growth")}</span>
                </span>
              </Link>
            ) : null}

            <p className="mt-8 px-1 text-[10px] uppercase tracking-wide text-faint">
              {t("nav.productivity")}
            </p>
            <nav className="mt-2 flex flex-col gap-1">
              {PRODUCTIVITY.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-chip px-3 py-3 text-sm ${
                    active(path, item.href) ? "bg-raised text-ink" : "text-muted"
                  }`}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>

            <p className="mt-8 px-1 text-[10px] uppercase tracking-wide text-faint">
              {t("nav.creatureCol")}
            </p>
            <nav className="mt-2 flex flex-col gap-1">
              {CREATURE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-chip px-3 py-3 text-sm ${
                    active(path, item.href) ? "bg-raised text-ink" : "text-muted"
                  }`}
                >
                  {item.href === "/yaratigim" ? friendName(creature?.name) : t(item.key)}
                </Link>
              ))}
            </nav>

            <nav className="mt-auto flex flex-col gap-1 pt-8">
              {ACCOUNT.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-chip px-3 py-3 text-sm ${
                    active(path, item.href) ? "bg-raised text-ink" : "text-muted"
                  }`}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
