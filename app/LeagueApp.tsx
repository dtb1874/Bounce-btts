"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { combinedFractional } from "@/lib/fractional";
import ShareTableButton from "./ShareTableButton";
import WeeklyPicksShareButton from "./WeeklyPicksShareButton";
import { historicalSeasons, rollOfHonour } from "@/lib/history-data";

type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "history" | "players" | "alerts" | "admin";
type AdminView = "users" | "selections" | "fixtures" | "results" | "gameweek" | "seasons";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: "ultimate_admin" | "admin" | "member";
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
  is_eligible: boolean;
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
  { id: "pick", label: "Make My Pick", icon: "⚑" },
  { id: "fixtures", label: "Fixtures", icon: "▦" },
  { id: "table", label: "League Table", icon: "☷" },
  { id: "results", label: "Results", icon: "✦" },
  { id: "history", label: "League History", icon: "◷" },
  { id: "players", label: "Players", icon: "◉" },
  { id: "alerts", label: "Alerts", icon: "!" },
  { id: "admin", label: "Admin", icon: "⚙" },
];

const competitionPriority: Array<{ rank: number; names: string[] }> = [
  // These competitions move above the current list automatically when fixtures exist.
  { rank: 0, names: ["England Premier League", "Premier League"] },
  { rank: 1, names: ["England Championship", "EFL Championship"] },
  { rank: 2, names: ["England League One", "EFL League One"] },
  { rank: 3, names: ["England League Two", "EFL League Two"] },

  // Current Bet365 UK order supplied by the league administrator.
  { rank: 10, names: ["England EFL Cup", "EFL Cup", "Carabao Cup"] },
  { rank: 11, names: ["Scotland Premiership", "Scottish Premiership"] },
  { rank: 12, names: ["England National League", "National League"] },
  { rank: 13, names: ["England National League North", "National League North"] },
  { rank: 14, names: ["England National League South", "National League South"] },
  { rank: 15, names: ["Northern Ireland Premier", "Northern Ireland Premiership", "NIFL Premiership"] },
  { rank: 16, names: ["Northern Ireland Championship", "NIFL Championship"] },
  { rank: 17, names: ["Scotland Championship", "Scottish Championship"] },
  { rank: 18, names: ["Scotland League One", "Scottish League One"] },
  { rank: 19, names: ["Scotland League Two", "Scottish League Two"] },
  { rank: 20, names: ["Wales Premier League", "Cymru Premier"] },

  { rank: 30, names: ["FA Cup"] },
  { rank: 31, names: ["Scottish Cup", "Scotland Scottish Cup"] },
];

function normaliseCompetition(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function competitionRank(name: string) {
  const normalised = normaliseCompetition(name);
  for (const group of competitionPriority) {
    if (group.names.some((alias) => normalised === normaliseCompetition(alias))) return group.rank;
  }
  return 999;
}

function sortFixturesForBookmaker(a: Fixture, b: Fixture) {
  return competitionRank(a.competition) - competitionRank(b.competition)
    || a.competition.localeCompare(b.competition)
    || a.kickoff_at.localeCompare(b.kickoff_at)
    || a.home_team.localeCompare(b.home_team);
}

function sortFixturesByKickoffThenCompetition(a: Fixture, b: Fixture) {
  return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
    || competitionRank(a.competition) - competitionRank(b.competition)
    || a.competition.localeCompare(b.competition)
    || a.home_team.localeCompare(b.home_team)
    || a.away_team.localeCompare(b.away_team);
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

function gameweekStatusText(gameweek: Gameweek | null | undefined, now: number) {
  if (!gameweek) return "NO GAMEWEEK";
  const opens = gameweek.opens_at ? new Date(gameweek.opens_at).getTime() : null;
  const locks = new Date(gameweek.locks_at).getTime();
  if (gameweek.status === "complete") return "COMPLETED";
  if (gameweek.status === "locked" || now >= locks) return `CLOSED · Locked ${formatKickoff(gameweek.locks_at)}`;
  if (opens && now < opens) return `OPENS ${formatKickoff(gameweek.opens_at as string)}`;
  return `OPEN · Locks ${formatKickoff(gameweek.locks_at)}`;
}

async function token() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

export default function LeagueApp({
  initialProfile,
  initialProfiles,
  initialGameweek,
  initialGameweeks,
  initialFixtures,
  initialAllFixtures,
  initialPredictions,
  initialAdjustments,
  seasonLabel,
  entryFee,
  seasonHistory,
}: {
  initialProfile: Profile;
  initialProfiles: Profile[];
  initialGameweek: Gameweek | null;
  initialGameweeks: Gameweek[];
  initialFixtures: Fixture[];
  initialAllFixtures: Fixture[];
  initialPredictions: Prediction[];
  initialAdjustments: ScoreAdjustment[];
  seasonLabel: string;
  entryFee: number;
  seasonHistory: SeasonHistory[];
}) {
  const [view, setView] = useState<View>("dashboard");
  const [adminView, setAdminView] = useState<AdminView>(initialProfile.role === "ultimate_admin" ? "users" : "selections");
  const [mobileMenu, setMobileMenu] = useState(false);
  const allSeasonFixtures = initialFixtures;
  const allFixtures = initialAllFixtures;
  const [predictions, setPredictions] = useState(initialPredictions);
  const adjustments = initialAdjustments;
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const profiles = initialProfiles.filter((profile) => profile.active);
  const [selectedGameweekId, setSelectedGameweekId] = useState(initialGameweek?.id ?? initialGameweeks[0]?.id ?? "");
  const [dashboardGameweekId, setDashboardGameweekId] = useState("");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [unresolvedAlerts, setUnresolvedAlerts] = useState(0);

  useEffect(() => {
    const savedView = window.sessionStorage.getItem("bounce:view") as View | null;
    const savedAdminView = window.sessionStorage.getItem("bounce:adminView") as AdminView | null;
    const savedGameweek = window.sessionStorage.getItem("bounce:gameweek");
    if (savedView) setView(savedView);
    if (savedAdminView) setAdminView(savedAdminView);
    if (savedGameweek && initialGameweeks.some((item) => item.id === savedGameweek)) setSelectedGameweekId(savedGameweek);
  }, [initialGameweeks]);

  useEffect(() => { window.sessionStorage.setItem("bounce:view", view); }, [view]);
  useEffect(() => { window.sessionStorage.setItem("bounce:adminView", adminView); }, [adminView]);
  useEffect(() => { if (selectedGameweekId) window.sessionStorage.setItem("bounce:gameweek", selectedGameweekId); }, [selectedGameweekId]);
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const response = await fetch("/api/admin/alerts", { headers: { authorization: `Bearer ${await token()}` } });
      if (response.ok) { const payload = await response.json(); setUnresolvedAlerts((payload.alerts ?? []).filter((item: any) => !item.resolved).length); }
    })();
  }, [view]);

  const gameweek = initialGameweeks.find((item) => item.id === selectedGameweekId) ?? initialGameweek;
  const currentDashboardGameweek = useMemo(() => {
    const now = Date.now();
    const opened = initialGameweeks
      .filter((item) => !item.opens_at || new Date(item.opens_at).getTime() <= now)
      .sort((a, b) => b.number - a.number);
    return opened[0] ?? initialGameweek ?? initialGameweeks[0] ?? null;
  }, [initialGameweeks, initialGameweek]);

  useEffect(() => {
    if (currentDashboardGameweek?.id) setDashboardGameweekId(currentDashboardGameweek.id);
  }, [currentDashboardGameweek?.id]);

  // The persistent gameweek selector controls the Dashboard as well as the other sections.
  // This keeps Everyone's Picks So Far, Your Pick, status and share output on the viewed gameweek.
  const dashboardGameweek = gameweek;
  const displayedGameweek = view === "dashboard" ? dashboardGameweek : gameweek;
  const fixtures = useMemo(() => allSeasonFixtures.filter((fixture) => fixture.gameweek_id === gameweek?.id), [allSeasonFixtures, gameweek?.id]);
  const dashboardFixtures = useMemo(() => allSeasonFixtures.filter((fixture) => fixture.gameweek_id === dashboardGameweek?.id), [allSeasonFixtures, dashboardGameweek?.id]);

  const predictionByFixture = useMemo(() => new Map(predictions.map((prediction) => [prediction.fixture_id, prediction])), [predictions]);
  const currentPrediction = gameweek ? predictions.find((prediction) => prediction.gameweek_id === gameweek.id && prediction.member_id === initialProfile.id) : undefined;
  const currentFixture = currentPrediction ? fixtures.find((fixture) => fixture.id === currentPrediction.fixture_id) : undefined;
  const currentAdjustment = gameweek ? adjustments.find((adjustment) => adjustment.gameweek_id === gameweek.id && adjustment.member_id === initialProfile.id) : undefined;
  const submitted = gameweek ? predictions.filter((prediction) => prediction.gameweek_id === gameweek.id).length : 0;
  const dashboardCurrentPrediction = dashboardGameweek ? predictions.find((prediction) => prediction.gameweek_id === dashboardGameweek.id && prediction.member_id === initialProfile.id) : undefined;
  const dashboardCurrentFixture = dashboardCurrentPrediction ? dashboardFixtures.find((fixture) => fixture.id === dashboardCurrentPrediction.fixture_id) : undefined;
  const dashboardCurrentAdjustment = dashboardGameweek ? adjustments.find((adjustment) => adjustment.gameweek_id === dashboardGameweek.id && adjustment.member_id === initialProfile.id) : undefined;
  const dashboardSubmitted = dashboardGameweek ? predictions.filter((prediction) => prediction.gameweek_id === dashboardGameweek.id).length : 0;
  const isAdmin = initialProfile.role === "admin" || initialProfile.role === "ultimate_admin";
  const isOpen = Boolean(gameweek && (isAdmin || (gameweek.status === "open" && (!gameweek.opens_at || new Date(gameweek.opens_at) <= new Date()) && new Date(gameweek.locks_at) > new Date())));
  const dashboardIsOpen = Boolean(dashboardGameweek && (isAdmin || (dashboardGameweek.status === "open" && (!dashboardGameweek.opens_at || new Date(dashboardGameweek.opens_at) <= new Date()) && new Date(dashboardGameweek.locks_at) > new Date())));
  const eligibleFixtures = useMemo(() => fixtures.filter((fixture) => fixture.is_eligible), [fixtures]);
  const competitions = useMemo(() => Array.from(new Set(eligibleFixtures.map((fixture) => fixture.competition))).sort((a, b) => competitionRank(a) - competitionRank(b) || a.localeCompare(b)), [eligibleFixtures]);

  const gameweekNumberById = useMemo(
    () => new Map(initialGameweeks.map((item) => [item.id, item.number])),
    [initialGameweeks]
  );

  function calculateStandingsThrough(cutoffGameweek: number | null) {
    const map = new Map(profiles.map((profile) => [profile.id, {
      id: profile.id, name: profile.display_name, played: 0, wins: 0, zeroZeroCount: 0, oneSided: 0, points: 0,
    }]));

    for (const prediction of predictions) {
      const predictionWeek = gameweekNumberById.get(prediction.gameweek_id);
      if (prediction.points_awarded === null || predictionWeek === undefined || (cutoffGameweek !== null && predictionWeek > cutoffGameweek)) continue;
      const row = map.get(prediction.member_id);
      if (!row) continue;
      row.played += 1;
      row.points += prediction.points_awarded;
      if (prediction.points_awarded === 3) row.wins += 1;
      if (prediction.points_awarded === 1) row.oneSided += 1;
      if (prediction.points_awarded === -1) row.zeroZeroCount += 1;
    }

    for (const adjustment of adjustments) {
      const adjustmentWeek = gameweekNumberById.get(adjustment.gameweek_id);
      if (adjustmentWeek === undefined || (cutoffGameweek !== null && adjustmentWeek > cutoffGameweek)) continue;
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
  }

  const standings = useMemo(
    () => calculateStandingsThrough(null),
    [profiles, predictions, adjustments, gameweekNumberById]
  );

  const dashboardIsFuture = Boolean(
    dashboardGameweek?.opens_at && new Date(dashboardGameweek.opens_at).getTime() > clockNow
  );
  const selectedIsFuture = Boolean(
    gameweek?.opens_at && new Date(gameweek.opens_at).getTime() > clockNow
  );

  const latestOpenedBeforeDashboard = initialGameweeks
    .filter((item) => item.number < (dashboardGameweek?.number ?? 0) && (!item.opens_at || new Date(item.opens_at).getTime() <= clockNow))
    .sort((a, b) => b.number - a.number)[0];

  const latestOpenedBeforeSelected = initialGameweeks
    .filter((item) => item.number < (gameweek?.number ?? 0) && (!item.opens_at || new Date(item.opens_at).getTime() <= clockNow))
    .sort((a, b) => b.number - a.number)[0];

  const dashboardTableThroughNumber = dashboardIsFuture
    ? latestOpenedBeforeDashboard?.number ?? 0
    : dashboardGameweek?.number ?? null;
  const selectedTableThroughNumber = selectedIsFuture
    ? latestOpenedBeforeSelected?.number ?? 0
    : gameweek?.number ?? null;

  const dashboardStandings = useMemo(
    () => calculateStandingsThrough(dashboardTableThroughNumber),
    [profiles, predictions, adjustments, gameweekNumberById, dashboardTableThroughNumber]
  );
  const selectedStandings = useMemo(
    () => calculateStandingsThrough(selectedTableThroughNumber),
    [profiles, predictions, adjustments, gameweekNumberById, selectedTableThroughNumber]
  );

  const dashboardForm = useMemo(() => {
    const formWeeks = initialGameweeks
      .filter((item) => item.number <= (dashboardTableThroughNumber ?? 0))
      .sort((a, b) => b.number - a.number)
      .slice(0, 5)
      .reverse();

    return {
      weeks: formWeeks,
      rows: profiles.map((profile) => ({
        id: profile.id,
        name: profile.display_name,
        results: formWeeks.map((week) => {
          const prediction = predictions.find((item) =>
            item.member_id === profile.id &&
            item.gameweek_id === week.id &&
            item.points_awarded !== null
          );
          if (prediction) {
            if (prediction.points_awarded === 3) return { code: "W", className: "win", title: "BTTS win (+3)" };
            if (prediction.points_awarded === 1) return { code: "S-N", className: "scoreNil", title: "Score–nil (+1)" };
            if (prediction.points_awarded === -1) return { code: "0-0", className: "zeroZero", title: "0–0 (−1)" };
            return { code: String(prediction.points_awarded), className: "other", title: `${prediction.points_awarded} points` };
          }
          const adjustment = adjustments.find((item) => item.member_id === profile.id && item.gameweek_id === week.id);
          if (adjustment) return { code: "M", className: "missed", title: `${adjustment.reason} (${adjustment.points})` };
          return { code: "—", className: "empty", title: "No scored result" };
        }),
      })),
    };
  }, [initialGameweeks, profiles, predictions, adjustments, dashboardTableThroughNumber]);

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

  async function sharePicksFor(targetGameweek: Gameweek | null | undefined, targetFixtures: Fixture[]) {
    if (!targetGameweek) return;
    const selected = predictions.filter((prediction) => prediction.gameweek_id === targetGameweek.id);
    const orderedPicks = selected.map((prediction) => ({
      prediction,
      fixture: targetFixtures.find((item) => item.id === prediction.fixture_id),
      player: profiles.find((item) => item.id === prediction.member_id)?.display_name,
    })).filter((item): item is { prediction: Prediction; fixture: Fixture; player: string } => Boolean(item.fixture && item.player))
      .sort((a, b) => sortFixturesForBookmaker(a.fixture, b.fixture));
    const lines = [`BOUNCE BTTS LEAGUE — GW${targetGameweek.number}`, `Season ${seasonLabel}`, ""];
    for (const pick of orderedPicks) {
      lines.push(`${pick.player} — ${pick.fixture.home_team} v ${pick.fixture.away_team} — ${pick.fixture.odds_fractional ?? "Odds unavailable"}`);
    }
    lines.push("");
    lines.push(`Combined odds: ${combinedFractional(selected.map((prediction) => targetFixtures.find((fixture) => fixture.id === prediction.fixture_id)?.odds_fractional))}`);
    lines.push("Odds may change after the daily check.");
    const text = lines.join("\n");
    if (navigator.share) await navigator.share({ title: `Bounce BTTS GW${targetGameweek.number}`, text, url: `${window.location.origin}/table` });
    else { await navigator.clipboard.writeText(text); notice("Picks copied for WhatsApp"); }
  }

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  const dashboardGameweekIndex = dashboardGameweek
    ? initialGameweeks.findIndex((item) => item.id === dashboardGameweek.id)
    : -1;

  function selectDashboardGameweek(gameweekId: string) {
    setDashboardGameweekId(gameweekId);
    setSelectedGameweekId(gameweekId);
  }

  function moveDashboardGameweek(direction: -1 | 1) {
    if (dashboardGameweekIndex < 0) return;
    const next = initialGameweeks[dashboardGameweekIndex + direction];
    if (next) selectDashboardGameweek(next.id);
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
          {navItems.filter((item) => !["admin","alerts"].includes(item.id) || isAdmin).map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileMenu(false); }}><span>{item.icon}</span>{item.label}{item.id === "alerts" && unresolvedAlerts > 0 && <b className="navBadge">{unresolvedAlerts > 9 ? "9+" : unresolvedAlerts}</b>}</button>
          ))}
        </nav>
        <div className="sidebarWatermark" aria-hidden="true"><img src="/assets/st-giles-round.jpg" alt="" /></div>
        <button className="profileCard" onClick={signOut} title="Sign out">
          <span>{initials(initialProfile.display_name)}</span>
          <div><strong>{initialProfile.display_name}</strong><small>{initialProfile.role === "ultimate_admin" ? "Ultimate Admin" : initialProfile.role === "admin" ? "League Admin" : initialProfile.username}</small></div><b>↪</b>
        </button>
      </aside>
      {mobileMenu && <button className="menuScrim" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}

      <section className="mainArea">
        <header className="heroHeader">
          <div className="heroBackdrop" aria-hidden="true"><div className="skylineLayer"/><div className="mosaicLayer"/></div>
          <div className="heroText"><h1>BOUNCE</h1><h2>— BTTS LEAGUE —</h2><div className="heroRule"><span>♥</span></div><p>EDINBURGH · HEART OF MIDLOTHIAN · EST 2024</p></div>
          <div className="gameweekCard">
            <span>Season {seasonLabel}</span>
            <div className="dashboardGameweekControl">
              <button type="button" aria-label="Previous gameweek" disabled={initialGameweeks.findIndex((item) => item.id === selectedGameweekId) <= 0} onClick={() => { const i=initialGameweeks.findIndex((item)=>item.id===selectedGameweekId); if(i>0)setSelectedGameweekId(initialGameweeks[i-1].id); }}>‹</button>
              <label><span>Gameweek</span><select value={gameweek?.id ?? ""} onChange={(event) => setSelectedGameweekId(event.target.value)}>{initialGameweeks.map((item) => <option key={item.id} value={item.id}>GW {item.number}</option>)}</select></label>
              <button type="button" aria-label="Next gameweek" disabled={initialGameweeks.findIndex((item) => item.id === selectedGameweekId) < 0 || initialGameweeks.findIndex((item) => item.id === selectedGameweekId) >= initialGameweeks.length - 1} onClick={() => { const i=initialGameweeks.findIndex((item)=>item.id===selectedGameweekId); if(i>=0&&i<initialGameweeks.length-1)setSelectedGameweekId(initialGameweeks[i+1].id); }}>›</button>
            </div>
            <small>{gameweekStatusText(gameweek, clockNow)}</small>
          </div>
        </header>

        {view === "dashboard" && dashboardIsFuture && dashboardGameweek?.opens_at && (
          <FutureGameweekBanner gameweek={dashboardGameweek} now={clockNow} />
        )}

        {view === "dashboard" && <Dashboard gameweek={dashboardGameweek} currentFixture={dashboardCurrentFixture} currentAdjustment={dashboardCurrentAdjustment} fixtures={dashboardFixtures} profiles={profiles} predictions={predictions} standings={dashboardStandings} tableThroughNumber={dashboardTableThroughNumber} isFuture={dashboardIsFuture} form={dashboardForm} submitted={dashboardSubmitted} entryFee={entryFee} seasonLabel={seasonLabel} setView={setView} isOpen={dashboardIsOpen} />}
        {view === "pick" && <><FixturesPage mode="pick" fixtures={eligibleFixtures} predictions={predictions} profiles={profiles} gameweek={gameweek} myId={initialProfile.id} isOpen={isOpen} selectFixture={selectFixture} competitions={competitions} sharePicks={() => sharePicksFor(gameweek, fixtures)} /></>}
        {view === "fixtures" && <FixturesPage mode="all" fixtures={allFixtures} predictions={predictions} profiles={profiles} gameweek={gameweek} myId={initialProfile.id} isOpen={isOpen} selectFixture={selectFixture} competitions={[]} sharePicks={() => sharePicksFor(gameweek, fixtures)} />}
        {view === "table" && <LeagueTable standings={selectedStandings} seasonLabel={seasonLabel} gameweekNumber={gameweek?.number ?? null} tableThroughNumber={selectedTableThroughNumber} isFuture={selectedIsFuture} entryFee={entryFee} />}
        {view === "results" && <Results fixtures={fixtures} predictions={predictions} profiles={profiles} />}
        {view === "history" && <LeagueHistory seasons={seasonHistory} />}
        {view === "players" && <Players profiles={profiles} predictions={predictions} adjustments={adjustments} fixtures={fixtures} gameweek={gameweek} />}
        {view === "alerts" && isAdmin && <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>ADMIN NOTIFICATIONS</span><h2>Alerts</h2><p>Fixture changes and provider update status.</p></div></div><AdminAlerts notice={notice} /></section>}
        {view === "admin" && (initialProfile.role === "admin" || initialProfile.role === "ultimate_admin") && <AdminPanel isUltimateAdmin={initialProfile.role === "ultimate_admin"} active={adminView} setActive={setAdminView} gameweek={gameweek} gameweeks={initialGameweeks} selectedGameweekId={selectedGameweekId} setSelectedGameweekId={setSelectedGameweekId} fixtures={fixtures} profiles={profiles} predictions={predictions} adjustments={adjustments} onChanged={() => window.location.reload()} notice={notice} />}

        <footer className="siteFooter"><span>♡</span><strong>MADE BY THE ARTIST, FOR THE BOUNCE</strong></footer>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}


function FutureGameweekBanner({ gameweek, now }: { gameweek: Gameweek; now: number }) {
  const opensAt = gameweek.opens_at ? new Date(gameweek.opens_at).getTime() : now;
  const remaining = Math.max(0, opensAt - now);
  const totalMinutes = Math.floor(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  return (
    <div className="futureGameweekBanner" role="status">
      <strong>GAMEWEEK {gameweek.number} NOT OPEN</strong>
      <span>Opens {formatKickoff(gameweek.opens_at as string)}</span>
      <b>{days}d {hours}h {minutes}m</b>
    </div>
  );
}


function GameweekSelector({ gameweeks, selectedId, onChange, admin }: any) {
  return <div className="gameweekSelector"><label htmlFor={admin ? "admin-gameweek-select" : "pick-gameweek-select"}>View gameweek</label><select id={admin ? "admin-gameweek-select" : "pick-gameweek-select"} value={selectedId} onChange={(event)=>onChange(event.target.value)}>{gameweeks.map((item:Gameweek)=><option key={item.id} value={item.id}>GW {item.number} · {item.opens_at ? `opens ${formatKickoff(item.opens_at)}` : "open date not set"} · deadline {formatKickoff(item.locks_at)}</option>)}</select>{!admin&&gameweeks.find((item:Gameweek)=>item.id===selectedId)?.opens_at&&new Date(gameweeks.find((item:Gameweek)=>item.id===selectedId).opens_at as string)>new Date()&&<small>Selections open Monday at 8:00am UK time. You can view this gameweek now, but cannot submit yet.</small>}</div>;
}

function Dashboard({ gameweek, currentFixture, currentAdjustment, fixtures, profiles, predictions, standings, tableThroughNumber, isFuture, form, submitted, entryFee, seasonLabel, setView, isOpen }: any) {
  const recent = fixtures.filter((fixture: Fixture) => ["FT", "AET", "PEN"].includes(fixture.status));
  const gameweekPicks = profiles.map((profile: Profile) => {
    const prediction = predictions.find((item: Prediction) => item.gameweek_id === gameweek?.id && item.member_id === profile.id);
    const fixture = fixtures.find((item: Fixture) => item.id === prediction?.fixture_id);
    return { profile, fixture };
  });
  return <div className="dashboardGrid">
    <section className="contentColumn">
      <article className="panel currentPickPanel brandedPanel"><div className="panelTitle">YOUR PICK — {gameweek ? `GAMEWEEK ${gameweek.number}` : "NO ACTIVE GAMEWEEK"}</div>{currentFixture ? <div className="pickDisplay"><img className="pickBrandCrest" src="/assets/hearts-crest.png" alt=""/><div className="teamBadge">{initials(currentFixture.home_team)}</div><strong>{currentFixture.home_team}</strong><span className="versus">V</span><strong>{currentFixture.away_team}</strong><div className="teamBadge away">{initials(currentFixture.away_team)}</div><div className="pickSubmitted">✓ PICK SUBMITTED</div><small>{formatKickoff(currentFixture.kickoff_at)} · BTTS {currentFixture.odds_fractional ?? "Odds unavailable"}</small></div> : currentAdjustment ? <div className="missedPickDisplay"><strong>MISSED DEADLINE</strong><b>{currentAdjustment.points > 0 ? "+" : ""}{currentAdjustment.points} POINT{Math.abs(currentAdjustment.points) === 1 ? "" : "S"}</b><small>{currentAdjustment.reason}</small></div> : <button className="emptySelection" onClick={() => setView("pick")}>{isOpen ? "Make your Saturday 3pm BTTS pick" : "Selections are currently closed"}</button>}<div className="pickNotice">ⓘ One unique fixture per player. Picks can be changed until the gameweek deadline.</div></article>
      <article className="panel fixturesPanel brandedPanel mosaicPanel"><div className="panelTitle rowTitle"><span>EVERYONE'S PICKS SO FAR</span><button onClick={() => setView("players")}>View players →</button></div><div className="dashboardPicks">{gameweekPicks.map(({ profile, fixture }: { profile: Profile; fixture?: Fixture }) => <div className={`dashboardPickRow ${fixture ? "picked" : "pending"}`} key={profile.id}><div className="dashboardPickPlayer"><span>{initials(profile.display_name)}</span><strong>{profile.display_name}</strong></div>{fixture ? <><div className="dashboardPickFixture"><strong>{fixture.home_team} v {fixture.away_team}</strong><small>{fixture.competition}</small></div><div className="dashboardPickOdds"><span>BTTS</span><strong>{fixture.odds_fractional ?? "—"}</strong></div><b className="pickStatus">PICKED ✓</b></> : <><div className="dashboardPickFixture"><strong>Awaiting selection</strong><small>Gameweek {gameweek?.number ?? "—"}</small></div><div className="dashboardPickOdds"><span>BTTS</span><strong>—</strong></div><b className="pickStatus pending">PENDING</b></>}</div>)}{!profiles.length && <div className="emptyState">No active players.</div>}</div><div className="dashboardPicksActions"><WeeklyPicksShareButton disabled={isFuture} gameweekNumber={gameweek?.number ?? 0} seasonLabel={seasonLabel} picks={gameweekPicks.filter(({fixture}:{fixture?:Fixture})=>Boolean(fixture)).map(({profile,fixture}:{profile:Profile;fixture?:Fixture})=>({player:profile.display_name,homeTeam:fixture!.home_team,awayTeam:fixture!.away_team,competition:fixture!.competition,kickoffAt:fixture!.kickoff_at,odds:fixture!.odds_fractional}))} /></div></article>
      <article className="panel formPanel brandedPanel">
        <div className="panelTitle rowTitle">
          <span>FORM — THROUGH GW {tableThroughNumber ?? "—"}</span>
          <small>Last five scored gameweeks</small>
        </div>
        <div className="formTable">
          <div className="formTableRow header">
            <span>PLAYER</span>
            {form.weeks.map((week: Gameweek) => <b key={week.id}>GW{week.number}</b>)}
          </div>
          {form.rows.map((row: any) => (
            <div className="formTableRow" key={row.id}>
              <strong>{row.name}</strong>
              {row.results.map((result: any, index: number) => (
                <span key={`${row.id}-${index}`} className={`formBadge ${result.className}`} title={result.title}>{result.code}</span>
              ))}
            </div>
          ))}
        </div>
        <div className="formLegend"><span className="formBadge win">W</span> BTTS <span className="formBadge scoreNil">S-N</span> Score–nil <span className="formBadge zeroZero">0-0</span> 0–0 <span className="formBadge missed">M</span> Missed</div>
      </article>
    </section>
    <aside className="rightColumn">
      <article className="panel statusPanel brandedPanel"><div className="panelTitle">GAMEWEEK STATUS</div><div className="statusNumbers"><strong>{submitted}</strong><span>of {profiles.length} picks submitted</span></div><div className="progressTrack"><i style={{width:`${profiles.length ? submitted/profiles.length*100 : 0}%`}}/></div><small>Prize pot: £{(profiles.filter((p:Profile)=>!/^user\d+$/i.test(p.display_name.trim())).length * entryFee).toFixed(0)}</small></article>
      <article className="panel tablePanel brandedPanel"><div className="panelTitle">{isFuture ? `STANDINGS BEFORE GW ${gameweek?.number}` : `LEAGUE TABLE AFTER GW ${tableThroughNumber ?? gameweek?.number ?? "—"}`}</div><div className="miniTable"><div className="miniTableRow header"><span>POS</span><span>PLAYER</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span></div>{standings.slice(0,8).map((row: any,index:number)=><div className={`miniTableRow ${index===0?"leader":""}`} key={row.id}><span>{index+1}</span><strong>{row.name}</strong><span>{row.wins}</span><span>{row.oneSided}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b></div>)}</div><div className="tablePanelActions"><button className="panelFooterButton" onClick={() => setView("table")}>View full table →</button><ShareTableButton compact rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweek?.number ?? null} prizePot={profiles.filter((p:Profile)=>!/^user\d+$/i.test(p.display_name.trim())).length * entryFee} /></div></article>
      <article className="panel resultsPanel brandedPanel"><div className="panelTitle">LATEST RESULTS</div>{recent.slice(0,5).map((fixture: Fixture)=><div className="resultRow" key={fixture.id}><span>GW{gameweek?.number}</span><strong>{fixture.home_team}</strong><b>{fixture.home_score} - {fixture.away_score}</b><strong>{fixture.away_team}</strong><i className={(fixture.home_score??0)>0&&(fixture.away_score??0)>0?"yes":"no"}>{(fixture.home_score??0)>0&&(fixture.away_score??0)>0?"✓":"–"}</i></div>)}{!recent.length&&<div className="emptyState compact">No completed results yet.</div>}</article>
    </aside>
  </div>;
}

function FixturesPage({ mode, fixtures, predictions, profiles, gameweek, myId, isOpen, selectFixture, competitions, sharePicks }: any) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const isPicker = mode === "pick";
  const filtered = (fixtures as Fixture[]).filter((fixture) => !query || `${fixture.home_team} ${fixture.away_team} ${fixture.competition}`.toLowerCase().includes(query));

  if (!isPicker) {
    const dayFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const byDay = new Map<string, Fixture[]>();
    for (const fixture of [...filtered].sort(sortFixturesByKickoffThenCompetition)) {
      const key = dateKeyFormatter.format(new Date(fixture.kickoff_at));
      byDay.set(key, [...(byDay.get(key) ?? []), fixture]);
    }

    return <section className="pagePanel panel brandedPanel fixturesListPage">
      <div className="pageHeading"><div><span>TWO-WEEK FIXTURE LIST</span><h2>Fixtures</h2><p>Expand a day, then expand a league. Leagues are ordered by their earliest kickoff, followed by the Bet365-style UK competition order.</p></div></div>
      <div className="fixtureSearch"><label htmlFor="fixture-search-all">Search fixtures</label><input id="fixture-search-all" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type a team or competition…" autoComplete="off" /></div>
      {Array.from(byDay.entries()).map(([dateKey, dayFixtures], dayIndex) => {
        const dayDate = new Date(dayFixtures[0].kickoff_at);
        const byCompetition = new Map<string, Fixture[]>();
        for (const fixture of dayFixtures) {
          byCompetition.set(fixture.competition, [...(byCompetition.get(fixture.competition) ?? []), fixture]);
        }
        const competitionGroups = Array.from(byCompetition.entries()).sort(([, fixturesA], [, fixturesB]) => {
          const firstA = Math.min(...fixturesA.map((fixture) => new Date(fixture.kickoff_at).getTime()));
          const firstB = Math.min(...fixturesB.map((fixture) => new Date(fixture.kickoff_at).getTime()));
          return firstA - firstB
            || competitionRank(fixturesA[0].competition) - competitionRank(fixturesB[0].competition)
            || fixturesA[0].competition.localeCompare(fixturesB[0].competition);
        });

        return <details className="fixtureDaySection fixtureDayDisclosure" key={dateKey} open={Boolean(query) || dayIndex === 0}>
          <summary className="fixtureDayHeading">
            <span>{dayFormatter.format(dayDate)}</span>
            <small>{dayFixtures.length} fixture{dayFixtures.length === 1 ? "" : "s"}</small>
            <b aria-hidden="true">⌄</b>
          </summary>
          <div className="fixtureDayBody">
            {competitionGroups.map(([competition, competitionFixtures], competitionIndex) => {
              const sortedCompetitionFixtures = [...competitionFixtures].sort(sortFixturesByKickoffThenCompetition);
              return <details className="fixtureLeagueSection" key={`${dateKey}-${competition}`} open={Boolean(query) || (dayIndex === 0 && competitionIndex === 0)}>
                <summary className="fixtureLeagueHeading">
                  <span>{competition}</span>
                  <small>{sortedCompetitionFixtures.length} fixture{sortedCompetitionFixtures.length === 1 ? "" : "s"}</small>
                  <b aria-hidden="true">⌄</b>
                </summary>
                <div className="fixtureTable">
                  <div className="fixtureTableHeader"><span>Kickoff</span><span>Fixture</span><span>BTTS</span><span>Status</span></div>
                  {sortedCompetitionFixtures.map((fixture) => <div className="fixtureTableRow" key={fixture.id}>
                    <strong className="fixtureKickoffTime">{timeFormatter.format(new Date(fixture.kickoff_at))}</strong>
                    <div className="fixtureTeamsCompact"><strong>{fixture.home_team}</strong><b>v</b><strong>{fixture.away_team}</strong></div>
                    <strong className="fixtureOddsCompact">{fixture.odds_fractional ?? "—"}</strong>
                    <span className={`fixtureStatus ${fixture.is_eligible ? "eligible" : "ineligible"}`}>{fixture.status === "NS" ? (fixture.is_eligible ? "Eligible" : "Fixture") : fixture.status}</span>
                  </div>)}
                </div>
              </details>;
            })}
          </div>
        </details>;
      })}
      {!filtered.length && <div className="emptyState">No fixtures are currently stored for this two-week period.</div>}
    </section>;
  }

  const visibleCompetitions = (competitions as string[]).filter((competition) => filtered.some((fixture) => fixture.competition === competition));
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>{gameweek ? `GAMEWEEK ${gameweek.number}` : "NO GAMEWEEK"}</span><h2>Make My Pick</h2><p>Only valid UK Saturday 3pm selections are shown. Hearts and Hibs matches are excluded.</p></div><button className="prominentShareButton" onClick={sharePicks}>↗ Share weekly picks</button></div><div className="fixtureSearch"><label htmlFor="fixture-search-pick">Search fixtures</label><input id="fixture-search-pick" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type a team or competition…" autoComplete="off" /></div>{visibleCompetitions.map((competition:string)=>{const competitionFixtures=filtered.filter((f:Fixture)=>f.competition===competition).sort(sortFixturesForBookmaker);return <details className="competitionSection competitionDisclosure" key={`${mode}-${competition}-${query}`} open={Boolean(query)}><summary><span>{competition}</span><small>{competitionFixtures.length} fixture{competitionFixtures.length===1?"":"s"}</small><b aria-hidden="true">⌄</b></summary><div className="competitionFixtures">{competitionFixtures.map((fixture:Fixture)=>{const prediction=predictions.find((p:Prediction)=>p.fixture_id===fixture.id&&p.gameweek_id===gameweek?.id);const player=profiles.find((p:Profile)=>p.id===prediction?.member_id);return <div className="fullFixture" key={fixture.id}><div><span>{formatKickoff(fixture.kickoff_at).split(",")[0]}</span><strong>{formatKickoff(fixture.kickoff_at).split(", ").pop()}</strong></div><div className="fullTeams"><strong>{fixture.home_team}</strong><b>v</b><strong>{fixture.away_team}</strong></div><div className="fullOdds"><span>BTTS</span><strong>{fixture.odds_fractional??"—"}</strong></div><button disabled={!isOpen||Boolean(player&&player.id!==myId)} onClick={()=>selectFixture(fixture.id)}>{player?.id===myId?"Picked ✓":player?`Taken by ${player.display_name}`:isOpen?"Select":"Closed"}</button></div>})}</div></details>})}{!filtered.length&&<div className="emptyState">No fixtures match your search.</div>}</section>;
}

function LeagueTable({ standings, seasonLabel, gameweekNumber, tableThroughNumber, isFuture, entryFee }: any) {
  const prizePot = standings.length * entryFee;
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>SEASON {seasonLabel} · {gameweekNumber ? `GAMEWEEK ${gameweekNumber} · ` : ""}EST 2024</span><h2>{isFuture ? `Standings before Gameweek ${gameweekNumber}` : `League Table after Gameweek ${tableThroughNumber ?? gameweekNumber}`}</h2><p>S-N means a score–nil result worth +1. Ties: fewest 0–0s, most BTTS wins, then alphabetical.</p></div><div className="pageHeadingActions"><ShareTableButton rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweekNumber} prizePot={prizePot} /><a href="/table" target="_blank" rel="noreferrer">Public table ↗</a></div></div><div className="largeTable"><div className="largeTableRow header"><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span></div>{standings.map((row:any,index:number)=><div className={`largeTableRow ${index===0?"leader":""}`} key={row.id}><span>{index+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.oneSided}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b></div>)}</div></section>;
}

function LeagueHistory({ seasons }: { seasons: SeasonHistory[] }) {
  const archived: SeasonHistory[] = historicalSeasons.map((season) => ({
    id: `historic-${season.season}`,
    label: season.season,
    isCurrent: false,
    gameweeks: season.weeks,
    completedPicks: season.finalTable.reduce((sum, row) => sum + row.played, 0),
    standings: season.finalTable.map((row, index) => ({
      id: `${season.season}-${index}`,
      name: row.name,
      played: row.played,
      wins: row.wins,
      zeroZeroCount: row.losses,
      points: row.points,
    })),
  }));
  const merged = [...archived, ...seasons.filter((season) => !archived.some((archive) => archive.label === season.label))];
  const [selectedId, setSelectedId] = useState(merged[0]?.id ?? "");
  const selected = merged.find((season) => season.id === selectedId) ?? merged[0];
  return <section className="pagePanel panel brandedPanel historyPanel">
    <div className="pageHeading"><div><span>EST 2024 · SEASON ARCHIVE</span><h2>League History</h2><p>Previous winners, final tables and the current season.</p></div></div>
    <div className="rollOfHonour">
      <img src="/assets/bounce-cup.png" alt="Bounce BTTS League trophy" />
      <div><span>ROLL OF HONOUR</span>{rollOfHonour.map((winner)=><p key={winner.season}><strong>{winner.season}</strong><b>{winner.winner}</b></p>)}</div>
    </div>
    <div className="seasonCards">{merged.map((season)=><button key={season.id} className={selected?.id===season.id?"active":""} onClick={()=>setSelectedId(season.id)}><span>{season.isCurrent?"CURRENT SEASON":"ARCHIVE"}</span><strong>{season.label}</strong><small>{season.gameweeks} gameweeks</small></button>)}</div>
    {selected&&selected.standings.length>0?<><div className="historyWinner"><span>{selected.isCurrent?"CURRENT LEADER":"SEASON WINNER"}</span><strong>{selected.standings[0].name}</strong><b>{selected.standings[0].points} pts</b></div><div className="largeTable"><div className="largeTableRow header"><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>0-0</span><span>PTS</span></div>{selected.standings.map((row,index)=><div className={`largeTableRow ${index===0?"leader":""}`} key={row.id}><span>{index+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b></div>)}</div></>:<div className="emptyState historyEmpty"><strong>{selected?.label}</strong><span>No archived results yet.</span></div>}
  </section>;
}

function Results({ fixtures, predictions, profiles }: any) {
  const completed=fixtures.filter((fixture:Fixture)=>["FT","AET","PEN"].includes(fixture.status));
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>COMPLETED FIXTURES</span><h2>Results</h2></div></div>{completed.map((fixture:Fixture)=>{const prediction=predictions.find((p:Prediction)=>p.fixture_id===fixture.id);const player=profiles.find((p:Profile)=>p.id===prediction?.member_id);return <div className="largeResult" key={fixture.id}><span>{player?.display_name??"Unselected"}</span><strong>{fixture.home_team}</strong><b>{fixture.home_score} - {fixture.away_score}</b><strong>{fixture.away_team}</strong><i className={prediction?.points_awarded===3?"yes":"no"}>{prediction?.points_awarded==null?"—":`${prediction.points_awarded>0?"+":""}${prediction.points_awarded} PTS`}</i></div>})}{!completed.length&&<div className="emptyState">No completed results yet.</div>}</section>;
}

function Players({ profiles, predictions, adjustments, fixtures, gameweek }: any) {
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>LEAGUE MEMBERS</span><h2>Players</h2><p>{predictions.filter((p:Prediction)=>p.gameweek_id===gameweek?.id).length} of {profiles.length} have submitted a pick.</p></div></div><div className="playerGrid">{profiles.map((profile:Profile)=>{const prediction=predictions.find((p:Prediction)=>p.member_id===profile.id&&p.gameweek_id===gameweek?.id);const adjustment=(adjustments as ScoreAdjustment[]).find((item)=>item.member_id===profile.id&&item.gameweek_id===gameweek?.id);const fixture=fixtures.find((f:Fixture)=>f.id===prediction?.fixture_id);return <article key={profile.id}><span>{initials(profile.display_name)}</span><div><strong>{profile.display_name}</strong><small>{fixture?`${fixture.home_team} v ${fixture.away_team} · ${fixture.odds_fractional??"Odds unavailable"}`:adjustment?`${adjustment.reason}: ${adjustment.points>0?"+":""}${adjustment.points} point${Math.abs(adjustment.points)===1?"":"s"}`:"Awaiting selection"}</small></div><b className={fixture?"picked":adjustment?"missed":"pending"}>{fixture?"PICKED ✓":adjustment?`MISSED ${adjustment.points>0?"+":""}${adjustment.points}`:"PENDING"}</b></article>})}</div></section>;
}

function AdminPanel({ active, setActive, gameweek, gameweeks, selectedGameweekId, setSelectedGameweekId, fixtures, profiles, predictions, adjustments, onChanged, notice, isUltimateAdmin }: any) {
  const safeActive = active;
  return <section className="pagePanel panel brandedPanel adminPanel"><div className="pageHeading"><div><span>ADMIN CONTROL</span><h2>League Management</h2><p>{isUltimateAdmin ? "Full league, user and security administration." : "Manage deadlines, selections, fixtures and results."}</p></div></div><div className="adminTabs"><button className={safeActive==="users"?"active":""} onClick={()=>setActive("users")}>Users</button><button className={safeActive==="selections"?"active":""} onClick={()=>setActive("selections")}>Selections</button><button className={safeActive==="fixtures"?"active":""} onClick={()=>setActive("fixtures")}>Fixtures</button><button className={safeActive==="results"?"active":""} onClick={()=>setActive("results")}>Results</button><button className={safeActive==="gameweek"?"active":""} onClick={()=>setActive("gameweek")}>Gameweek</button><button className={safeActive==="seasons"?"active":""} onClick={()=>setActive("seasons")}>Seasons</button></div>{safeActive==="users"&&<AdminUsers notice={notice}/>} {safeActive==="selections"&&<AdminSelections gameweek={gameweek} profiles={profiles} fixtures={fixtures} predictions={predictions} adjustments={adjustments} onChanged={onChanged} notice={notice}/>} {safeActive==="fixtures"&&<AdminFixtures gameweek={gameweek} nextGameweek={(gameweeks as Gameweek[]).find((item) => item.number === (gameweek?.number ?? 0) + 1) ?? null} onChanged={onChanged} notice={notice}/>} {safeActive==="results"&&<AdminResults fixtures={fixtures} onChanged={onChanged} notice={notice}/>} {safeActive==="gameweek"&&<AdminGameweek gameweek={gameweek} onChanged={onChanged} notice={notice}/>} {safeActive==="seasons"&&<AdminSeasons notice={notice} onChanged={onChanged}/>}</section>;
}

function AdminUsers({ notice }: { notice: (message:string)=>void }) {
  const [users,setUsers]=useState<UserAdminRow[]>([]);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState("");
  async function addUser(){const displayName=window.prompt("New player name");if(!displayName?.trim())return;setSaving("new");const response=await fetch("/api/admin/users",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({displayName:displayName.trim()})});const payload=await response.json();notice(response.ok?`${payload.user.display_name} created`:payload.error);setSaving("");if(response.ok)window.location.reload();}
  async function resetPlaceholder(user:UserAdminRow){if(!window.confirm(`Remove ${user.display_name} access and return this login to a placeholder? Historical records will remain unchanged.`))return;setSaving(user.id);const response=await fetch("/api/admin/users",{method:"DELETE",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:user.id})});const payload=await response.json();notice(response.ok?`Account reset to ${payload.username}`:payload.error);setSaving("");if(response.ok)window.location.reload();}
  useEffect(()=>{void (async()=>{const response=await fetch("/api/admin/users",{headers:{authorization:`Bearer ${await token()}`}});const payload=await response.json();if(response.ok)setUsers(payload.users);else notice(payload.error);setLoading(false);})();},[]);
  function update(id:string,patch:Partial<UserAdminRow>){setUsers(current=>current.map(user=>user.id===id?{...user,...patch}:user));}
  function generate(user:UserAdminRow){update(user.id,{password:`bounce${user.slot_number}${Math.floor(10+Math.random()*90)}`});}
  async function save(user:UserAdminRow){setSaving(user.id);const response=await fetch("/api/admin/users",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:user.id,username:user.username,displayName:user.display_name,role:user.role,active:user.active,password:user.password})});const payload=await response.json();notice(response.ok?`${user.username} saved`:payload.error);setSaving("");}
  async function copy(user:UserAdminRow){await navigator.clipboard.writeText(`${user.display_name}\nUsername: ${user.username}\nPassword: ${user.password}`);notice("Login details copied");}
  if(loading)return <div className="emptyState">Loading users…</div>;
  return <div className="userAdminList"><div className="userAdminHeader"><div className="adminNote">Passwords are visible only to logged-in admins and can be changed at any time.</div><button className="primaryButton" disabled={saving==="new"} onClick={addUser}>{saving==="new"?"Creating…":"+ Add New User"}</button></div>{users.map(user=><article className="userAdminRow" key={user.id}><div className="slotBadge">{user.slot_number}</div><label>Username<input value={user.username} disabled={user.slot_number===1} onChange={e=>update(user.id,{username:e.target.value})}/></label><label>Assigned player<input value={user.display_name} disabled={user.slot_number===1} onChange={e=>update(user.id,{display_name:e.target.value})}/></label><label>Role<select value={user.role} disabled={user.slot_number===1} onChange={e=>update(user.id,{role:e.target.value as "ultimate_admin"|"admin"|"member"})}><option value="member">Member</option><option value="admin">League Admin</option>{user.slot_number===1&&<option value="ultimate_admin">Ultimate Admin</option>}</select></label><label>Password<input value={user.password} onChange={e=>update(user.id,{password:e.target.value})}/></label><label className="activeToggle"><input type="checkbox" checked={user.active} disabled={user.slot_number===1} onChange={e=>update(user.id,{active:e.target.checked})}/> Active</label><div className="userActions"><button onClick={()=>generate(user)}>Generate</button><button onClick={()=>copy(user)}>Copy</button><button className="save" disabled={saving===user.id} onClick={()=>save(user)}>{saving===user.id?"Saving…":"Save"}</button>{user.slot_number!==1&&<button className="dangerButton" disabled={saving===user.id} onClick={()=>resetPlaceholder(user)}>Return to placeholder</button>}</div></article>)}</div>;
}

function AdminSelections({ gameweek, profiles, fixtures, predictions, adjustments, onChanged, notice }: any) {
  const activeProfiles = useMemo(() => (profiles as Profile[]).filter((profile) => profile.active).sort((a, b) => (a.slot_number ?? 99) - (b.slot_number ?? 99)), [profiles]);
  const currentPredictions = useMemo(() => (predictions as Prediction[]).filter((prediction) => prediction.gameweek_id === gameweek?.id), [predictions, gameweek?.id]);
  const currentAdjustments = useMemo(() => (adjustments as ScoreAdjustment[]).filter((adjustment) => adjustment.gameweek_id === gameweek?.id), [adjustments, gameweek?.id]);
  const [draftSelections, setDraftSelections] = useState<Record<string, string>>({});
  const [fixtureSearch, setFixtureSearch] = useState("");
  const [memberId, setMemberId] = useState("");
  const [adjustmentPoints, setAdjustmentPoints] = useState("-1");
  const [adjustmentReason, setAdjustmentReason] = useState("Missed selection");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    const nextDrafts = Object.fromEntries(activeProfiles.map((profile) => [profile.id, currentPredictions.find((prediction) => prediction.member_id === profile.id)?.fixture_id ?? ""]));
    setDraftSelections(nextDrafts);
    setMemberId((current) => current && activeProfiles.some((profile) => profile.id === current) ? current : activeProfiles[0]?.id ?? "");
  }, [activeProfiles, currentPredictions]);

  useEffect(() => {
    const adjustment = currentAdjustments.find((item) => item.member_id === memberId);
    setAdjustmentPoints(String(adjustment?.points ?? -1));
    setAdjustmentReason(adjustment?.reason ?? "Missed selection");
  }, [memberId, currentAdjustments]);

  const filteredFixtures = useMemo(() => {
    const query = fixtureSearch.trim().toLowerCase();
    return (fixtures as Fixture[])
      .filter((fixture) => !query || `${fixture.home_team} ${fixture.away_team} ${fixture.competition}`.toLowerCase().includes(query))
      .sort(sortFixturesForBookmaker);
  }, [fixtures, fixtureSearch]);

  const sortedCompetitions = useMemo(() => Array.from(new Set(filteredFixtures.map((fixture) => fixture.competition))), [filteredFixtures]);
  const selectedMember = activeProfiles.find((profile) => profile.id === memberId);
  const existingAdjustment = currentAdjustments.find((adjustment) => adjustment.member_id === memberId);
  const changedMemberIds = activeProfiles
    .filter((profile) => (draftSelections[profile.id] ?? "") !== (currentPredictions.find((prediction) => prediction.member_id === profile.id)?.fixture_id ?? ""))
    .map((profile) => profile.id);

  function updateDraft(member: string, fixture: string) {
    setDraftSelections((current) => ({ ...current, [member]: fixture }));
  }

  function resetDrafts() {
    setDraftSelections(Object.fromEntries(activeProfiles.map((profile) => [profile.id, currentPredictions.find((prediction) => prediction.member_id === profile.id)?.fixture_id ?? ""])));
  }

  async function saveAllSelections() {
    if (!gameweek) return;
    if (!changedMemberIds.length) return notice("There are no selection changes to save.");

    const chosen = Object.entries(draftSelections).filter(([, fixtureId]) => fixtureId);
    const duplicate = chosen.find(([member, fixtureId], index) => chosen.findIndex(([otherMember, otherFixture]) => otherFixture === fixtureId && otherMember !== member) !== index);
    if (duplicate) {
      const fixture = (fixtures as Fixture[]).find((item) => item.id === duplicate[1]);
      return notice(`${fixture ? `${fixture.home_team} v ${fixture.away_team}` : "A fixture"} has been selected for more than one player.`);
    }

    setBusy(true);
    let completed = 0;
    try {
      // Remove changed existing selections first so fixtures can be reassigned safely in the same batch.
      for (const changedMemberId of changedMemberIds) {
        const existing = currentPredictions.find((prediction) => prediction.member_id === changedMemberId);
        if (!existing) continue;
        setProgress(`Preparing changes ${++completed}/${changedMemberIds.length}`);
        const response = await fetch("/api/admin/predictions", {
          method: "DELETE",
          headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
          body: JSON.stringify({ gameweekId: gameweek.id, memberId: changedMemberId }),
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "A selection could not be removed.");
        }
      }

      completed = 0;
      for (const changedMemberId of changedMemberIds) {
        const fixtureId = draftSelections[changedMemberId] ?? "";
        setProgress(`Saving selections ${++completed}/${changedMemberIds.length}`);
        if (!fixtureId) continue;
        const response = await fetch("/api/admin/predictions", {
          method: "PUT",
          headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
          body: JSON.stringify({ gameweekId: gameweek.id, memberId: changedMemberId, fixtureId }),
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "A selection could not be saved.");
        }
      }

      notice(`${changedMemberIds.length} selection change${changedMemberIds.length === 1 ? "" : "s"} saved`);
      await onChanged();
    } catch (error) {
      notice(error instanceof Error ? error.message : "The selections could not all be saved.");
      await onChanged();
    } finally {
      setBusy(false);
      setProgress("");
    }
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

  return <div className="adminBulkSelections">
    <div className="adminNote">Enter or amend every player&apos;s fixture below, then press <strong>Save all selections</strong> once. Leaving a player blank removes their current selection. A player who misses the deadline automatically receives −1.</div>
    <label className="bulkFixtureSearch">Search fixtures
      <input type="search" value={fixtureSearch} onChange={(event) => setFixtureSearch(event.target.value)} placeholder="Type a team or competition…" autoComplete="off" />
    </label>
    <div className="adminBulkSelectionList">
      {activeProfiles.map((profile) => {
        const selectedFixtureId = draftSelections[profile.id] ?? "";
        const currentFixtureId = currentPredictions.find((prediction) => prediction.member_id === profile.id)?.fixture_id ?? "";
        const changed = selectedFixtureId !== currentFixtureId;
        const selectedFixture = (fixtures as Fixture[]).find((fixture) => fixture.id === selectedFixtureId);
        const competitions = selectedFixture && !filteredFixtures.some((fixture) => fixture.id === selectedFixture.id)
          ? [selectedFixture.competition, ...sortedCompetitions.filter((competition) => competition !== selectedFixture.competition)]
          : sortedCompetitions;
        return <article className={`adminBulkSelectionRow ${changed ? "changed" : ""}`} key={profile.id}>
          <div className="bulkPlayerName"><span>{profile.slot_number}</span><strong>{profile.display_name}</strong><small>{changed ? "Unsaved change" : selectedFixtureId ? "Selection saved" : "No selection"}</small></div>
          <select value={selectedFixtureId} disabled={busy} onChange={(event) => updateDraft(profile.id, event.target.value)}>
            <option value="">No selection</option>
            {competitions.map((competition) => {
              const competitionFixtures = (fixtures as Fixture[])
                .filter((fixture) => fixture.competition === competition)
                .filter((fixture) => fixture.id === selectedFixtureId || filteredFixtures.some((filtered) => filtered.id === fixture.id))
                .sort(sortFixturesForBookmaker);
              if (!competitionFixtures.length) return null;
              return <optgroup key={competition} label={competition}>
                {competitionFixtures.map((fixture) => {
                  const draftedFor = activeProfiles.find((otherProfile) => otherProfile.id !== profile.id && draftSelections[otherProfile.id] === fixture.id);
                  return <option key={fixture.id} value={fixture.id} disabled={Boolean(draftedFor)}>{fixture.home_team} v {fixture.away_team}{fixture.odds_fractional ? ` · ${fixture.odds_fractional}` : ""}{draftedFor ? ` · TAKEN BY ${draftedFor.display_name}` : ""}</option>;
                })}
              </optgroup>;
            })}
          </select>
        </article>;
      })}
    </div>
    <div className="adminBulkSaveBar">
      <span>{changedMemberIds.length ? `${changedMemberIds.length} unsaved change${changedMemberIds.length === 1 ? "" : "s"}` : "All selections are saved"}</span>
      <button disabled={busy || !changedMemberIds.length} onClick={resetDrafts}>Discard changes</button>
      <button className="primaryButton" disabled={busy || !changedMemberIds.length} onClick={saveAllSelections}>{busy ? progress || "Saving…" : "Save all selections"}</button>
    </div>
    <div className="adminAdjustmentBox adminBulkAdjustmentBox">
      <h3>Missed-selection / manual points</h3>
      <div className="formGrid">
        <label>Player<select value={memberId} onChange={(event) => setMemberId(event.target.value)}>{activeProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.slot_number}. {profile.display_name}</option>)}</select></label>
        <label>Points<input type="number" step="1" value={adjustmentPoints} onChange={(event) => setAdjustmentPoints(event.target.value)} /></label>
        <label>Reason<input value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} /></label>
      </div>
      <div className="adminSelectionActions">
        <button className="save" disabled={busy || !memberId} onClick={saveAdjustment}>{existingAdjustment ? "Amend points" : "Add points adjustment"}</button>
        <button disabled={busy || !existingAdjustment} onClick={removeAdjustment}>Remove adjustment</button>
      </div>
    </div>
  </div>;
}
function AdminFixtures({ gameweek, nextGameweek, onChanged, notice }: any) {
  const [form, setForm] = useState({ competition: "Scottish Premiership", country: "Scotland", homeTeam: "", awayTeam: "", kickoffLocal: "", oddsFractional: "" });
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState<"selected" | "next" | "">("");

  async function runFixtureUpdate(target: Gameweek | null, mode: "selected" | "next") {
    if (!target) return notice(mode === "next" ? "There is no following gameweek to update." : "Choose a gameweek first.");
    setSyncing(mode);
    const response = await fetch("/api/admin/provider-sync", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ gameweekIds: [target.id] }),
    });
    const payload = await response.json();
    const rawError = String(payload.error ?? "Fixture update failed.");
    const freePlanDateError = rawError.includes("Free plans do not have access to this date");
    const targetSaturday = new Date(new Date(target.locks_at).getTime() + 24 * 60 * 60 * 1000);
    const retryDate = new Date(targetSaturday.getTime() - 24 * 60 * 60 * 1000);
    const retryLabel = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(retryDate);
    notice(response.ok
      ? `GW ${target.number} update complete: ${payload.fixturesAdded} added, ${payload.fixturesUpdated} updated, ${payload.oddsUpdated} odds and ${payload.alertsCreated} alerts.`
      : freePlanDateError
        ? `GW ${target.number} is too far ahead for the API-Football free plan. Try the automatic update again from ${retryLabel}, or add a missing fixture manually before then.`
        : rawError);
    setSyncing("");
    if (response.ok) onChanged();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!gameweek) return;
    setBusy(true);
    const kickoffAt = new Date(form.kickoffLocal).toISOString();
    const response = await fetch("/api/admin/fixtures", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ ...form, kickoffAt, gameweekId: gameweek.id }),
    });
    const payload = await response.json();
    notice(response.ok ? "Fixture added" : payload.error);
    setBusy(false);
    if (response.ok) onChanged();
  }

  return <div className="adminFixturesTools">
    <section className="adminFixtureSyncCard">
      <div><span>AUTOMATIC IMPORT / UPDATE</span><strong>Refresh fixtures from API-FOOTBALL</strong><p>Import missing fixtures and refresh kickoff times, statuses, scores and available BTTS odds. The second button prepares the following gameweek early.</p></div>
      <div className="adminFixtureSyncActions">
        <button className="primaryButton" type="button" disabled={!gameweek || Boolean(syncing)} onClick={() => runFixtureUpdate(gameweek, "selected")}>{syncing === "selected" ? `Updating GW ${gameweek?.number ?? ""}…` : `Update selected GW ${gameweek?.number ?? "—"}`}</button>
        <button type="button" disabled={!nextGameweek || Boolean(syncing)} onClick={() => runFixtureUpdate(nextGameweek, "next")}>{syncing === "next" ? `Updating GW ${nextGameweek?.number ?? ""}…` : nextGameweek ? `Update next GW ${nextGameweek.number}` : "No next gameweek"}</button>
      </div>
      <small>To update another week, change the gameweek selector at the top first.</small>
    </section>

    <form className="adminForm adminManualFixtureForm" onSubmit={submit}>
      <div className="adminFixtureFormHeading"><span>MANUAL FIXTURE ENTRY</span><strong>Add one fixture to GW {gameweek?.number ?? "—"}</strong></div>
      <div className="adminNote">Use this only when a fixture is missing from the automatic import. Add any eligible UK Saturday 3pm match. Hearts and Hibs fixtures are excluded. Fractional odds can be entered now or later.</div>
      <div className="formGrid"><label>Competition<input value={form.competition} onChange={e => setForm({ ...form, competition: e.target.value })}/></label><label>Country<input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}/></label><label>Home team<input value={form.homeTeam} onChange={e => setForm({ ...form, homeTeam: e.target.value })} required/></label><label>Away team<input value={form.awayTeam} onChange={e => setForm({ ...form, awayTeam: e.target.value })} required/></label><label>Kickoff<input type="datetime-local" value={form.kickoffLocal} onChange={e => setForm({ ...form, kickoffLocal: e.target.value })} required/></label><label>BTTS fractional odds<input placeholder="e.g. 8/11" value={form.oddsFractional} onChange={e => setForm({ ...form, oddsFractional: e.target.value })}/></label></div>
      <button className="primaryButton" disabled={busy || !gameweek}>{busy ? "Adding…" : "Add fixture manually"}</button>
    </form>
  </div>;
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


function AdminSeasons({ notice, onChanged }: { notice:(message:string)=>void; onChanged:()=>void }) {
  const [label,setLabel]=useState(""); const [gameweeks,setGameweeks]=useState("38"); const [busy,setBusy]=useState(false);
  async function createSeason(){if(!label.trim())return notice("Enter a season name.");setBusy(true);const response=await fetch("/api/admin/seasons",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({label:label.trim(),gameweeks:Number(gameweeks)})});const payload=await response.json();notice(response.ok?`Season ${label} created with current users included`:payload.error);setBusy(false);if(response.ok)onChanged();}
  return <div className="adminForm"><div className="adminNote">All active named users receive access automatically. Placeholder accounts are excluded. Access can then be removed or restored per season without changing historical records.</div><div className="formGrid"><label>Season name<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="2027/28"/></label><label>Planned gameweeks<input type="number" min="1" max="60" value={gameweeks} onChange={e=>setGameweeks(e.target.value)}/></label></div><button className="primaryButton" disabled={busy} onClick={createSeason}>{busy?"Creating…":"Create New Season"}</button></div>;
}

function AdminAlerts({ notice }: { notice: (message: string) => void }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    const accessToken = await token();
    const [alertResponse, runResponse] = await Promise.all([
      fetch("/api/admin/alerts", { headers: { authorization: `Bearer ${accessToken}` } }),
      fetch("/api/admin/provider-sync", { headers: { authorization: `Bearer ${accessToken}` } }),
    ]);
    const alertPayload = await alertResponse.json();
    const runPayload = await runResponse.json();
    if (alertResponse.ok) setAlerts(alertPayload.alerts ?? []); else notice(alertPayload.error ?? "Could not load alerts");
    if (runResponse.ok) setRuns(runPayload.runs ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function runSync() {
    setSyncing(true);
    const response = await fetch("/api/admin/provider-sync", { method: "POST", headers: { authorization: `Bearer ${await token()}` } });
    const payload = await response.json();
    notice(response.ok ? `Update complete: ${payload.fixturesAdded} added, ${payload.fixturesUpdated} updated, ${payload.oddsUpdated} odds, ${payload.alertsCreated} alerts.` : payload.error);
    setSyncing(false);
    await load();
  }

  async function resolve(id: string, resolved: boolean) {
    const response = await fetch("/api/admin/alerts", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id, resolved }) });
    const payload = await response.json();
    notice(response.ok ? (resolved ? "Alert resolved" : "Alert reopened") : payload.error);
    if (response.ok) await load();
  }

  const unresolved = alerts.filter((item) => !item.resolved);
  const latestRun = runs[0];
  return <div className="adminAlertsPanel">
    <div className="providerStatusCard">
      <div><span>API-FOOTBALL</span><strong>{latestRun ? `Last update ${new Date(latestRun.started_at).toLocaleString("en-GB")}` : "No update has run yet"}</strong><small>{latestRun ? `${latestRun.status.toUpperCase()} · ${latestRun.requests_used} requests used${latestRun.requests_remaining !== null ? ` · ${latestRun.requests_remaining} remaining` : ""}` : "The daily update runs at 08:00 UK time."}</small></div>
      <button className="prominentShareButton" disabled={syncing} onClick={runSync}>{syncing ? "Updating fixtures…" : "Run fixture update now"}</button>
    </div>
    <div className="alertsSummary"><strong>{unresolved.length}</strong><span>unresolved fixture alert{unresolved.length === 1 ? "" : "s"}</span></div>
    {loading ? <div className="emptyState">Loading alerts…</div> : alerts.length ? <div className="adminAlertList">{alerts.map((alert) => <article className={`adminAlertRow ${alert.resolved ? "resolved" : ""} ${alert.severity}`} key={alert.id}>
      <div><span>{alert.severity.toUpperCase()} · {new Date(alert.created_at).toLocaleString("en-GB")}</span><strong>{alert.title}</strong><p>{alert.message}</p><small>{alert.profiles?.display_name ? `Affected player: ${alert.profiles.display_name}` : ""}</small></div>
      <button onClick={() => resolve(alert.id, !alert.resolved)}>{alert.resolved ? "Reopen" : "Mark resolved"}</button>
    </article>)}</div> : <div className="emptyState">No fixture-change alerts.</div>}
  </div>;
}
