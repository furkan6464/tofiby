"use client";

import Link from "next/link";
import { t } from "@/lib/i18n";
import { useSession } from "@/lib/store";
import { CreatureView } from "@/components/creature/CreatureView";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import { starterSpecies } from "@/data/species/catalog";

export default function LandingPage() {
  const user = useSession();
  return (
    <main className="relative mx-auto min-h-dvh max-w-6xl overflow-hidden px-5 pb-16 pt-8">
      <header className="flex items-center justify-between">
        <p className="font-display text-2xl">{t("brand.name")}</p>
        <Link href={user ? "/anasayfa" : "/giris"} className="text-sm text-muted">
          {user ? t("nav.home") : t("landing.ctaLogin")}
        </Link>
      </header>

      <section className="mt-16 grid items-end gap-10 md:mt-24 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-faint">
            {t("landing.kicker")}
          </p>
          <h1 className="mt-4 max-w-xl whitespace-pre-line font-display text-5xl leading-[1.05] md:text-6xl">
            {t("landing.headline")}
          </h1>
          <p className="mt-6 max-w-md text-muted">{t("landing.lede")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={user?.onboarded ? "/anasayfa" : "/kayit"}>
              <Button>{t("landing.ctaStart")}</Button>
            </Link>
            <Link href="/giris" className="text-sm text-violet">
              {t("landing.ctaLogin")}
            </Link>
          </div>
        </div>
        <div className="relative md:-mb-6 md:justify-self-end">
          <div className="rounded-nest border border-white/[0.06] bg-surface px-6 pb-4 pt-6">
            <CreatureView
              speciesId="tofiby"
              stage="adult"
              hueShift={330}
              pixelSize={5}
              state="idle"
            />
            <p className="mt-2 text-center text-xs text-faint">{t("landing.footerNote")}</p>
          </div>
        </div>
      </section>

      <section className="mt-24">
        <h2 className="font-display text-3xl">{t("landing.howTitle")}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((n, i) => (
            <Card
              key={n}
              className={`p-5 ${i === 1 ? "md:mt-8" : ""} ${i === 3 ? "md:mt-4" : ""}`}
            >
              <p className="pixel-num text-[10px] text-pink">0{n}</p>
              <h3 className="mt-3 font-display text-xl">
                {t(`landing.how${n}Title`)}
              </h3>
              <p className="mt-2 text-sm text-muted">{t(`landing.how${n}Body`)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <Card raised className="p-6">
          <h2 className="font-display text-2xl">{t("landing.mathTitle")}</h2>
          <p className="mt-3 text-sm text-muted">{t("landing.mathBody")}</p>
        </Card>
        <div>
          <h2 className="font-display text-2xl">{t("landing.speciesTitle")}</h2>
          <p className="mt-2 text-sm text-faint">{t("landing.speciesHint")}</p>
          <div className="mt-5 flex flex-wrap gap-4">
            {starterSpecies().map((id, i) => (
              <div
                key={id}
                className={`rounded-panel bg-surface p-3 ${i === 2 ? "mt-5" : ""}`}
              >
                <CreatureView speciesId={id} stage="egg" hueShift={0} pixelSize={3} />
                <p className="mt-1 text-center text-xs text-muted">{t(`species.${id}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
