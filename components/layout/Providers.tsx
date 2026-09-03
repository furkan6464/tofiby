"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp, useSession } from "@/lib/store";
import { ToastStack } from "../ui/ToastStack";
import { CreatureWidget } from "../creature/CreatureWidget";
import { HatchCeremony } from "../creature/HatchCeremony";
import { Nav } from "./Nav";

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
    document.addEventListener("visibilitychange", onVis);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => document.removeEventListener("visibilitychange", onVis);
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
      {appChrome ? <Nav /> : null}
      <div className={appChrome ? "pt-10 md:pl-[13.5rem] md:pt-0" : ""}>{children}</div>
      {appChrome ? <CreatureWidget /> : null}
      <HatchCeremony />
    </>
  );
}
