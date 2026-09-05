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
      <div
        className={
          calendar
            ? "flex h-dvh flex-col overflow-hidden"
            : "flex h-dvh flex-col overflow-hidden lg:flex-row"
        }
      >
        {calendar ? (
          <CalendarTopBar />
        ) : (
          <>
            <div className="hidden h-full lg:contents">
              <DesktopNav collapsed={!navOpen} onToggle={toggleNav} />
            </div>
            <div className="lg:hidden">
              <CreatureBar />
            </div>
          </>
        )}
        <div
          className={`min-h-0 min-w-0 flex-1 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0 ${
            calendar ? "overflow-hidden" : "overflow-y-auto"
          } ${!calendar && !navOpen ? "[&_main]:!max-w-none" : ""}`}
        >
          {children}
        </div>
        {calendar ? null : (
          <div className="hidden h-full lg:flex">
            <AiRailDock />
            <CreatureRail />
          </div>
        )}
        <MobileTabs />
      </div>
      <FriendChatHost />
      <AiConsentHost />
      <CommandPalette />
    </>
  );
}
