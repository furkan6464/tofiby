"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/lib/store";

export function ToastStack() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[90] flex w-[min(92vw,24rem)] -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            className="rounded-chip border border-white/10 bg-raised px-4 py-3 text-sm shadow-glow"
          >
            {toast.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
