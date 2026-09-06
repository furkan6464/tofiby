export function SparkleField() {
  const dots = [
    [8, 18],
    [22, 42],
    [38, 12],
    [54, 36],
    [71, 20],
    [86, 48],
    [14, 68],
    [46, 74],
    [78, 70],
    [92, 28],
  ];
  return (
    <div className="landing-sparkles" aria-hidden>
      {dots.map(([x, y], i) => (
        <span key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.7}s` }} />
      ))}
    </div>
  );
}
