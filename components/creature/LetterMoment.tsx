"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CreatureView } from "./CreatureView";
import { useActiveCreature, useApp } from "@/lib/store";
import { friendName, t } from "@/lib/i18n";
import { prettyDate } from "@/lib/dates";

export function LetterMoment() {
  const letter = useApp((s) => s.pendingLetter);
  const dismiss = useApp((s) => s.dismissLetter);
  const creature = useActiveCreature();
  if (!creature) return null;
  return (
    <AnimatePresence>
      {letter ? (
        <motion.div
          className="fixed inset-0 z-[92] flex items-center justify-center bg-black/70 p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-full max-w-sm rounded-nest border border-white/10 bg-surface p-6 text-center">
            <CreatureView
              speciesId={creature.speciesId}
              stage={creature.stage}
              hueShift={creature.hueShift}
              genetics={creature.genetics}
              pixelSize={4}
            />
            <p className="mt-5 font-display text-2xl">
              {t(`letter.${letter.milestone}`)}
            </p>
            <p className="mt-2 text-sm text-faint">
              {friendName(creature.name)} · {prettyDate(letter.at.slice(0, 10))}
            </p>
            <button className="mt-6 text-sm text-violet" onClick={dismiss}>
              {t("common.continue")}
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
