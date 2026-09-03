"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CreatureView } from "./CreatureView";
import { useActiveCreature, useApp, useSession } from "@/lib/store";
import { t } from "@/lib/i18n";

export function TogetherCeremony() {
  const open = useApp((s) => s.pendingTogether);
  const dismiss = useApp((s) => s.dismissTogether);
  const mine = useActiveCreature();
  const user = useSession();
  const creatures = useApp((s) => s.creatures);
  const quests = useApp((s) => s.sharedQuests);
  const todayQuest = quests.filter((q) => q.fromUser === user?.id || q.toUser === user?.id).at(-1);
  const otherId =
    todayQuest && user
      ? todayQuest.fromUser === user.id
        ? todayQuest.toUser
        : todayQuest.fromUser
      : null;
  const other = creatures.find((c) => c.ownerId === otherId && c.status === "active");

  return (
    <AnimatePresence>
      {open && mine ? (
        <motion.div
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-[#07060B]/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <div className="flex items-end gap-6">
            <CreatureView
              speciesId={mine.speciesId}
              stage={mine.stage}
              hueShift={mine.hueShift}
              genetics={mine.genetics}
              pixelSize={5}
              state="happy"
            />
            {other ? (
              <CreatureView
                speciesId={other.speciesId}
                stage={other.stage}
                hueShift={other.hueShift}
                genetics={other.genetics}
                pixelSize={5}
                state="happy"
              />
            ) : null}
          </div>
          <p className="mt-6 font-display text-3xl">{t("together.done")}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
