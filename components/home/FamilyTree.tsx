"use client";

import { useState } from "react";
import { CreatureView } from "@/components/creature/CreatureView";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { friendName, t } from "@/lib/i18n";
import { diffDays, prettyDate } from "@/lib/dates";
import { todayKey } from "@/lib/dates";
import type { Creature } from "@/lib/types";
import { useSession } from "@/lib/store";

export function FamilyTree({ creatures }: { creatures: Creature[] }) {
  const user = useSession();
  const today = user ? todayKey(user.timezone) : "";
  const [open, setOpen] = useState<Creature | null>(null);
  if (creatures.length === 0) return null;
  const roots = creatures.filter((c) => !c.parentAId && !c.parentBId);
  const kidsOf = (id: string) =>
    creatures.filter((c) => c.parentAId === id || c.parentBId === id);
  const siblings = (c: Creature) =>
    creatures.filter(
      (x) =>
        x.id !== c.id &&
        ((c.parentAId && x.parentAId === c.parentAId) ||
          (c.parentBId && x.parentBId === c.parentBId)),
    );

  function Node({ c }: { c: Creature }) {
    const kids = kidsOf(c.id);
    return (
      <div className="flex flex-col items-center">
        <button onClick={() => setOpen(c)} className="text-center">
          <CreatureView
            speciesId={c.speciesId}
            stage={c.stage === "egg" ? "egg" : c.stage}
            hueShift={c.hueShift}
            genetics={c.genetics}
            pixelSize={3}
          />
          <p className="mt-1 text-sm">{friendName(c.name)}</p>
          <p className="text-[10px] text-faint">
            {t("family.gen", { n: c.generation ?? 1 })}
            {c.rareMutation ? ` · ${t("mutation.badge")}` : ""}
          </p>
        </button>
        {kids.length ? (
          <div className="mt-4 flex flex-wrap justify-center gap-6 border-t border-white/10 pt-4">
            {kids.map((k) => (
              <Node key={k.id} c={k} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const lived = open
    ? diffDays(open.createdAt, open.retiredAt ?? today)
    : 0;

  return (
    <div>
      <div className="flex flex-col items-center gap-8 overflow-x-auto py-4">
        {(roots.length ? roots : creatures).map((c) => (
          <Node key={c.id} c={c} />
        ))}
      </div>
      <Modal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? friendName(open.name) : ""}
      >
        {open ? (
          <div className="space-y-3 text-sm text-muted">
            <p>
              {t("family.card", {
                name: friendName(open.name),
                date: prettyDate(open.createdAt),
                days: lived,
                gen: open.generation ?? 1,
              })}
            </p>
            {siblings(open).length ? (
              <p>
                {t("family.siblings")}:{" "}
                {siblings(open)
                  .map((s) => friendName(s.name))
                  .join(", ")}
              </p>
            ) : null}
            {open.letters.map((l) => (
              <Card key={l.milestone} className="p-3">
                <p className="font-display text-lg">{t(`letter.${l.milestone}`)}</p>
                <p className="text-xs text-faint">{prettyDate(l.at.slice(0, 10))}</p>
              </Card>
            ))}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
