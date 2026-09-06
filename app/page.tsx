"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { demoCreature, demoToday } from "@/lib/landingDemo";
import { useSession } from "@/lib/store";
import { CreatureView } from "@/components/creature/CreatureView";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EggRevealCard } from "@/components/landing/EggRevealCard";
import { FeatureRows } from "@/components/landing/FeatureRows";
import { ProductTour } from "@/components/landing/ProductTour";
import { SparkleField } from "@/components/landing/SparkleField";
import { starterSpecies } from "@/data/species/catalog";
import type { SpeciesId } from "@/lib/types";

export default function LandingPage() {
  const user = useSession();
  const startHref = user?.onboarded ? "/anasayfa" : "/kayit";
  const [openEggs, setOpenEggs] = useState<Partial<Record<SpeciesId, boolean>>>({});
  const hero = useMemo(() => demoCreature(demoToday()), []);

  return (
    <main className="relative mx-auto min-h-dvh max-w-6xl overflow-hidden px-5 pb-10 pt-8">
      <header className="flex items-center justify-between">
        <p className="font-display text-2xl">{t("brand.name")}</p>
        <Link href={user ? "/anasayfa" : "/giris"} className="text-sm text-muted">
          {user ? t("nav.home") : t("landing.ctaLogin")}
        </Link>
      </header>

      <section className="relative mt-16 grid items-end gap-10 md:mt-20 md:grid-cols-[1.1fr_0.9fr]">
        <SparkleField />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.22em] text-faint">{t("landing.kicker")}</p>
          <h1 className="mt-4 max-w-xl whitespace-pre-line font-display text-5xl leading-[1.05] md:text-6xl">
            {t("landing.headline")}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">{t("landing.lede")}</p>
          <div className="mt-8">
            <Link href={startHref}>
              <Button>{t("landing.ctaStart")}</Button>
            </Link>
          </div>
        </div>
        <div className="relative md:-mb-2 md:justify-self-end">
          <div className="rounded-nest border border-white/[0.06] bg-surface px-8 pb-5 pt-7">
            <CreatureView
              speciesId={hero.speciesId}
              stage="baby"
              hueShift={hero.hueShift}
              genetics={hero.genetics}
              pixelSize={7}
              state="idle"
            />
          </div>
        </div>
      </section>

      <ProductTour />

      <section className="mt-28">
        <h2 className="font-display text-4xl leading-tight md:text-5xl">{t("landing.howTitle")}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="p-5">
              <p className="pixel-num text-[10px] text-pink">0{n}</p>
              <h3 className="mt-3 font-display text-xl">{t(`landing.how${n}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(`landing.how${n}Body`)}</p>
            </Card>
          ))}
        </div>
      </section>

      <FeatureRows />

      <section className="mt-28">
        <Card raised className="p-8 md:p-10">
          <h2 className="font-display text-4xl leading-tight md:text-5xl">{t("landing.mathTitle")}</h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">{t("landing.mathBody")}</p>
        </Card>
      </section>

      <section className="mt-28">
        <h2 className="font-display text-4xl leading-tight md:text-5xl">{t("landing.speciesTitle")}</h2>
        <p className="mt-3 text-base text-muted">{t("landing.speciesSub")}</p>
        <p className="mt-2 text-sm text-faint">{t("landing.speciesHint")}</p>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 justify-items-center gap-8 sm:grid-cols-3">
          {starterSpecies().map((id) => (
            <EggRevealCard
              key={id}
              id={id}
              size="lg"
              open={Boolean(openEggs[id])}
              onToggle={() => setOpenEggs((cur) => ({ ...cur, [id]: !cur[id] }))}
            />
          ))}
        </div>
      </section>

      <section className="mt-28 rounded-nest border border-white/[0.06] bg-surface px-6 py-16 text-center md:px-12">
        <h2 className="font-display text-5xl leading-tight md:text-6xl">{t("landing.closeTitle")}</h2>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted">{t("landing.closeLede")}</p>
        <div className="mt-8">
          <Link href={startHref}>
            <Button>{t("landing.ctaStart")}</Button>
          </Link>
        </div>
      </section>

      <footer className="mt-20 flex flex-col items-center gap-4 border-t border-white/[0.06] py-10 text-sm text-faint">
        <p className="font-display text-lg text-muted">{t("brand.name")}</p>
        <nav className="flex gap-5">
          <Link href="/gizlilik" className="hover:text-ink">
            {t("landing.footerPrivacy")}
          </Link>
          <Link href="/iletisim" className="hover:text-ink">
            {t("landing.footerContact")}
          </Link>
        </nav>
        <p>{t("landing.footerCopy", { year: new Date().getFullYear() })}</p>
      </footer>
    </main>
  );
}
