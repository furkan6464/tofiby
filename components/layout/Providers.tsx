"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useActiveCreature, useApp, useSession, useTodayBundle } from "@/lib/store";
import { todayKey } from "@/lib/dates";
import { collectInboxNotices } from "@/lib/smartNotices";
import { friendName } from "@/lib/i18n";
import { ToastStack } from "../ui/ToastStack";
import { HatchCeremony } from "../creature/HatchCeremony";
import { TogetherCeremony } from "../creature/TogetherCeremony";
import { LetterMoment } from "../creature/LetterMoment";
import { AppShell } from "./AppShell";

const queryClient = new QueryClient();
const PUBLIC = new Set(["/", "/giris", "/kayit"]);

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(useApp.persist.rehydrate()).finally(() => {
      if (cancelled) return;
      useApp.getState().setHydrated(true);
      useApp.getState().finalizePending();
      void useApp.getState().bootCloud();
      setReady(true);
    });
    const onVis = () => {
      if (document.visibilityState === "visible") {
        useApp.getState().finalizePending();
        void useApp.getState().syncCloudSocial();
      }
    };
    const onOnline = () => useApp.getState().flushOffline();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    const tick = window.setInterval(() => {
      void useApp.getState().syncCloudSocial();
    }, 20000);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.clearInterval(tick);
    };
  }, []);

  if (!ready) {
    return <div className="min-h-dvh bg-base" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Gate>{children}</Gate>
      <ToastStack />
    </QueryClientProvider>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const user = useSession();
  const creature = useActiveCreature();
  const theme = user?.theme ?? "ink";
  const needsOnboarding = Boolean(user && (!user.onboarded || !creature));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (PUBLIC.has(path)) return;
    if (!user) {
      router.replace("/giris");
      return;
    }
    if (needsOnboarding && path !== "/onboarding") {
      router.replace("/onboarding");
    }
    if (!needsOnboarding && path === "/onboarding") {
      router.replace("/anasayfa");
    }
  }, [path, user, needsOnboarding, router]);

  const appChrome = Boolean(user && !needsOnboarding) && !PUBLIC.has(path) && path !== "/onboarding";

  return (
    <>
      {appChrome ? <AppShell>{children}</AppShell> : children}
      <ReminderWatcher />
      <HatchCeremony />
      <TogetherCeremony />
      <LetterMoment />
    </>
  );
}

function ReminderWatcher() {
  const user = useSession();
  const creature = useActiveCreature();
  const { date } = useTodayBundle();
  const tasks = useApp((s) => s.tasks);
  const busy = useApp((s) => s.busySlots);
  const goals = useApp((s) => s.goals);
  const pushNotice = useApp((s) => s.pushNotice);

  useEffect(() => {
    if (!user || !date) return;
    const tick = () => {
      const drafts = collectInboxNotices({
        userId: user.id,
        timezone: user.timezone,
        today: todayKey(user.timezone),
        tasks,
        busy,
        goals,
        friendName: friendName(creature?.name),
      });
      for (const item of drafts) {
        const added = pushNotice(item);
        if (!added || typeof Notification === "undefined" || Notification.permission !== "granted") continue;
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "notify",
            title: item.title,
            body: item.body,
          });
        } else {
          new Notification(item.title, { body: item.body });
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [user, creature, date, tasks, busy, goals, pushNotice]);

  return null;
}
