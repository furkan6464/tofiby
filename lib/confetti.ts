import confetti from "canvas-confetti";

export function celebrate(
  kind: "task" | "streak" | "evolve" | "hatch" | "marry",
) {
  const maps = {
    task: { particleCount: 18, spread: 50, startVelocity: 28 },
    streak: { particleCount: 28, spread: 62, startVelocity: 32 },
    evolve: { particleCount: 46, spread: 76, startVelocity: 36 },
    hatch: { particleCount: 52, spread: 80, startVelocity: 34 },
    marry: { particleCount: 70, spread: 90, startVelocity: 38 },
  };
  const colors =
    kind === "marry"
      ? ["#FF3E9E", "#8B5CF6"]
      : kind === "evolve" || kind === "hatch"
        ? ["#FF3E9E", "#39FFC0"]
        : ["#FF3E9E", "#F5F3FA"];
  confetti({
    ...maps[kind],
    colors,
    ticks: 90,
    disableForReducedMotion: true,
    origin: { x: 0.82, y: 0.82 },
  });
}
