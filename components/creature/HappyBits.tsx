"use client";

import { AnimatePresence, motion } from "framer-motion";

export function HappyBits({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show
        ? ["♥", "✦", "♥"].map((ch, i) => (
            <motion.span
              key={`${ch}-${i}`}
              initial={{ opacity: 0, y: 8, x: (i - 1) * 10 }}
              animate={{ opacity: 1, y: -28, x: (i - 1) * 14 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, delay: i * 0.05 }}
              className="pointer-events-none absolute left-1/2 top-2 text-[10px] text-pink"
            >
              {ch}
            </motion.span>
          ))
        : null}
    </AnimatePresence>
  );
}
