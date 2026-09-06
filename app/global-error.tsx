"use client";

import { t } from "@/lib/i18n";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="tr">
      <body className="min-h-dvh bg-[#07060b] text-[#f5f3fa]">
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5">
          <h1 className="text-3xl font-semibold">{t("auth.errorGeneric")}</h1>
          <button
            type="button"
            className="mt-8 rounded-full bg-[#ff3e9e] px-4 py-2.5 text-sm font-medium text-[#07060b]"
            onClick={() => reset()}
          >
            {t("common.retry")}
          </button>
        </main>
      </body>
    </html>
  );
}
