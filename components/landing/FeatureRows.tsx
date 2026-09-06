"use client";

import { t } from "@/lib/i18n";
import { DeviceFrame } from "./DeviceFrame";
import { DemoCalendar, DemoChat, DemoFriend, DemoToday, DemoTogether } from "./DemoScreens";
import { useLandingDemo } from "./useLandingDemo";

export function FeatureRows() {
  const demo = useLandingDemo();
  const rows = [
    {
      id: "today",
      visual: <DemoToday today={demo.today} tasks={demo.tasks} onToggle={demo.toggle} compact />,
    },
    {
      id: "calendar",
      visual: (
        <DemoCalendar
          today={demo.today}
          tasks={demo.tasks}
          goals={demo.goals}
          cursor={demo.cursor}
          onCursor={demo.setCursor}
          onMove={demo.move}
          onSlot={demo.addSlot}
        />
      ),
    },
    {
      id: "friend",
      visual: <DemoFriend creature={demo.creature} compact />,
    },
    {
      id: "chat",
      visual: <DemoChat today={demo.today} onPlace={demo.place} compact />,
    },
    {
      id: "together",
      visual: <DemoTogether />,
    },
  ] as const;

  return (
    <div className="mt-28 space-y-28">
      {rows.map((row, i) => (
        <section
          key={row.id}
          className={`flex flex-col items-center gap-10 md:flex-row md:items-center md:gap-16 ${
            i % 2 === 1 ? "md:flex-row-reverse" : ""
          }`}
        >
          <div className="w-full md:w-1/2">
            <DeviceFrame compact>{row.visual}</DeviceFrame>
          </div>
          <div className="w-full md:w-1/2">
            <p className="text-xs uppercase tracking-[0.22em] text-faint">
              {t(`landing.feature.${row.id}.kicker`)}
            </p>
            <h3 className="mt-3 font-display text-3xl leading-tight md:text-4xl">
              {t(`landing.feature.${row.id}.title`)}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-muted">
              {t(`landing.feature.${row.id}.body`)}
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
