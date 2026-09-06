"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export type MascotMove = "glow" | "wobble" | "hop" | "peek" | "talk" | "shake" | "idle";

export function OnboardMascot({
  move,
  silhouette,
  leaving,
  children,
}: {
  move: MascotMove;
  silhouette?: boolean;
  leaving?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={`onboard-mascot ${leaving ? "" : `onboard-mascot-${move}`} ${silhouette && !leaving ? "onboard-silhouette" : ""}`}
      animate={leaving ? { y: -96, x: 56, opacity: 0, scale: 0.62, rotate: 8 } : { y: 0, x: 0, opacity: 1, scale: 1 }}
      transition={leaving ? { duration: 0.7, ease: [0.4, 0, 0.8, 0.2] } : { duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}
