export type TimeSpan = { id: string; start: number; end: number };

/** Pack overlapping spans into equal-width columns, per cluster. */
export function overlapColumns(items: TimeSpan[]): Map<string, { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const out = new Map<string, { col: number; cols: number }>();
  let i = 0;
  while (i < sorted.length) {
    let clusterEnd = sorted[i].end;
    let j = i + 1;
    while (j < sorted.length && sorted[j].start < clusterEnd) {
      clusterEnd = Math.max(clusterEnd, sorted[j].end);
      j += 1;
    }
    const cluster = sorted.slice(i, j);
    const colEnd: number[] = [];
    const colOf = new Map<string, number>();
    for (const item of cluster) {
      let col = colEnd.findIndex((end) => end <= item.start);
      if (col < 0) {
        col = colEnd.length;
        colEnd.push(item.end);
      } else {
        colEnd[col] = item.end;
      }
      colOf.set(item.id, col);
    }
    const cols = Math.max(1, colEnd.length);
    for (const item of cluster) {
      out.set(item.id, { col: colOf.get(item.id) ?? 0, cols });
    }
    i = j;
  }
  return out;
}
