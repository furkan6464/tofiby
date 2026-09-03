"use client";

import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5">
      <h1 className="font-display text-4xl">{t("auth.errorGeneric")}</h1>
      <Button className="mt-8" onClick={() => reset()}>
        {t("common.continue")}
      </Button>
    </main>
  );
}
