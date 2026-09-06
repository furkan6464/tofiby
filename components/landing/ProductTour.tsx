"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { DeviceFrame } from "./DeviceFrame";
import { DemoCalendar, DemoChat, DemoFriend, DemoToday } from "./DemoScreens";
import { useLandingDemo } from "./useLandingDemo";

const TABS = ["today", "calendar", "friend", "chat"] as const;
type Tab = (typeof TABS)[number];

export function ProductTour() {
  const demo = useLandingDemo();
  const [tab, setTab] = useState<Tab>("today");
  return (
    <section className="mt-28">
      <p className="text-xs uppercase tracking-[0.22em] text-faint">{t("landing.tourKicker")}</p>
      <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">{t("landing.tourTitle")}</h2>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{t("landing.tourLede")}</p>
      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3.5 py-1.5 text-sm ${
              tab === id ? "bg-pink text-base" : "bg-raised text-muted hover:text-ink"
            }`}
          >
            {t(`landing.tab.${id}`)}
          </button>
        ))}
      </div>
      <div className="mx-auto mt-6 max-w-3xl">
        <DeviceFrame>
          {tab === "today" ? (
            <DemoToday today={demo.today} tasks={demo.tasks} onToggle={demo.toggle} />
          ) : null}
          {tab === "calendar" ? (
            <DemoCalendar
              today={demo.today}
              tasks={demo.tasks}
              goals={demo.goals}
              cursor={demo.cursor}
              onCursor={demo.setCursor}
              onMove={demo.move}
              onSlot={demo.addSlot}
            />
          ) : null}
          {tab === "friend" ? <DemoFriend creature={demo.creature} /> : null}
          {tab === "chat" ? <DemoChat today={demo.today} onPlace={demo.place} /> : null}
        </DeviceFrame>
      </div>
    </section>
  );
}
