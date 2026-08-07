export function pointsForScore(home: number, away: number) {
  if (home === 0 && away === 0) return -1;
  if (home > 0 && away > 0) return 3;
  return 1;
}

export type TableRow = {
  name: string;
  points: number;
  zeroZeroCount: number;
  wins: number;
};

export function orderStandings<T extends TableRow>(rows: T[]) {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      a.zeroZeroCount - b.zeroZeroCount ||
      b.wins - a.wins ||
      a.name.localeCompare(b.name)
  );
}
