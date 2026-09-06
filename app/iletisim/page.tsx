import Link from "next/link";
import { t } from "@/lib/i18n";

export default function ContactPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-16">
      <Link href="/" className="text-sm text-violet">
        {t("landing.legalBack")}
      </Link>
      <h1 className="mt-8 font-display text-4xl">{t("landing.contactTitle")}</h1>
      <p className="mt-5 text-base leading-relaxed text-muted">{t("landing.contactBody")}</p>
    </main>
  );
}
