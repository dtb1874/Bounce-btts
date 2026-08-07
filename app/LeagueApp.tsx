"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { combinedFractional } from "@/lib/fractional";
import ShareTableButton from "./ShareTableButton";

type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "history" | "players" | "admin";
type AdminView = "users" | "selections" | "fixtures" | "results" | "gameweek";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "member";
  active: boolean;
  slot_number: number | null;
};

type Gameweek = {
  id: string;
  number: number;
  status: "open" | "locked" | "complete";
  opens_at: string | null;
  locks_at: string;
  season_id: string | null;
};

type Fixture = {
  id: string;
  gameweek_id: string | null;
  competition: string;
  country: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  odds_fractional: string | null;
  odds_checked_at: string | null;
  source: string;
};

type Prediction = {
  id: string;
  gameweek_id: string;
  member_id: string;
  fixture_id: string;
  points_awarded: number | null;
  created_at: string;
  updated_at: string;
};

type ScoreAdjustment = {
  id: string;
  gameweek_id: string;
  member_id: string;
  points: number;
  reason: string;
  source: "automatic" | "admin";
  created_at: string;
  updated_at: string;
};

type UserAdminRow = Profile & { approved: boolean; password: string };

type SeasonHistory = {
  id: string;
  label: string;
  isCurrent: boolean;
  gameweeks: number;
  completedPicks: number;
  standings: Array<{
    id: string;
    name: string;
    played: number;
    wins: number;
    zeroZeroCount: number;
    points: number;
  }>;
};

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "pick", label: "My Pick", icon: "⚑" },
  { id: "fixtures", label: "Fixtures", icon: "▦" },
  { id: "table", label: "League Table", icon: "☷" },
  { id: "results", label: "Results", icon: "✦" },
  { id: "history", label: "League History", icon: "◷" },
  { id: "players", label: "Players", icon: "◉" },
  { id: "admin", label: "Admin", icon: "⚙" },
];

const competitionPriority = [
  "Premier League", "Championship", "League One", "League Two",
  "Scottish Premiership", "Scottish Championship", "Scottish League One", "Scottish League Two",
  "National League", "National League North", "National League South",
  "Carabao Cup", "FA Cup", "Scottish Cup"
];

function competitionRank(name: string) {
  const lowered = name.toLowerCase();
  const exact = competitionPriority.findIndex((item) => lowered.includes(item.toLowerCase()));
  return exact === -1 ? 999 : exact;
}

function sortFixturesForBookmaker(a: Fixture, b: Fixture) {
  return competitionRank(a.competition) - competitionRank(b.competition)
    || a.competition.localeCompare(b.competition)
    || a.kickoff_at.localeCompare(b.kickoff_at)
    || a.home_team.localeCompare(b.home_team);
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function formatKickoff(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function inputDateTime(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function nextFridayAtFiveInput() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const currentHour = Number(get("hour"));
  const currentMinute = Number(get("minute"));
  let days = (5 - weekdayIndex + 7) % 7;
  if (days === 0 && (currentHour > 17 || (currentHour === 17 && currentMinute >= 0))) days = 7;
  const date = new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")), 12));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T17:00`;
}

async function token() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

export default function LeagueApp({
  initialProfile,
  initialProfiles,
  initialGameweek,
  initialFixtures,
  initialPredictions,
  initialAdjustments,
  seasonLabel,
  entryFee,
  seasonHistory,
}: {
  initialProfile: Profile;
  initialProfiles: Profile[];
  initialGameweek: Gameweek | null;
  initialFixtures: Fixture[];
  initialPredictions: Prediction[];
  initialAdjustments: ScoreAdjustment[];
  seasonLabel: string;
  entryFee: number;
  seasonHistory: SeasonHistory[];
}) {
  const [view, setView] = useState<View>("dashboard");
  const [adminView, setAdminView] = useState<AdminView>("users");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [fixtures, setFixtures] = useState(initialFixtures);
  const [predictions, setPredictions] = useState(initialPredictions);
  const adjustments = initialAdjustments;
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const profiles = initialProfiles.filter((profile) => profile.active);
  const gameweek = initialGameweek;

  const predictionByFixture = useMemo(() => new Map(predictions.map((prediction) => [prediction.fixture_id, prediction])), [predictions]);
  const currentPrediction = gameweek ? predictions.find((prediction) => prediction.gameweek_id === gameweek.id && prediction.member_id === initialProfile.id) : undefined;
  const currentFixture = currentPrediction ? fixtures.find((fixture) => fixture.id === currentPrediction.fixture_id) : undefined;
  const currentAdjustment = gameweek ? adjustments.find((adjustment) => adjustment.gameweek_id === gameweek.id && adjustment.member_id === initialProfile.id) : undefined;
  const submitted = gameweek ? predictions.filter((prediction) => prediction.gameweek_id === gameweek.id).length : 0;
  const isOpen = Boolean(gameweek && gameweek.status === "open" && new Date(gameweek.locks_at) > new Date());
  const competitions = useMemo(() => Array.from(new Set(fixtures.map((fixture) => fixture.competition))), [fixtures]);

  const standings = useMemo(() => {
    const map = new Map(profiles.map((profile) => [profile.id, {
      id: profile.id, name: profile.display_name, played: 0, wins: 0, zeroZeroCount: 0, oneSided: 0, points: 0,
    }]));
    for (const prediction of predictions) {
      if (prediction.points_awarded === null) continue;
      const row = map.get(prediction.member_id);
      if (!row) continue;
      row.played += 1;
      row.points += prediction.points_awarded;
      if (prediction.points_awarded === 3) row.wins += 1;
      if (prediction.points_awarded === 1) row.oneSided += 1;
      if (prediction.points_awarded === -1) row.zeroZeroCount += 1;
    }
    for (const adjustment of adjustments) {
      const row = map.get(adjustment.member_id);
      if (!row) continue;
      const hasScoredPick = predictions.some((prediction) =>
        prediction.member_id === adjustment.member_id &&
        prediction.gameweek_id === adjustment.gameweek_id &&
        prediction.points_awarded !== null
      );
      if (!hasScoredPick) row.played += 1;
      row.points += adjustment.points;
    }
    return Array.from(map.values()).sort((a, b) =>
      b.points - a.points || a.zeroZeroCount - b.zeroZeroCount || b.wins - a.wins || a.name.localeCompare(b.name)
    );
  }, [profiles, predictions, adjustments]);

  function notice(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function selectFixture(fixtureId: string) {
    if (!gameweek || !isOpen || busy) return;
    const taken = predictions.find((prediction) => prediction.gameweek_id === gameweek.id && prediction.fixture_id === fixtureId && prediction.member_id !== initialProfile.id);
    if (taken) return notice("That fixture has already been selected.");
    setBusy(true);
    const supabase = createClient();
    let error: { message: string } | null = null;
    if (currentPrediction) {
      const response = await supabase.from("predictions").update({ fixture_id: fixtureId, updated_at: new Date().toISOString() }).eq("id", currentPrediction.id);
      error = response.error;
    } else {
      const response = await supabase.from("predictions").insert({ gameweek_id: gameweek.id, member_id: initialProfile.id, fixture_id: fixtureId }).select().single();
      error = response.error;
      if (!error && response.data) setPredictions((current) => [...current, response.data as Prediction]);
    }
    if (error) notice(error.message.includes("duplicate") ? "That fixture has just been taken by another player." : error.message);
    else {
      if (currentPrediction) setPredictions((current) => current.map((prediction) => prediction.id === currentPrediction.id ? { ...prediction, fixture_id: fixtureId } : prediction));
      notice("Pick saved ✓");
    }
    setBusy(false);
  }

  async function sharePicks() {
    if (!gameweek) return;
    const selected = predictions.filter((prediction) => prediction.gameweek_id === gameweek.id);
    const orderedPicks = selected.map((prediction) => ({
      prediction,
      fixture: fixtures.find((item) => item.id === prediction.fixture_id),
      player: profiles.find((item) => item.id === prediction.member_id)?.display_name,
    })).filter((item): item is { prediction: Prediction; fixture: Fixture; player: string } => Boolean(item.fixture && item.player))
      .sort((a, b) => sortFixturesForBookmaker(a.fixture, b.fixture));
    const grouped = new Map<string, Array<{ fixture: Fixture; player: string }>>();
    for (const item of orderedPicks) {
      grouped.set(item.fixture.competition, [...(grouped.get(item.fixture.competition) ?? []), { fixture: item.fixture, player: item.player }]);
    }
    const lines = [`BOUNCE BTTS LEAGUE — GW${gameweek.number}`, `Season ${seasonLabel}`, ""];
    for (const [competition, picks] of grouped) {
      lines.push(competition.toUpperCase());
      for (const pick of picks) lines.push(`${pick.fixture.home_team} v ${pick.fixture.away_team} — BTTS YES ${pick.fixture.odds_fractional ?? "Odds unavailable"} — ${pick.player}`);
      lines.push("");
    }
    lines.push(`Combined odds: ${combinedFractional(selected.map((prediction) => fixtures.find((fixture) => fixture.id === prediction.fixture_id)?.odds_fractional))}`);
    lines.push("Odds may change after the daily check.");
    const text = lines.join("\n");
    if (navigator.share) await navigator.share({ title: `Bounce BTTS GW${gameweek.number}`, text, url: `${window.location.origin}/table` });
    else { await navigator.clipboard.writeText(text); notice("Picks copied for WhatsApp"); }
  }

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  if (!initialProfile.active) {
    return <main className="authPage"><section className="authCard"><h1>Account inactive</h1><p className="authIntro">Ask an admin to activate this user slot for the current season.</p><button className="primaryButton" onClick={signOut}>Sign out</button></section></main>;
  }

  return (
    <main className="appShell">
      <button className="mobileMenuButton" onClick={() => setMobileMenu(true)}>☰</button>
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <button className="closeMenu" onClick={() => setMobileMenu(false)}>×</button>
        <div className="sideBrand">
          <img className="brandCrest" src="/assets/hearts-crest.png" alt="Heart of Midlothian crest" />
          <div><strong>BOUNCE</strong><span>BTTS LEAGUE</span><small>EST 2024</small></div>
        </div>
        <nav>
          {navItems.filter((item) => item.id !== "admin" || initialProfile.role === "admin").map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileMenu(false); }}><span>{item.icon}</span>{item.label}</button>
          ))}
        </nav>
        <div className="sidebarWatermark" aria-hidden="true"><img src="/assets/st-giles-round.jpg" alt="" /></div>
        <button className="profileCard" onClick={signOut} title="Sign out">
          <span>{initials(initialProfile.display_name)}</span>
          <div><strong>{initialProfile.display_name}</strong><small>{initialProfile.role === "admin" ? "Administrator" : initialProfile.username}</small></div><b>↪</b>
        </button>
      </aside>
      {mobileMenu && <button className="menuScrim" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}

      <section className="mainArea">
        <header className="heroHeader">
          <div className="heroBackdrop" aria-hidden="true"><div className="skylineLayer"/><div className="mosaicLayer"/></div>
          <div className="heroText"><h1>BOUNCE</h1><h2>— BTTS LEAGUE —</h2><div className="heroRule"><span>♥</span></div><p>EDINBURGH · HEART OF MIDLOTHIAN · EST 2024</p></div>
          <div className="gameweekCard"><span>Season {seasonLabel}</span><div><strong>{gameweek ? `GW ${gameweek.number}` : "NO GW"}</strong></div><small>{gameweek ? `${gameweek.status.toUpperCase()} · Locks ${formatKickoff(gameweek.locks_at)}` : "Create a gameweek"}</small></div>
        </header>

        {view === "dashboard" && <Dashboard gameweek={gameweek} currentFixture={currentFixture} currentAdjustment={currentAdjustment} fixtures={fixtures} profiles={profiles} predictions={predictions} standings={standings} submitted={submitted} entryFee={entryFee} seasonLabel={seasonLabel} setView={setView} selectFixture={selectFixture} sharePicks={sharePicks} isOpen={isOpen} />}
        {(view === "pick" || view === "fixtures") && <FixturesPage fixtures={fixtures} predictions={predictions} profiles={profiles} gameweek={gameweek} myId={initialProfile.id} isOpen={isOpen} selectFixture={selectFixture} competitions={competitions} sharePicks={sharePicks} />}
        {view === "table" && <LeagueTable standings={standings} seasonLabel={seasonLabel} entryFee={entryFee} />}
        {view === "results" && <Results fixtures={fixtures} predictions={predictions} profiles={profiles} />}
        {view === "history" && <LeagueHistory seasons={seasonHistory} />}
        {view === "players" && <Players profiles={profiles} predictions={predictions} adjustments={adjustments} fixtures={fixtures} gameweek={gameweek} />}
        {view === "admin" && initialProfile.role === "admin" && <AdminPanel active={adminView} setActive={setAdminView} gameweek={gameweek} fixtures={fixtures} profiles={profiles} predictions={predictions} adjustments={adjustments} onChanged={() => window.location.reload()} notice={notice} />}

        <footer className="siteFooter"><span>♡</span><strong>MADE BY THE ARTIST, FOR THE BOUNCE</strong></footer>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function Dashboard({ gameweek, currentFixture, currentAdjustment, fixtures, profiles, predictions, standings, submitted, entryFee, seasonLabel, setView, selectFixture, sharePicks, isOpen }: any) {
  const recent = fixtures.filter((fixture: Fixture) => ["FT", "AET", "PEN"].includes(fixture.status));
  return <div className="dashboardGrid">
    <section className="contentColumn">
      <article className="panel currentPickPanel brandedPanel"><div className="panelTitle">YOUR PICK — {gameweek ? `GAMEWEEK ${gameweek.number}` : "NO ACTIVE GAMEWEEK"}</div>{currentFixture ? <div className="pickDisplay"><img className="pickBrandCrest" src="/assets/hearts-crest.png" alt=""/><div className="teamBadge">{initials(currentFixture.home_team)}</div><strong>{currentFixture.home_team}</strong><span className="versus">V</span><strong>{currentFixture.away_team}</strong><div className="teamBadge away">{initials(currentFixture.away_team)}</div><div className="pickSubmitted">✓ PICK SUBMITTED</div><small>{formatKickoff(currentFixture.kickoff_at)} · BTTS {currentFixture.odds_fractional ?? "Odds unavailable"}</small></div> : currentAdjustment ? <div className="missedPickDisplay"><strong>MISSED DEADLINE</strong><b>{currentAdjustment.points > 0 ? "+" : ""}{currentAdjustment.points} POINT{Math.abs(currentAdjustment.points) === 1 ? "" : "S"}</b><small>{currentAdjustment.reason}</small></div> : <button className="emptySelection" onClick={() => setView("fixtures")}>{isOpen ? "Choose your Saturday 3pm BTTS fixture" : "Selections are currently closed"}</button>}<div className="pickNotice">ⓘ One unique fixture per player. Picks can be changed until the gameweek deadline.</div></article>
      <article className="panel fixturesPanel brandedPanel mosaicPanel"><div className="panelTitle rowTitle"><span>UPCOMING FIXTURES</span><button onClick={() => setView("fixtures")}>View all →</button></div><div className="fixtureRows">{fixtures.slice(0,5).map((fixture: Fixture) => { const prediction = predictions.find((p: Prediction) => p.fixture_id === fixture.id && p.gameweek_id === gameweek?.id); const player = profiles.find((p: Profile) => p.id === prediction?.member_id); return <div className="dashboardFixture" key={fixture.id}><div className="fixtureDate"><strong>{formatKickoff(fixture.kickoff_at).split(",")[0]}</strong><span>15:00</span></div><div className="fixtureTeams"><strong>{fixture.home_team}</strong><span className="miniBadge">{initials(fixture.home_team)}</span><b>v</b><span className="miniBadge">{initials(fixture.away_team)}</span><strong>{fixture.away_team}</strong></div><div className="fixtureOdds"><span>BTTS</span><strong>{fixture.odds_fractional ?? "—"}</strong></div><button disabled={Boolean(player)} onClick={() => selectFixture(fixture.id)}>{player ? `Taken · ${player.display_name}` : "Select"}</button></div>})}{!fixtures.length && <div className="emptyState">No fixtures yet. An admin can add them under Admin → Fixtures.</div>}</div></article>
    </section>
    <aside className="rightColumn">
      <article className="panel statusPanel brandedPanel"><div className="panelTitle">GAMEWEEK STATUS</div><div className="statusNumbers"><strong>{submitted}</strong><span>of {profiles.length} picks submitted</span></div><div className="progressTrack"><i style={{width:`${profiles.length ? submitted/profiles.length*100 : 0}%`}}/></div><small>Prize pot: £{(profiles.length * entryFee).toFixed(0)}</small></article>
      <article className="panel tablePanel brandedPanel"><div className="panelTitle">LEAGUE TABLE</div><div className="miniTable"><div className="miniTableRow header"><span>POS</span><span>PLAYER</span><span>W</span><span>0-0</span><span>PTS</span></div>{standings.slice(0,8).map((row: any,index:number)=><div className={`miniTableRow ${index===0?"leader":""}`} key={row.id}><span>{index+1}</span><strong>{row.name}</strong><span>{row.wins}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b></div>)}</div><div className="tablePanelActions"><button className="panelFooterButton" onClick={() => setView("table")}>View full table →</button><ShareTableButton compact rows={standings} seasonLabel={seasonLabel} prizePot={profiles.length * entryFee} /></div></article>
      <article className="panel resultsPanel brandedPanel"><div className="panelTitle">LATEST RESULTS</div>{recent.slice(0,5).map((fixture: Fixture)=><div className="resultRow" key={fixture.id}><span>GW{gameweek?.number}</span><strong>{fixture.home_team}</strong><b>{fixture.home_score} - {fixture.away_score}</b><strong>{fixture.away_team}</strong><i className={(fixture.home_score??0)>0&&(fixture.away_score??0)>0?"yes":"no"}>{(fixture.home_score??0)>0&&(fixture.away_score??0)>0?"✓":"–"}</i></div>)}{!recent.length&&<div className="emptyState compact">No completed results yet.</div>}</article>
      <button className="shareCard" onClick={sharePicks}><span>↗</span><div><strong>Share weekly picks</strong><small>League-sorted · fractional odds · WhatsApp ready</small></div></button>
    </aside>
  </div>;
}

function FixturesPage({ fixtures, predictions, profiles, gameweek, myId, isOpen, selectFixture, competitions, sharePicks }: any) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filtered = (fixtures as Fixture[]).filter((fixture) => !query || `${fixture.home_team} ${fixture.away_team} ${fixture.competition}`.toLowerCase().includes(query));
  const visibleCompetitions = (competitions as string[]).filter((competition) => filtered.some((fixture) => fixture.competition === competition));
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>{gameweek ? `GAMEWEEK ${gameweek.number}` : "NO GAMEWEEK"}</span><h2>Eligible Fixtures</h2><p>UK Saturday 3pm fixtures only. Hearts and Hibs matches are excluded.</p></div><button onClick={sharePicks}>Share picks</button></div><div className="fixtureSearch"><label htmlFor="fixture-search">Search fixtures</label><input id="fixture-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type a team or competition…" autoComplete="off" /></div>{visibleCompetitions.map((competition:string)=>{const competitionFixtures=filtered.filter((f:Fixture)=>f.competition===competition).sort(sortFixturesForBookmaker);return <details className="competitionSection competitionDisclosure" key={`${competition}-${query}`} open={Boolean(query)}><summary><span>{competition}</span><small>{competitionFixtures.length} fixture{competitionFixtures.length===1?"":"s"}</small><b aria-hidden="true">⌄</b></summary><div className="competitionFixtures">{competitionFixtures.map((fixture:Fixture)=>{const prediction=predictions.find((p:Prediction)=>p.fixture_id===fixture.id&&p.gameweek_id===gameweek?.id);const player=profiles.find((p:Profile)=>p.id===prediction?.member_id);return <div className="fullFixture" key={fixture.id}><div><span>{formatKickoff(fixture.kickoff_at).split(",")[0]}</span><strong>15:00</strong></div><div className="fullTeams"><strong>{fixture.home_team}</strong><b>v</b><strong>{fixture.away_team}</strong></div><div className="fullOdds"><span>BTTS</span><strong>{fixture.odds_fractional??"—"}</strong></div><button disabled={!isOpen||Boolean(player&&player.id!==myId)} onClick={()=>selectFixture(fixture.id)}>{player?.id===myId?"Picked ✓":player?`Taken by ${player.display_name}`:isOpen?"Select":"Closed"}</button></div>})}</div></details>})}{!filtered.length&&<div className="emptyState">No fixtures match your search.</div>}</section>;
}

function LeagueTable({ standings, seasonLabel, entryFee }: any) {
  const prizePot = standings.length * entryFee;
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>SEASON {seasonLabel} · EST 2024</span><h2>League Table</h2><p>Ties: fewest 0–0s, most BTTS wins, then alphabetical.</p></div><div className="pageHeadingActions"><ShareTableButton rows={standings} seasonLabel={seasonLabel} prizePot={prizePot} /><a href="/table" target="_blank" rel="noreferrer">Public table ↗</a></div></div><div className="largeTable"><div className="largeTableRow header"><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>0-0</span><span>PTS</span></div>{standings.map((row:any,index:number)=><div className={`largeTableRow ${index===0?"leader":""}`} key={row.id}><span>{index+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b></div>)}</div></section>;
}

function LeagueHistory({ seasons }: { seasons: SeasonHistory[] }) {
  const [selectedId, setSelectedId] = useState(seasons.find((season) => !season.isCurrent)?.id ?? seasons[0]?.id ?? "");
  const selected = seasons.find((season) => season.id === selectedId) ?? seasons[0];
  return <section className="pagePanel panel brandedPanel historyPanel">
    <div className="pageHeading"><div><span>EST 2024 · SEASON ARCHIVE</span><h2>League History</h2><p>View previous seasons, final tables and winners as each archive is completed.</p></div></div>
    <div className="seasonCards">
      {seasons.map((season) => <button key={season.id} className={selected?.id === season.id ? "active" : ""} onClick={() => setSelectedId(season.id)}>
        <span>{season.isCurrent ? "CURRENT SEASON" : "ARCHIVE"}</span>
        <strong>{season.label}</strong>
        <small>{season.gameweeks} gameweek{season.gameweeks === 1 ? "" : "s"} · {season.completedPicks} scored pick{season.completedPicks === 1 ? "" : "s"}</small>
      </button>)}
    </div>
    {selected && selected.standings.length > 0 ? <>
      <div className="historyWinner"><span>{selected.isCurrent ? "CURRENT LEADER" : "SEASON WINNER"}</span><strong>{selected.standings[0].name}</strong><b>{selected.standings[0].points} pts</b></div>
      <div className="largeTable"><div className="largeTableRow header"><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>0-0</span><span>PTS</span></div>{selected.standings.map((row,index)=><div className={`largeTableRow ${index===0?"leader":""}`} key={row.id}><span>{index+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b></div>)}</div>
    </> : <div className="emptyState historyEmpty"><strong>{selected?.label}</strong><span>No archived gameweek results have been imported for this season yet.</span></div>}
  </section>;
}

function Results({ fixtures, predictions, profiles }: any) {
  const completed=fixtures.filter((fixture:Fixture)=>["FT","AET","PEN"].includes(fixture.status));
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>COMPLETED FIXTURES</span><h2>Results</h2></div></div>{completed.map((fixture:Fixture)=>{const prediction=predictions.find((p:Prediction)=>p.fixture_id===fixture.id);const player=profiles.find((p:Profile)=>p.id===prediction?.member_id);return <div className="largeResult" key={fixture.id}><span>{player?.display_name??"Unselected"}</span><strong>{fixture.home_team}</strong><b>{fixture.home_score} - {fixture.away_score}</b><strong>{fixture.away_team}</strong><i className={prediction?.points_awarded===3?"yes":"no"}>{prediction?.points_awarded==null?"—":`${prediction.points_awarded>0?"+":""}${prediction.points_awarded} PTS`}</i></div>})}{!completed.length&&<div className="emptyState">No completed results yet.</div>}</section>;
}

function Players({ profiles, predictions, adjustments, fixtures, gameweek }: any) {
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>LEAGUE MEMBERS</span><h2>Players</h2><p>{predictions.filter((p:Prediction)=>p.gameweek_id===gameweek?.id).length} of {profiles.length} have submitted a pick.</p></div></div><div className="playerGrid">{profiles.map((profile:Profile)=>{const prediction=predictions.find((p:Prediction)=>p.member_id===profile.id&&p.gameweek_id===gameweek?.id);const adjustment=(adjustments as ScoreAdjustment[]).find((item)=>item.member_id===profile.id&&item.gameweek_id===gameweek?.id);const fixture=fixtures.find((f:Fixture)=>f.id===prediction?.fixture_id);return <article key={profile.id}><span>{initials(profile.display_name)}</span><div><strong>{profile.display_name}</strong><small>{fixture?`${fixture.home_team} v ${fixture.away_team} · ${fixture.odds_fractional??"Odds unavailable"}`:adjustment?`${adjustment.reason}: ${adjustment.points>0?"+":""}${adjustment.points} point${Math.abs(adjustment.points)===1?"":"s"}`:"Awaiting selection"}</small></div><b className={fixture?"picked":adjustment?"missed":"pending"}>{fixture?"PICKED ✓":adjustment?`MISSED ${adjustment.points>0?"+":""}${adjustment.points}`:"PENDING"}</b></article>})}</div></section>;
}

function AdminPanel({ active, setActive, gameweek, fixtures, profiles, predictions, adjustments, onChanged, notice }: any) {
  return <section className="pagePanel panel brandedPanel adminPanel"><div className="pageHeading"><div><span>ADMIN CONTROL</span><h2>League Management</h2><p>Manage users, selections, fixtures, results and gameweek settings.</p></div></div><div className="adminTabs"><button className={active==="users"?"active":""} onClick={()=>setActive("users")}>Users</button><button className={active==="selections"?"active":""} onClick={()=>setActive("selections")}>Selections</button><button className={active==="fixtures"?"active":""} onClick={()=>setActive("fixtures")}>Fixtures</button><button className={active==="results"?"active":""} onClick={()=>setActive("results")}>Results</button><button className={active==="gameweek"?"active":""} onClick={()=>setActive("gameweek")}>Gameweek</button></div>{active==="users"&&<AdminUsers notice={notice}/>} {active==="selections"&&<AdminSelections gameweek={gameweek} profiles={profiles} fixtures={fixtures} predictions={predictions} adjustments={adjustments} onChanged={onChanged} notice={notice}/>} {active==="fixtures"&&<AdminFixtures gameweek={gameweek} onChanged={onChanged} notice={notice}/>} {active==="results"&&<AdminResults fixtures={fixtures} onChanged={onChanged} notice={notice}/>} {active==="gameweek"&&<AdminGameweek gameweek={gameweek} onChanged={onChanged} notice={notice}/>}</section>;
}

function AdminUsers({ notice }: { notice: (message:string)=>void }) {
  const [users,setUsers]=useState<UserAdminRow[]>([]);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState("");
  useEffect(()=>{void (async()=>{const response=await fetch("/api/admin/users",{headers:{authorization:`Bearer ${await token()}`}});const payload=await response.json();if(response.ok)setUsers(payload.users);else notice(payload.error);setLoading(false);})();},[]);
  function update(id:string,patch:Partial<UserAdminRow>){setUsers(current=>current.map(user=>user.id===id?{...user,...patch}:user));}
  function generate(user:UserAdminRow){update(user.id,{password:`bounce${user.slot_number}${Math.floor(10+Math.random()*90)}`});}
  async function save(user:UserAdminRow){setSaving(user.id);const response=await fetch("/api/admin/users",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:user.id,username:user.username,displayName:user.display_name,role:user.role,active:user.active,password:user.password})});const payload=await response.json();notice(response.ok?`${user.username} saved`:payload.error);setSaving("");}
  async function copy(user:UserAdminRow){await navigator.clipboard.writeText(`${user.display_name}\nUsername: ${user.username}\nPassword: ${user.password}`);notice("Login details copied");}
  if(loading)return <div className="emptyState">Loading users…</div>;
  return <div className="userAdminList"><div className="adminNote">Passwords are visible only to logged-in admins and can be changed at any time.</div>{users.map(user=><article className="userAdminRow" key={user.id}><div className="slotBadge">{user.slot_number}</div><label>Username<input value={user.username} disabled={user.slot_number===1} onChange={e=>update(user.id,{username:e.target.value})}/></label><label>Assigned player<input value={user.display_name} disabled={user.slot_number===1} onChange={e=>update(user.id,{display_name:e.target.value})}/></label><label>Role<select value={user.role} disabled={user.slot_number===1} onChange={e=>update(user.id,{role:e.target.value as "admin"|"member"})}><option value="member">Member</option><option value="admin">Admin</option></select></label><label>Password<input value={user.password} onChange={e=>update(user.id,{password:e.target.value})}/></label><label className="activeToggle"><input type="checkbox" checked={user.active} disabled={user.slot_number===1} onChange={e=>update(user.id,{active:e.target.checked})}/> Active</label><div className="userActions"><button onClick={()=>generate(user)}>Generate</button><button onClick={()=>copy(user)}>Copy</button><button className="save" disabled={saving===user.id} onClick={()=>save(user)}>{saving===user.id?"Saving…":"Save"}</button></div></article>)}</div>;
}

function AdminSelections({ gameweek, profiles, fixtures, predictions, adjustments, onChanged, notice }: any) {
  const activeProfiles = (profiles as Profile[]).filter((profile) => profile.active).sort((a, b) => (a.slot_number ?? 99) - (b.slot_number ?? 99));
  const currentPredictions = (predictions as Prediction[]).filter((prediction) => prediction.gameweek_id === gameweek?.id);
  const currentAdjustments = (adjustments as ScoreAdjustment[]).filter((adjustment) => adjustment.gameweek_id === gameweek?.id);
  const [memberId, setMemberId] = useState(activeProfiles[0]?.id ?? "");
  const existingPrediction = currentPredictions.find((prediction) => prediction.member_id === memberId);
  const existingAdjustment = currentAdjustments.find((adjustment) => adjustment.member_id === memberId);
  const [fixtureId, setFixtureId] = useState(existingPrediction?.fixture_id ?? "");
  const [fixtureSearch, setFixtureSearch] = useState("");
  const [adjustmentPoints, setAdjustmentPoints] = useState(String(existingAdjustment?.points ?? -1));
  const [adjustmentReason, setAdjustmentReason] = useState(existingAdjustment?.reason ?? "Missed selection");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const existing = currentPredictions.find((prediction) => prediction.member_id === memberId);
    const adjustment = currentAdjustments.find((item) => item.member_id === memberId);
    setFixtureId(existing?.fixture_id ?? "");
    setAdjustmentPoints(String(adjustment?.points ?? -1));
    setAdjustmentReason(adjustment?.reason ?? "Missed selection");
  }, [memberId]);

  const adminFilteredFixtures = useMemo(() => {
    const query = fixtureSearch.trim().toLowerCase();
    return (fixtures as Fixture[]).filter((fixture) => !query || `${fixture.home_team} ${fixture.away_team} ${fixture.competition}`.toLowerCase().includes(query)).sort(sortFixturesForBookmaker);
  }, [fixtures, fixtureSearch]);
  const sortedCompetitions = useMemo(() => Array.from(new Set(adminFilteredFixtures.map((fixture) => fixture.competition))), [adminFilteredFixtures]);
  const selectedMember = activeProfiles.find((profile) => profile.id === memberId);

  async function saveSelection() {
    if (!gameweek || !memberId || !fixtureId) return notice("Choose a player and fixture.");
    setBusy(true);
    const response = await fetch("/api/admin/predictions", {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ gameweekId: gameweek.id, memberId, fixtureId }),
    });
    const payload = await response.json();
    notice(response.ok ? `${selectedMember?.display_name ?? "Player"} selection saved` : payload.error);
    setBusy(false);
    if (response.ok) onChanged();
  }

  async function removeSelection() {
    if (!gameweek || !memberId || !existingPrediction) return notice("This player has no selection to remove.");
    if (!window.confirm(`Remove ${selectedMember?.display_name ?? "this player's"} current selection?`)) return;
    setBusy(true);
    const response = await fetch("/api/admin/predictions", {
      method: "DELETE",
      headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ gameweekId: gameweek.id, memberId }),
    });
    const payload = await response.json();
    notice(response.ok ? "Selection removed" : payload.error);
    setBusy(false);
    if (response.ok) onChanged();
  }

  async function saveAdjustment() {
    if (!gameweek || !memberId || !Number.isInteger(Number(adjustmentPoints))) return notice("Enter a whole-number points adjustment.");
    setBusy(true);
    const response = await fetch("/api/admin/adjustments", {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ gameweekId: gameweek.id, memberId, points: Number(adjustmentPoints), reason: adjustmentReason }),
    });
    const payload = await response.json();
    notice(response.ok ? `${selectedMember?.display_name ?? "Player"} points adjustment saved` : payload.error);
    setBusy(false);
    if (response.ok) onChanged();
  }

  async function removeAdjustment() {
    if (!gameweek || !memberId || !existingAdjustment) return notice("This player has no points adjustment.");
    setBusy(true);
    const response = await fetch("/api/admin/adjustments", {
      method: "DELETE",
      headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ gameweekId: gameweek.id, memberId }),
    });
    const payload = await response.json();
    notice(response.ok ? "Points adjustment removed" : payload.error);
    setBusy(false);
    if (response.ok) onChanged();
  }

  if (!gameweek) return <div className="emptyState">Create a gameweek before entering selections.</div>;

  return <div className="adminSelectionLayout">
    <div className="adminSelectionForm">
      <div className="adminNote">A player who misses the deadline automatically receives −1. Admins can change that value, remove it, or enter a late selection on the player&apos;s behalf. A valid selection removes the automatic missed-pick penalty.</div>
      <label>Player
        <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
          {activeProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.slot_number}. {profile.display_name}</option>)}
        </select>
      </label>
      <label>Search fixtures
        <input type="search" value={fixtureSearch} onChange={(event) => setFixtureSearch(event.target.value)} placeholder="Type a team or competition…" autoComplete="off" />
      </label>
      <label>Fixture
        <select value={fixtureId} onChange={(event) => setFixtureId(event.target.value)}>
          <option value="">Choose an available fixture</option>
          {sortedCompetitions.map((competition) => <optgroup key={competition} label={competition}>
            {adminFilteredFixtures.filter((fixture) => fixture.competition === competition).map((fixture) => {
              const taken = currentPredictions.find((prediction) => prediction.fixture_id === fixture.id && prediction.member_id !== memberId);
              const takenBy = taken ? activeProfiles.find((profile) => profile.id === taken.member_id)?.display_name : "";
              return <option key={fixture.id} value={fixture.id} disabled={Boolean(taken)}>{fixture.home_team} v {fixture.away_team}{fixture.odds_fractional ? ` · ${fixture.odds_fractional}` : ""}{takenBy ? ` · TAKEN BY ${takenBy}` : ""}</option>;
            })}
          </optgroup>)}
        </select>
      </label>
      <div className="adminSelectionActions">
        <button className="primaryButton" disabled={busy || !memberId || !fixtureId} onClick={saveSelection}>{busy ? "Saving…" : existingPrediction ? "Replace selection" : "Add selection"}</button>
        <button className="dangerButton" disabled={busy || !existingPrediction} onClick={removeSelection}>Remove selection</button>
      </div>
      <div className="adminAdjustmentBox">
        <h3>Missed-selection / manual points</h3>
        <div className="formGrid">
          <label>Points<input type="number" step="1" value={adjustmentPoints} onChange={(event) => setAdjustmentPoints(event.target.value)} /></label>
          <label>Reason<input value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} /></label>
        </div>
        <div className="adminSelectionActions">
          <button className="save" disabled={busy || !memberId} onClick={saveAdjustment}>{existingAdjustment ? "Amend points" : "Add points adjustment"}</button>
          <button disabled={busy || !existingAdjustment} onClick={removeAdjustment}>Remove adjustment</button>
        </div>
      </div>
    </div>
    <div className="adminPickList">
      <h3>Gameweek {gameweek.number} selections</h3>
      {activeProfiles.map((profile) => {
        const prediction = currentPredictions.find((item) => item.member_id === profile.id);
        const adjustment = currentAdjustments.find((item) => item.member_id === profile.id);
        const fixture = (fixtures as Fixture[]).find((item) => item.id === prediction?.fixture_id);
        return <button key={profile.id} className={`adminPickRow ${profile.id === memberId ? "active" : ""}`} onClick={() => setMemberId(profile.id)}>
          <span>{profile.slot_number}</span>
          <div><strong>{profile.display_name}</strong><small>{fixture ? `${fixture.home_team} v ${fixture.away_team}` : adjustment ? `${adjustment.reason} · ${adjustment.points > 0 ? "+" : ""}${adjustment.points}` : "No selection entered"}</small></div>
          <b className={fixture ? "picked" : adjustment ? "missed" : "pending"}>{fixture ? "PICKED ✓" : adjustment ? `${adjustment.points > 0 ? "+" : ""}${adjustment.points} PTS` : "PENDING"}</b>
        </button>;
      })}
    </div>
  </div>;
}

function AdminFixtures({ gameweek, onChanged, notice }: any) {
  const [form,setForm]=useState({competition:"Scottish Premiership",country:"Scotland",homeTeam:"",awayTeam:"",kickoffLocal:"",oddsFractional:""});const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();if(!gameweek)return;setBusy(true);const kickoffAt=new Date(form.kickoffLocal).toISOString();const response=await fetch("/api/admin/fixtures",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({...form,kickoffAt,gameweekId:gameweek.id})});const payload=await response.json();notice(response.ok?"Fixture added":payload.error);setBusy(false);if(response.ok)onChanged();}
  return <form className="adminForm" onSubmit={submit}><div className="adminNote">Add any eligible UK Saturday 3pm match. Hearts and Hibs fixtures are excluded. Fractional odds can be entered now or later.</div><div className="formGrid"><label>Competition<input value={form.competition} onChange={e=>setForm({...form,competition:e.target.value})}/></label><label>Country<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label><label>Home team<input value={form.homeTeam} onChange={e=>setForm({...form,homeTeam:e.target.value})} required/></label><label>Away team<input value={form.awayTeam} onChange={e=>setForm({...form,awayTeam:e.target.value})} required/></label><label>Kickoff<input type="datetime-local" value={form.kickoffLocal} onChange={e=>setForm({...form,kickoffLocal:e.target.value})} required/></label><label>BTTS fractional odds<input placeholder="e.g. 8/11" value={form.oddsFractional} onChange={e=>setForm({...form,oddsFractional:e.target.value})}/></label></div><button className="primaryButton" disabled={busy||!gameweek}>{busy?"Adding…":"Add fixture"}</button></form>;
}

function AdminResults({ fixtures, onChanged, notice }: any) {
  const [scores,setScores]=useState<Record<string,{home:string;away:string}>>(()=>Object.fromEntries(fixtures.map((f:Fixture)=>[f.id,{home:f.home_score?.toString()??"",away:f.away_score?.toString()??""}])));
  async function save(fixture:Fixture){const score=scores[fixture.id];const response=await fetch("/api/admin/results",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({fixtureId:fixture.id,homeScore:Number(score?.home),awayScore:Number(score?.away)})});const payload=await response.json();notice(response.ok?"Result and points saved":payload.error);if(response.ok)onChanged();}
  return <div className="adminResults">{fixtures.map((fixture:Fixture)=><div className="adminResultRow" key={fixture.id}><div><small>{fixture.competition}</small><strong>{fixture.home_team} v {fixture.away_team}</strong></div><input type="number" min="0" value={scores[fixture.id]?.home??""} onChange={e=>setScores({...scores,[fixture.id]:{...scores[fixture.id],home:e.target.value}})}/><b>–</b><input type="number" min="0" value={scores[fixture.id]?.away??""} onChange={e=>setScores({...scores,[fixture.id]:{...scores[fixture.id],away:e.target.value}})}/><button onClick={()=>save(fixture)}>Save FT</button></div>)}{!fixtures.length&&<div className="emptyState">Add fixtures first.</div>}</div>;
}

function AdminGameweek({ gameweek, onChanged, notice }: any) {
  const [status,setStatus]=useState(gameweek?.status??"open");
  const [locksAt,setLocksAt]=useState(gameweek?inputDateTime(gameweek.locks_at):nextFridayAtFiveInput());
  const [nextLocksAt,setNextLocksAt]=useState(nextFridayAtFiveInput());
  const [busy,setBusy]=useState(false);
  async function save(){if(!gameweek||!locksAt)return;setBusy(true);const response=await fetch("/api/admin/gameweek",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:gameweek.id,status,locksAt:new Date(locksAt).toISOString()})});const payload=await response.json();notice(response.ok?"Gameweek updated":payload.error);setBusy(false);if(response.ok)onChanged();}
  async function createNext(){if(!nextLocksAt)return notice("Choose the next deadline first.");setBusy(true);const response=await fetch("/api/admin/gameweek",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({locksAt:new Date(nextLocksAt).toISOString()})});const payload=await response.json();notice(response.ok?`Gameweek ${payload.gameweek.number} created`:payload.error);setBusy(false);if(response.ok)onChanged();}
  return <div className="adminForm"><div className="adminNote">The standard deadline is Friday at 5:00pm UK time. Admins can still change it or lock the gameweek manually.</div><div className="formGrid"><label>Status<select value={status} onChange={e=>setStatus(e.target.value)} disabled={!gameweek}><option value="open">Open</option><option value="locked">Locked</option><option value="complete">Complete</option></select></label><label>Current pick deadline<input type="datetime-local" value={locksAt} onChange={e=>setLocksAt(e.target.value)}/></label><label>Next gameweek deadline<input type="datetime-local" value={nextLocksAt} onChange={e=>setNextLocksAt(e.target.value)}/><small>Defaults to Friday at 17:00 UK time.</small></label></div><div className="userActions"><button className="save" disabled={busy||!gameweek} onClick={save}>{busy?"Saving…":"Save current gameweek"}</button><button disabled={busy||!nextLocksAt} onClick={createNext}>Create next gameweek</button></div></div>;
}
