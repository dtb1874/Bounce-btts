"use client";

type CreatureLeader = {
  name: string;
  team: string;
  count: number;
  wins: number;
  losses: number;
};

export default function CreatureHabitStat({ leaders }: { leaders: CreatureLeader[] }) {
  if (!leaders.length) {
    return <><strong>—</strong><small>Most repeat selections of the same team</small></>;
  }

  return <>
    <div style={{ display: "grid", gap: "3px", marginTop: "2px" }}>
      {leaders.map((row) => (
        <details className="leagueStatBreakdown" key={`${row.name}-${row.team}`} onClick={(event) => event.stopPropagation()}>
          <summary style={{ fontFamily: "Georgia, serif", fontSize: "13px", lineHeight: 1.25, fontWeight: 700, textTransform: "none", letterSpacing: "normal" }}>
            {row.name} — {row.team}, {row.count} picks
          </summary>
          <div>
            <small>{row.wins}W · {row.losses}L</small>
          </div>
        </details>
      ))}
    </div>
    <small style={{ marginTop: "4px" }}>Most repeat selections of the same team</small>
  </>;
}
