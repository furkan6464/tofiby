"use client";

import { usePathname } from "next/navigation";
import { DesktopNav, MobileTabs } from "./Nav";
import { CreatureBar, CreatureRail } from "../creature/CreatureWidget";
import { CommandPalette } from "../search/CommandPalette";
import { CalendarTopBar } from "../calendar/CalendarTopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const calendar = path === "/takvim" || path.startsWith("/takvim/");

  return (
    <>
      {calendar ? (
        <div className="hidden h-dvh flex-col lg:flex">
          <CalendarTopBar />
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      ) : (
        <div className="hidden min-h-dvh lg:flex">
          <DesktopNav />
          <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
          <CreatureRail />
        </div>
      )}
      <div className="min-h-dvh lg:hidden">
        {calendar ? <CalendarTopBar /> : <CreatureBar />}
        <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))]">{children}</div>
        <MobileTabs />
      </div>
      <CommandPalette />
    </>
  );
}
