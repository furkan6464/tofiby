import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  raised = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { raised?: boolean }) {
  return (
    <div
      className={`rounded-panel border border-white/[0.06] ${raised ? "bg-raised" : "bg-surface"} ${className}`}
      {...props}
    />
  );
}
