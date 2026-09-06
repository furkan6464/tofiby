"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DesktopNav } from "./Nav";
import { MobileTopBar } from "./MobileChrome";
import { AiRailDock, CreatureRail } from "../creature/CreatureWidget";
import { CommandPalette } from "../search/CommandPalette";
import { CalendarTopBar } from "../calendar/CalendarTopBar";
import { AppTools } from "./AppTools";
import { AiConsentHost } from "../ai/AiConsent";
import { FriendChatHost } from "../ai/FriendChat";
import { FocusHost } from "../focus/FocusSession";

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
        <div className="lg:hidden">
          <MobileTopBar />
        </div>
        {calendar ? (
          <div className="hidden lg:block">
            <CalendarTopBar />
          </div>
        ) : (
          <div className="hidden h-full lg:contents">
            <DesktopNav collapsed={!navOpen} onToggle={toggleNav} />
          </div>
        )}
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${
            calendar ? "overflow-hidden" : ""
          } ${!calendar && !navOpen ? "[&_main]:!max-w-none" : ""}`}
        >
          {calendar ? null : (
            <div className="hidden h-14 shrink-0 items-center justify-end border-b border-white/[0.06] bg-base px-5 lg:flex">
              <AppTools />
            </div>
          )}
          <div
            className={`min-h-0 flex-1 overflow-x-hidden ${
              calendar ? "overflow-hidden" : "overflow-y-auto pb-[env(safe-area-inset-bottom)]"
            }`}
          >
            {children}
          </div>
        </div>
        {calendar ? null : (
          <div className="hidden h-full lg:flex">
            <AiRailDock />
            <CreatureRail />
          </div>
        )}
      </div>
      <FriendChatHost />
      <AiConsentHost />
      <CommandPalette />
      <FocusHost />
    </>
  );
}
