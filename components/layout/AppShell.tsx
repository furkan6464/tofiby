"use client";

import { DesktopNav, MobileTabs } from "./Nav";
import { CreatureBar, CreatureRail } from "../creature/CreatureWidget";
import { CommandPalette } from "../search/CommandPalette";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="hidden min-h-dvh lg:flex">
        <DesktopNav />
        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
        <CreatureRail />
      </div>
      <div className="min-h-dvh lg:hidden">
        <CreatureBar />
        <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))]">{children}</div>
        <MobileTabs />
      </div>
      <CommandPalette />
    </>
  );
}
