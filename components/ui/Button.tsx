"use client";

import type { ButtonHTMLAttributes } from "react";

type Tone = "primary" | "ghost" | "violet" | "danger";

export function Button({
  tone = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  const tones: Record<Tone, string> = {
    primary:
      "bg-pink text-base glow-hover disabled:opacity-40 disabled:shadow-none",
    ghost:
      "bg-raised text-ink border border-white/[0.06] hover:border-white/10",
    violet: "bg-violet text-base hover:shadow-glow-violet",
    danger: "bg-[#3a1420] text-[#ff8aa8]",
  };
  return (
    <button
      className={`pressable inline-flex items-center justify-center gap-2 rounded-chip px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
