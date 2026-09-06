"use client";

import { speciesHue } from "@/data/species/catalog";
import type { SpeciesId } from "@/lib/types";
import { t } from "@/lib/i18n";
import { CreatureView } from "@/components/creature/CreatureView";

export function EggRevealCard({
  id,
  open,
  onToggle,
  size = "md",
}: {
  id: SpeciesId;
  open: boolean;
  onToggle: () => void;
  size?: "md" | "lg";
}) {
  const hue = speciesHue(id);
  const px = size === "lg" ? 4 : 3;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={open}
      aria-label={t("landing.flipAria", {
        name: t(`species.${id}`),
        stage: t(open ? "stage.baby" : "stage.egg"),
      })}
      className={`egg-reveal ${size === "lg" ? "egg-reveal-lg" : ""} ${open ? "is-open" : ""}`}
    >
      <span className={`egg-reveal-inner ${open ? "is-flipped" : ""}`}>
        <span className="egg-reveal-face">
          <CreatureView speciesId={id} stage="egg" hueShift={hue} pixelSize={px} />
        </span>
        <span className="egg-reveal-face egg-reveal-back">
          <CreatureView
            speciesId={id}
            stage="baby"
            hueShift={hue}
            pixelSize={px}
            state="sparkle"
          />
        </span>
      </span>
      <span className="mt-1 text-center text-xs text-muted">{t(`species.${id}`)}</span>
    </button>
  );
}
