"use client";

import { CreatureView } from "./CreatureView";
import type { Creature } from "@/lib/types";
import { t } from "@/lib/i18n";

const ITEM_POS: Record<string, string> = {
  plant: "left-3 bottom-8",
  bookshelf: "right-4 top-8",
  bed: "left-8 bottom-4",
  photo: "right-10 top-4",
  desk: "right-6 bottom-6",
  toy: "left-16 bottom-6",
};

export function FriendRoom({
  creature,
  items,
}: {
  creature: Creature;
  items: string[];
}) {
  return (
    <div className="relative mx-auto h-56 w-full max-w-md overflow-hidden rounded-nest border border-white/[0.06] bg-[#1a1524]">
      <div className="absolute inset-x-0 top-0 h-24 bg-[#2a2038]" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-[#15111c]" />
      <div className="absolute inset-x-6 top-10 h-[2px] bg-white/10" />
      {items.map((id) => (
        <div
          key={id}
          className={`absolute ${ITEM_POS[id] ?? "bottom-8 left-8"} rounded-[3px] px-1.5 py-1 text-[9px] text-faint`}
          style={{
            background:
              id === "plant"
                ? "#2d6a4f"
                : id === "bed"
                  ? "#5b3a6e"
                  : id === "photo"
                    ? "#c43fc7"
                    : "#3b2a45",
          }}
          title={t(`room.${id}`)}
        >
          {t(`room.${id}`)}
        </div>
      ))}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
        <CreatureView
          speciesId={creature.speciesId}
          stage={creature.stage}
          hueShift={creature.hueShift}
          genetics={creature.genetics}
          pixelSize={4}
          state={creature.health === "sick" ? "sick" : "idle"}
        />
      </div>
    </div>
  );
}
