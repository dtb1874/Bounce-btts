"use client";

import { useMemo, useState } from "react";

type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "players" | "admin";
type Member = { id: string; name: string; initials: string; role?: string };
type Fixture = {
  id: string;
  competition: string;
  home: string;
  away: string;
  kickoff: string;
  date: string;
  odds: string;
  selectedBy?: string;
  status: "available" | "selected" | "finished";
  score?: [number, number];
};

const members: Member[] = [
  { id: "dtb", name: "David Hay", initials: "DH", role: "Manager" },
  { id: "daves", name: "Dave S", initials: "DS" },
  { id: "turnsy", name: "Turnsy Fitchett", initials: "TF" },
  { id: "ryan", name: "Ryan", initials: "RY" },
  { id: "davep", name: "Dave Pickup", initials: "DP" },
  { id: "yacky", name: "Yacky", initials: "YA" },
  { id: "ian", name: "Ian", initials: "IA" },
  { id: "kevinp", name: "Kevin Pickup", initials: "KP" }
];

const initialFixtures: Fixture[] = [
  { id: "1", competition: "Scottish Premiership", home: "Hibernian", away: "St Mirren", kickoff: "15:00", date: "Sat 10 May", odds: "4/6", status: "available" },
  { id: "2", competition: "Scottish Premiership", home: "Kilmarnock", away: "Motherwell", kickoff: "15:00", date: "Sat 10 May", odds: "8/11", status: "selected", selectedBy: "Dave S" },
  { id: "3", competition: "EFL Championship", home: "Bristol City", away: "Preston", kickoff: "15:00", date: "Sat 10 May", odds: "5/6", status: "available" },
  { id: "4", competition: "EFL League One", home: "Bolton", away: "Reading", kickoff: "15:00", date: "Sat 10 May", odds: "4/7", status: "selected", selectedBy: "Ryan" },
  { id: "5", competition: "EFL League Two", home: "Notts County", away: "Crewe", kickoff: "15:00", date: "Sat 10 May", odds: "8/13", status: "available" },
  { id: "6", competition: "National League North", home: "Chester", away: "Kidderminster", kickoff: "15:00", date: "Sat 10 May", odds: "10/11", status: "available" },
  { id: "7", competition: "Northern Premier League", home: "Macclesfield", away: "Worksop Town", kickoff: "15:00", date: "Sat 10 May", odds: "8/11", status: "available" },
  { id: "8", competition: "Southern League Premier", home: "Merthyr Town", away: "Walton & Hersham", kickoff: "15:00", date: "Sat 10 May", odds: "5/6", status: "available" }
];

const standings = [
  { name: "David Hay", played: 3, wins: 3, zeros: 0, points: 9 },
  { name: "Craig Wilson", played: 3, wins: 2, zeros: 0, points: 7 },
  { name: "Euan MacDonald", played: 3, wins: 2, zeros: 0, points: 6 },
  { name: "Callum B", played: 3, wins: 1, zeros: 0, points: 4 },
  { name: "Ross McLeod", played: 3, wins: 1, zeros: 1, points: 4 },
  { name: "Cammy Tait", played: 3, wins: 1, zeros: 0, points: 3 },
  { name: "Gary McKay", played: 3, wins: 0, zeros: 0, points: 1 }
];

const recentResults = [
  { gw: "GW3", home: "St Mirren", score: "2 - 1", away: "Kilmarnock", btts: true },
  { gw: "GW3", home: "Dundee Utd", score: "1 - 1", away: "Hibernian", btts: true },
  { gw: "GW3", home: "Motherwell", score: "1 - 2", away: "Hearts", btts: true },
  { gw: "GW3", home: "Ross County", score: "2 - 2", away: "Livingston", btts: true },
  { gw: "GW3", home: "St Johnstone", score: "0 - 1", away: "Aberdeen", btts: false }
];

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "pick", label: "My Pick", icon: "⚑" },
  { id: "fixtures", label: "Fixtures", icon: "▦" },
  { id: "table", label: "League Table", icon: "☷" },
  { id: "results", label: "Results", icon: "✦" },
  { id: "players", label: "Players", icon: "◉" },
  { id: "admin", label: "Admin", icon: "⚙" }
];

function initialsFor(name: string) {
  return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function shareText(fixtures: Fixture[]) {
  const selected = fixtures.filter(f => f.selectedBy);
  const groups = new Map<string, Fixture[]>();
  selected.forEach(f => groups.set(f.competition, [...(groups.get(f.competition) ?? []), f]));
  const lines = ["BOUNCE BTTS LEAGUE — GW4", ""];
  groups.forEach((items, competition) => {
    lines.push(competition.toUpperCase());
    items.forEach(item => lines.push(`${item.home} v ${item.away} — ${item.selectedBy} — ${item.odds}`));
    lines.push("");
  });
  lines.push("Odds checked 08:00 — prices may change");
  return lines.join("\n");
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [fixtures, setFixtures] = useState(initialFixtures);
  const [toast, setToast] = useState("");
  const me = members[0];

  const myFixture = fixtures.find(f => f.selectedBy === me.name);
  const submitted = fixtures.filter(f => f.selectedBy).length;
  const competitions = useMemo(() => [...new Set(fixtures.map(f => f.competition))], [fixtures]);

  function selectFixture(id: string) {
    const target = fixtures.find(f => f.id === id);
    if (!target || (target.selectedBy && target.selectedBy !== me.name)) return;
    setFixtures(current => current.map(f => {
      if (f.selectedBy === me.name) return { ...f, selectedBy: undefined, status: "available" };
      if (f.id === id) return { ...f, selectedBy: me.name, status: "selected" };
      return f;
    }));
    setToast("Pick submitted");
    setTimeout(() => setToast(""), 1800);
  }

  async function sharePicks() {
    const text = shareText(fixtures);
    if (navigator.share) await navigator.share({ title: "Bounce BTTS League GW4", text });
    else {
      await navigator.clipboard.writeText(text);
      setToast("Weekly picks copied");
      setTimeout(() => setToast(""), 1800);
    }
  }

  return (
    <main className="appShell">
      <button className="mobileMenuButton" onClick={() => setMobileMenu(true)}>☰</button>
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <button className="closeMenu" onClick={() => setMobileMenu(false)}>×</button>
        <div className="sideBrand">
          <div className="crest">B</div>
          <div><strong>BOUNCE</strong><span>BTTS LEAGUE</span></div>
        </div>
        <nav>
          {navItems.map(item => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileMenu(false); }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebarWatermark">B</div>
        <div className="profileCard">
          <span>{me.initials}</span>
          <div><strong>{me.name}</strong><small>{me.role}</small></div>
          <b>⌄</b>
        </div>
      </aside>
      {mobileMenu && <button className="menuScrim" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}

      <section className="mainArea">
        <header className="heroHeader">
          <div className="heroText">
            <h1>BOUNCE</h1>
            <h2>— BTTS LEAGUE —</h2>
            <p>EDINBURGH · HEART OF MIDLOTHIAN · EST 2025</p>
          </div>
          <div className="heroHeart">♡</div>
          <div className="gameweekCard">
            <span>Gameweek</span>
            <div><strong>GW 4</strong><button>‹</button><button>›</button></div>
            <small>▣ &nbsp; 9 – 11 May 2025</small>
          </div>
        </header>

        {view === "dashboard" && (
          <div className="dashboardGrid">
            <section className="contentColumn">
              <article className="panel currentPickPanel">
                <div className="panelTitle">YOUR PICK — GAMEWEEK 4</div>
                {myFixture ? (
                  <div className="pickDisplay">
                    <div className="teamBadge">{initialsFor(myFixture.home)}</div>
                    <strong>{myFixture.home}</strong>
                    <span className="versus">V</span>
                    <strong>{myFixture.away}</strong>
                    <div className="teamBadge away">{initialsFor(myFixture.away)}</div>
                    <div className="pickSubmitted">✓ PICK SUBMITTED</div>
                    <small>{myFixture.date}, 10:42 · BTTS {myFixture.odds}</small>
                  </div>
                ) : (
                  <button className="emptySelection" onClick={() => setView("fixtures")}>Choose your Saturday 3pm BTTS fixture</button>
                )}
                <div className="pickNotice">ⓘ &nbsp; You can only make one pick per gameweek. Picks can be changed until the weekly deadline.</div>
              </article>

              <article className="panel fixturesPanel">
                <div className="panelTitle rowTitle"><span>UPCOMING FIXTURES — GAMEWEEK 4</span><button onClick={() => setView("fixtures")}>View all →</button></div>
                <div className="fixtureRows">
                  {fixtures.slice(0, 5).map(f => (
                    <div className="dashboardFixture" key={f.id}>
                      <div className="fixtureDate"><strong>{f.date}</strong><span>{f.kickoff}</span></div>
                      <div className="fixtureTeams"><strong>{f.home}</strong><span className="miniBadge">{initialsFor(f.home)}</span><b>v</b><span className="miniBadge">{initialsFor(f.away)}</span><strong>{f.away}</strong></div>
                      <div className="fixtureOdds"><span>BTTS</span><strong>{f.odds}</strong></div>
                      <button disabled={Boolean(f.selectedBy && f.selectedBy !== me.name)} onClick={() => selectFixture(f.id)}>{f.selectedBy === me.name ? "Picked" : f.selectedBy ? "Taken" : "Pick"}</button>
                    </div>
                  ))}
                </div>
                <footer>{fixtures.length} eligible fixtures · all UK Saturday 3pm matches carried by the feed</footer>
              </article>
            </section>

            <aside className="rightColumn">
              <article className="panel tablePanel">
                <div className="panelTitle">LEAGUE TABLE</div>
                <div className="compactTable header"><span>POS</span><span>PLAYER</span><span>PTS</span><span>P</span><span>W</span></div>
                {standings.map((row, index) => (
                  <div className={`compactTable ${index === 0 ? "leader" : ""}`} key={row.name}><span>{index + 1}</span><strong>{row.name}</strong><span>{row.points}</span><span>{row.played}</span><span>{row.wins}</span></div>
                ))}
                <button className="panelFooterButton" onClick={() => setView("table")}>View full table →</button>
              </article>

              <article className="panel resultsPanel">
                <div className="panelTitle">LATEST RESULTS</div>
                {recentResults.map(result => (
                  <div className="resultRow" key={`${result.home}-${result.away}`}><span>{result.gw}</span><strong>{result.home}</strong><b>{result.score}</b><strong>{result.away}</strong><i className={result.btts ? "yes" : "no"}>{result.btts ? "✓" : "–"}</i></div>
                ))}
                <button className="panelFooterButton" onClick={() => setView("results")}>View all results →</button>
              </article>

              <button className="shareCard" onClick={sharePicks}><span>↗</span><div><strong>Share weekly picks</strong><small>League-sorted · fractional odds · WhatsApp ready</small></div></button>
            </aside>
          </div>
        )}

        {(view === "pick" || view === "fixtures") && (
          <section className="pagePanel panel">
            <div className="pageHeading"><div><span>GAMEWEEK 4</span><h2>{view === "pick" ? "My Pick" : "Eligible Fixtures"}</h2><p>Any UK-based Saturday 3pm fixture with a BTTS market. Hearts matches are excluded.</p></div><button onClick={sharePicks}>Share picks</button></div>
            {competitions.map(comp => (
              <div className="competitionSection" key={comp}>
                <h3>{comp}</h3>
                {fixtures.filter(f => f.competition === comp).map(f => (
                  <div className="fullFixture" key={f.id}>
                    <div><span>{f.date}</span><strong>{f.kickoff}</strong></div>
                    <div className="fullTeams"><strong>{f.home}</strong><b>v</b><strong>{f.away}</strong></div>
                    <div className="fullOdds"><span>BTTS</span><strong>{f.odds}</strong></div>
                    <button disabled={Boolean(f.selectedBy && f.selectedBy !== me.name)} onClick={() => selectFixture(f.id)}>{f.selectedBy === me.name ? "Picked ✓" : f.selectedBy ? `Taken by ${f.selectedBy}` : "Select"}</button>
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        {view === "table" && (
          <section className="pagePanel panel">
            <div className="pageHeading"><div><span>SEASON 2026/27</span><h2>League Table</h2><p>Ties: fewest 0–0s, most BTTS wins, then alphabetical.</p></div></div>
            <div className="largeTable"><div className="largeTableRow header"><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>0-0</span><span>PTS</span></div>{standings.map((row, i)=><div className={`largeTableRow ${i===0?"leader":""}`} key={row.name}><span>{i+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.zeros}</span><b>{row.points}</b></div>)}</div>
          </section>
        )}

        {view === "results" && (
          <section className="pagePanel panel"><div className="pageHeading"><div><span>RECENT GAMEWEEKS</span><h2>Results</h2></div></div>{recentResults.map(r=><div className="largeResult" key={`${r.home}-${r.away}`}><span>{r.gw}</span><strong>{r.home}</strong><b>{r.score}</b><strong>{r.away}</strong><i className={r.btts?"yes":"no"}>{r.btts?"BTTS ✓":"NO"}</i></div>)}</section>
        )}

        {view === "players" && (
          <section className="pagePanel panel"><div className="pageHeading"><div><span>LEAGUE MEMBERS</span><h2>Players</h2><p>{submitted} of {members.length} have submitted a pick.</p></div></div><div className="playerGrid">{members.map(m=>{const pick=fixtures.find(f=>f.selectedBy===m.name);return <article key={m.id}><span>{m.initials}</span><div><strong>{m.name}</strong><small>{pick?`${pick.home} v ${pick.away} · ${pick.odds}`:"Awaiting selection"}</small></div><b className={pick?"picked":"pending"}>{pick?"PICKED ✓":"PENDING"}</b></article>})}</div></section>
        )}

        {view === "admin" && (
          <section className="pagePanel panel"><div className="pageHeading"><div><span>ADMIN CONTROL</span><h2>League Management</h2><p>Users, fixtures, results, daily sync and public sharing.</p></div></div><div className="adminCards"><button><span>👥</span><strong>Manage users</strong><small>Create members and temporary passwords</small></button><button><span>⚽</span><strong>Fixtures</strong><small>Review imported UK 3pm matches</small></button><button><span>✓</span><strong>Results</strong><small>Correct scores and scoring</small></button><button><span>↗</span><strong>Share centre</strong><small>Public table and weekly picks</small></button></div></section>
        )}

        <footer className="siteFooter"><span>♡</span><div><strong>MADE IN EDINBURGH</strong><small>FOR THE FANS, BY THE FANS</small></div></footer>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
