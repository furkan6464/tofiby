"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  layer = "z-[70]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  layer?: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`fixed inset-0 ${layer} flex items-end justify-center p-4 sm:items-center`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className={`relative w-full rounded-nest border border-white/[0.06] bg-surface p-5 ${
              wide ? "max-w-lg" : "max-w-md"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl">{title}</h3>
              <button className="text-faint" onClick={onClose}>
                {t("common.close")}
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
