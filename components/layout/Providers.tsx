"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp, useSession, useTodayBundle } from "@/lib/store";
import { todayKey } from "@/lib/dates";
import { reminderPayloads } from "@/lib/reminders";
import { t } from "@/lib/i18n";
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
    useApp.persist.rehydrate();
    useApp.getState().setHydrated(true);
    useApp.getState().finalizePending();
    setReady(true);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        useApp.getState().finalizePending();
      }
    };
    const onOnline = () => useApp.getState().flushOffline();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
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
  const theme = user?.theme ?? "ink";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (PUBLIC.has(path)) return;
    if (!user) {
      router.replace("/giris");
      return;
    }
    if (!user.onboarded && path !== "/onboarding") {
      router.replace("/onboarding");
    }
    if (user.onboarded && path === "/onboarding") {
      router.replace("/anasayfa");
    }
  }, [path, user, router]);

  const appChrome = Boolean(user?.onboarded) && !PUBLIC.has(path) && path !== "/onboarding";

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
  const { tasks, date } = useTodayBundle();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!user || !date) return;
    const tick = () => {
      const due = reminderPayloads({
        tasks,
        timezone: user.timezone,
        today: todayKey(user.timezone),
        seen: seen.current,
      });
      for (const item of due) {
        seen.current.add(item.key);
        const body =
          item.body.kind === "soon"
            ? t("remind.soon", { task: item.body.task ?? "" })
            : item.body.kind === "now"
              ? t("remind.now", { task: item.body.task ?? "" })
              : t("remind.streak", { need: item.body.need ?? 0 });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          if (navigator.serviceWorker?.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: "notify",
              title: item.title,
              body,
            });
          } else {
            new Notification(item.title, { body });
          }
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [user, tasks, date]);

  return null;
}
