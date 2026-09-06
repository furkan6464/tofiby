"use client";

import { motion } from "framer-motion";

export function SpeechBubble({ text, side = "down" }: { text: string; side?: "down" | "left" }) {
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, scale: 0.72, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}
      className={`speech-bubble ${side === "left" ? "speech-bubble-side" : ""}`}
    >
      <p className="text-sm leading-relaxed text-[#1a1224] sm:text-[15px]">{text}</p>
    </motion.div>
  );
}
