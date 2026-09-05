"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DesktopNav, MobileTabs } from "./Nav";
import { AiRailDock, CreatureBar, CreatureRail } from "../creature/CreatureWidget";
import { CommandPalette } from "../search/CommandPalette";
import { CalendarTopBar } from "../calendar/CalendarTopBar";
import { AiConsentHost } from "../ai/AiConsent";
import { FriendChatHost } from "../ai/FriendChat";

const NAV_OPEN_KEY = "tofiby-nav-open";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const calendar = path === "/takvim" || path.startsWith("/takvim/");
  const [navOpen, setNavOpen] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(NAV_OPEN_KEY) === "0") setNavOpen(false);
  }, []);

  const toggleNav = () => {
    setNavOpen((open) => {
      const next = !open;
      localStorage.setItem(NAV_OPEN_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <>
      {calendar ? (
        <div className="hidden h-dvh flex-col lg:flex">
          <CalendarTopBar />
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      ) : (
        <div className="hidden h-dvh overflow-hidden lg:flex">
          <DesktopNav collapsed={!navOpen} onToggle={toggleNav} />
          <div
            className={`min-h-0 min-w-0 flex-1 overflow-y-auto ${
              navOpen ? "" : "[&_main]:!max-w-none"
            }`}
          >
            {children}
          </div>
          <AiRailDock />
          <CreatureRail />
        </div>
      )}
      <div className="min-h-dvh lg:hidden">
        {calendar ? <CalendarTopBar /> : <CreatureBar />}
        <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))]">{children}</div>
        <MobileTabs />
      </div>
      <FriendChatHost />
      <AiConsentHost />
      <CommandPalette />
    </>
  );
}
