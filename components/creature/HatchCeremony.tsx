"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { closeEyes, extraSparkle, halfEyes } from "@/data/creatures/parse";
import { getCreatureArt } from "@/data/creatures";
import { PixelSprite } from "./PixelSprite";
import { useActiveCreature, useApp } from "@/lib/store";
import { friendName, t } from "@/lib/i18n";
import { celebrate } from "@/lib/confetti";
import type { SpriteState } from "@/data/creatures/types";

type Beat = "egg" | "crack" | "flash" | "closed" | "opening" | "sparkle" | "name";

export function HatchCeremony() {
  const open = useApp((s) => s.pendingHatch);
  const dismiss = useApp((s) => s.dismissHatch);
  const mutation = useApp((s) => s.pendingMutation);
  const dismissMut = useApp((s) => s.dismissMutation);
  const creature = useActiveCreature();
  const [beat, setBeat] = useState<Beat>("egg");

  useEffect(() => {
    if (!open) {
      setBeat("egg");
      return;
    }
    const seq: { at: number; beat: Beat }[] = [
      { at: 0, beat: "egg" },
      { at: 700, beat: "crack" },
      { at: 1400, beat: "flash" },
      { at: 1800, beat: "closed" },
      { at: 2600, beat: "opening" },
      { at: 3400, beat: "sparkle" },
      { at: 4000, beat: "name" },
    ];
    const timers = seq.map(({ at, beat: b }) =>
      setTimeout(() => {
        setBeat(b);
            if (b === "name") celebrate(mutation ? "marry" : "hatch");
      }, at),
    );
    const done = setTimeout(() => {
      dismiss();
      if (mutation) dismissMut();
    }, 6200);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [open, dismiss, mutation, dismissMut]);

  if (!creature) return null;
  const name = friendName(creature.name);
  const art = getCreatureArt(
    creature.speciesId,
    beat === "egg" || beat === "crack" || beat === "flash" ? "egg" : "baby",
    creature.hueShift,
    creature.genetics,
  );
  let frames = art.frames;
  if (beat === "closed") {
    frames = { ...frames, idle: frames.idle.map(closeEyes) };
  } else if (beat === "opening") {
    frames = { ...frames, idle: frames.idle.map(halfEyes) };
  } else if (beat === "sparkle" || beat === "name") {
    frames = { ...frames, idle: frames.sparkle.length ? frames.sparkle : frames.idle.map(extraSparkle) };
  }

  const spriteState: SpriteState =
    beat === "crack" ? "crack" : beat === "sparkle" || beat === "name" ? "sparkle" : "idle";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07060B]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {beat === "flash" ? (
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0] }}
              transition={{ duration: 0.45 }}
            />
          ) : null}
          <PixelSprite
            frames={frames}
            palette={art.palette}
            pixelSize={9}
            state={spriteState}
          />
          {beat === "name" ? (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 font-display text-5xl text-ink"
            >
              {t("hatch.hello", { name })}
            </motion.p>
          ) : null}
          {mutation && (beat === "sparkle" || beat === "name") ? (
            <p className="mt-4 pixel-num text-[10px] text-pink">{t("mutation.banner")}</p>
          ) : null}
          {creature.rareMutation && beat === "name" ? (
            <p className="mt-2 text-xs text-violet">{t("mutation.badge")}</p>
          ) : null}
          <button className="mt-10 text-sm text-faint" onClick={dismiss}>
            {t("common.continue")}
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
