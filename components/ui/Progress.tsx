export function Progress({
  value,
  tone = "pink",
}: {
  value: number;
  tone?: "pink" | "mint" | "violet";
}) {
  const colors = {
    pink: "bg-pink",
    mint: "bg-mint",
    violet: "bg-violet",
  };
  return (
    <div className="h-1.5 overflow-hidden rounded-[3px] bg-white/[0.06]">
      <div
        className={`h-full ${colors[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
