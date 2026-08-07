"use client";

import { useMemo, useState } from "react";

type Member = { id: string; name: string; initials: string };
type Fixture = {
  id: string;
  competition: string;
  home: string;
  away: string;
  kickoff: string;
  selectedBy?: string;
  status: "available" | "selected" | "live" | "finished";
  score?: [number, number];
};
type Pick = { memberId: string; fixtureId: string };

const members: Member[] = [
  { id: "dtb", name: "DTB", initials: "DT" },
  { id: "daves", name: "Dave S", initials: "DS" },
  { id: "turnsy", name: "Turnsy Fitchett", initials: "TF" },
  { id: "ryan", name: "Ryan", initials: "RY" },
  { id: "davep", name: "Dave Pickup", initials: "DP" },
  { id: "yacky", name: "Yacky", initials: "YA" },
  { id: "ian", name: "Ian", initials: "IA" },
  { id: "kevinp", name: "Kevin Pickup", initials: "KP" }
];

const starterFixtures: Fixture[] = [
  { id: "1", competition: "SCOTTISH PREMIERSHIP", home: "Aberdeen", away: "Dundee United", kickoff: "15:00", status: "available" },
  { id: "2", competition: "SCOTTISH PREMIERSHIP", home: "Motherwell", away: "Kilmarnock", kickoff: "15:00", status: "selected", selectedBy: "Dave S" },
  { id: "3", competition: "EFL CHAMPIONSHIP", home: "Bristol City", away: "Preston", kickoff: "15:00", status: "available" },
  { id: "4", competition: "EFL LEAGUE ONE", home: "Bolton", away: "Reading", kickoff: "15:00", status: "selected", selectedBy: "Ryan" },
  { id: "5", competition: "EFL LEAGUE TWO", home: "Notts County", away: "Crewe", kickoff: "15:00", status: "available" }
];

const baseStandings = [
  { id: "dtb", name: "DTB", played: 0, wins: 0, nils: 0, zeros: 0, points: 0 },
  { id: "daves", name: "Dave S", played: 0, wins: 0, nils: 0, zeros: 0, points: 0 },
  { id: "davep", name: "Dave Pickup", played: 0, wins: 0, nils: 0, zeros: 0, points: 0 },
  { id: "ian", name: "Ian", played: 0, wins: 0, nils: 0, zeros: 0, points: 0 },
  { id: "kevinp", name: "Kevin Pickup", played: 0, wins: 0, nils: 0, zeros: 0, points: 0 },
  { id: "ryan", name: "Ryan", played: 0, wins: 0, nils: 0, zeros: 0, points: 0 },
  { id: "turnsy", name: "Turnsy Fitchett", played: 0, wins: 0, nils: 0, zeros: 0, points: 0 },
  { id: "yacky", name: "Yacky", played: 0, wins: 0, nils: 0, zeros: 0, points: 0 }
];

function sortTable<T extends { points: number; zeros: number; wins: number; name: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      a.zeros - b.zeros ||
      b.wins - a.wins ||
      a.name.localeCompare(b.name)
  );
}

export default function Home() {
  const [tab, setTab] = useState<"home" | "fixtures" | "table" | "admin">("home");
  const [fixtures, setFixtures] = useState(starterFixtures);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [me] = useState(members[0]);
  const [toast, setToast] = useState("");

  const myPick = picks.find(p => p.memberId === me.id);
  const table = useMemo(() => sortTable(baseStandings), []);

  function chooseFixture(fixtureId: string) {
    const fixture = fixtures.find(f => f.id === fixtureId);
    if (!fixture || fixture.status !== "available") return;
    setFixtures(current =>
      current.map(f => {
        if (f.selectedBy === me.name) return { ...f, selectedBy: undefined, status: "available" };
        if (f.id === fixtureId) return { ...f, selectedBy: me.name, status: "selected" };
        return f;
      })
    );
    setPicks([{ memberId: me.id, fixtureId }]);
    setToast("Prediction saved");
    setTimeout(() => setToast(""), 1800);
  }

  return (
    <main>
      <header className="broadcastHeader">
        <div className="brandBlock">
          <span className="brandMark">B</span>
          <div>
            <strong>BOUNCE</strong>
            <span>BTTS LEAGUE · 26/27</span>
          </div>
        </div>
        <div className="headerRight">
          <span className="livePill"><i /> GAMEWEEK 1</span>
          <button className="avatar">{me.initials}</button>
        </div>
      <div className="heritageLine">EDINBURGH · EST. 2024</div>
      </header>

      <div className="ticker">
        <strong>PICKS CLOSE</strong>
        <span>SATURDAY 14:55</span>
        <span className="tickerRule">UK 3PM FIXTURES ONLY</span>
      </div>

      <section className="shell">
        {tab === "home" && (
          <>
            <section className="hero">
              <div className="heroCopy">
                <span className="kicker">SEASON 2026/27</span>
                <h1>Gameweek 1</h1>
                <p>One match. One chance. Both teams to score.</p>
              </div>
              <div className="countdown">
                <span>PICKS LOCK IN</span>
                <strong>1d 03h</strong>
              </div>
            </section>

            <div className="summaryGrid">
              <article className="statCard">
                <span>CURRENT LEADER</span>
                <strong>—</strong>
                <small>Season starts at 0</small>
              </article>
              <article className="statCard">
                <span>PRIZE POT</span>
                <strong>£160</strong>
                <small>8 players × £20</small>
              </article>
              <article className="statCard accent">
                <span>YOUR POSITION</span>
                <strong>—</strong>
                <small>Ready for Gameweek 1</small>
              </article>
            </div>

            <section className="panel">
              <div className="panelHeading">
                <div><span>YOUR SELECTION</span><h2>Gameweek pick</h2></div>
                <button className="linkButton" onClick={() => setTab("fixtures")}>{myPick ? "CHANGE" : "SELECT GAME"}</button>
              </div>
              {myPick ? (
                (() => {
                  const f = fixtures.find(x => x.id === myPick.fixtureId)!;
                  return <div className="selectedMatch"><span>{f.competition}</span><strong>{f.home} <em>v</em> {f.away}</strong><small>Saturday · {f.kickoff}</small></div>;
                })()
              ) : (
                <button className="emptyPick" onClick={() => setTab("fixtures")}>
                  <span>+</span><strong>Choose your BTTS fixture</strong><small>Only available eligible matches are shown</small>
                </button>
              )}
            </section>

            <section className="panel">
              <div className="panelHeading"><div><span>GAMEWEEK 1</span><h2>Selections</h2></div><strong className="submitted">0 / 8 submitted</strong></div>
              <div className="selectionList">
                {members.map(member => {
                  const fixed = fixtures.find(f => f.selectedBy === member.name);
                  return (
                    <div className="memberRow" key={member.id}>
                      <span className="miniAvatar">{member.initials}</span>
                      <div><strong>{member.name}</strong><small>{fixed ? `${fixed.home} v ${fixed.away}` : member.id === "dtb" && myPick ? (() => { const f=fixtures.find(x=>x.id===myPick.fixtureId)!; return `${f.home} v ${f.away}`; })() : "Awaiting selection"}</small></div>
                      <span className={fixed || (member.id==="dtb" && myPick) ? "status done" : "status"}>{fixed || (member.id==="dtb" && myPick) ? "LOCKED" : "PENDING"}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {tab === "fixtures" && (
          <section className="panel fixturePanel">
            <div className="panelHeading">
              <div><span>ELIGIBLE MATCHES</span><h2>Choose your fixture</h2></div>
              <strong className="fixtureCount">{fixtures.filter(f=>f.status==="available").length} AVAILABLE</strong>
            </div>
            <p className="notice">Automatically filtered to UK matches kicking off at 3:00pm. Hearts fixtures are excluded.</p>
            {[...new Set(fixtures.map(f => f.competition))].map(comp => (
              <div className="competitionGroup" key={comp}>
                <h3>{comp}</h3>
                {fixtures.filter(f => f.competition === comp).map(f => (
                  <button className={`fixtureRow ${f.status !== "available" && f.selectedBy !== me.name ? "disabled" : ""}`} key={f.id} onClick={() => chooseFixture(f.id)}>
                    <span className="time">{f.kickoff}</span>
                    <span className="teams"><strong>{f.home}</strong><strong>{f.away}</strong></span>
                    {f.status === "available" ? <span className="pickAction">SELECT</span> :
                     f.selectedBy === me.name ? <span className="pickAction yours">YOUR PICK</span> :
                     <span className="taken">TAKEN BY<br/><strong>{f.selectedBy?.toUpperCase()}</strong></span>}
                  </button>
                ))}
              </div>
            ))}
          </section>
        )}

        {tab === "table" && (
          <section className="panel">
            <div className="panelHeading"><div><span>SEASON 2026/27</span><h2>League table</h2></div><span className="updated">UPDATED NOW</span></div>
            <div className="leagueTable">
              <div className="tableHeader"><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>00</span><span>PTS</span></div>
              {table.map((row, i) => (
                <div className={`tableRow ${row.id === me.id ? "me" : ""}`} key={row.id}>
                  <span className="position">{i + 1}</span>
                  <span className="tablePlayer"><i>{members.find(m=>m.id===row.id)?.initials}</i><strong>{row.name}</strong></span>
                  <span>{row.played}</span><span>{row.wins}</span><span>{row.zeros}</span><strong>{row.points}</strong>
                </div>
              ))}
            </div>
            <div className="tieRule"><strong>TIEBREAK:</strong> Fewest 0–0s, then most wins, then alphabetical.</div>
          </section>
        )}

        {tab === "admin" && (
          <section className="panel">
            <div className="panelHeading"><div><span>RESTRICTED</span><h2>Admin control room</h2></div><span className="adminBadge">ADMIN</span></div>
            <div className="adminGrid">
              <button><span>＋</span><strong>Add fixture</strong><small>Manual eligible match</small></button>
              <button><span>↻</span><strong>Sync fixtures</strong><small>Refresh from provider</small></button>
              <button><span>✓</span><strong>Sync results</strong><small>Import final scores</small></button>
              <button><span>🔒</span><strong>Lock picks</strong><small>Close this gameweek</small></button>
              <button><span>👥</span><strong>Members</strong><small>Approve and manage users</small></button>
              <button><span>⚙</span><strong>League settings</strong><small>Rules and deadlines</small></button>
            </div>
            <div className="audit">
              <h3>RECENT ACTIVITY</h3>
              <p><strong>DTB</strong> imported 18 eligible fixtures <span>Today, 06:02</span></p>
              <p><strong>System</strong> updated 3 final results <span>Saturday, 17:08</span></p>
              <p><strong>DTB</strong> configured the 26/27 league <span>2 days ago</span></p>
            </div>
          </section>
        )}
      </section>

      <nav className="bottomNav">
        <button className={tab==="home"?"active":""} onClick={()=>setTab("home")}><span>⌂</span>HOME</button>
        <button className={tab==="fixtures"?"active":""} onClick={()=>setTab("fixtures")}><span>⚽</span>PICKS</button>
        <button className={tab==="table"?"active":""} onClick={()=>setTab("table")}><span>▦</span>TABLE</button>
        <button className={tab==="admin"?"active":""} onClick={()=>setTab("admin")}><span>◆</span>ADMIN</button>
      </nav>

      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}
