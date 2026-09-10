"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { kickoffMatchesSelectionRule } from "@/lib/gameweek-rules";
import AuthenticatedShellFrame from "../ui/AuthenticatedShellFrame";
import { authenticatedNavItems } from "../ui/navigation";
import EnhancedPickPage from "../EnhancedPickPage";
import V2EditorialDashboard from "../v2/V2EditorialDashboard";
import V2StatCentre from "../v2/V2StatCentre";
import V2AdminCentre from "../v2/V2AdminCentre";
import styles from "./V2PreviewClient.module.css";

type Role = "ultimate_admin" | "admin" | "member" | "guest";
type Profile = { id: string; username: string; display_name: string; role: Role; active: boolean; slot_number: number | null };
type Gameweek = {
  id: string;
  number: number;
  status: "open" | "locked" | "complete";
  opens_at: string | null;
  locks_at: string;
  season_id: string | null;
  selection_rule_mode?: "exact_time" | "any_kickoff" | null;
  selection_weekday?: number | null;
  selection_time?: string | null;
  selection_times?: string[] | null;
  selection_time_from?: string | null;
  selection_time_to?: string | null;
  one_off_rule?: boolean | null;
};
type Fixture = { id: string; gameweek_id: string | null; competition: string; country: string; home_team: string; away_team: string; kickoff_at: string; status: string; live_elapsed?: number | null; home_score: number | null; away_score: number | null; odds_fractional: string | null; odds_checked_at: string | null; odds_deadline_fractional?: string | null; source: string; is_eligible: boolean };
type Prediction = { id: string; gameweek_id: string; member_id: string; fixture_id: string; points_awarded: number | null; created_at: string; updated_at: string };
type ScoreAdjustment = { id: string; gameweek_id: string; member_id: string; points: number; reason: string; source: "automatic" | "admin"; created_at: string; updated_at: string };
type Standing = { id: string; name: string; played: number; wins: number; oneSided: number; zeroZeroCount: number; points: number };
type FixtureBrowserState = { gameweekId: string; status: "loading" | "ready" | "error" };

type Props = {
  profile: Profile;
  profiles: Profile[];
  gameweeks: Gameweek[];
  currentGameweekId: string | null;
  fixtures: Fixture[];
  predictions: Prediction[];
  adjustments: ScoreAdjustment[];
  seasonLabel: string;
  entryFee: number;
};

const finishedStatuses = new Set(["FT", "AET", "PEN"]);

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}
async function token() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

export default function V2PreviewClient({ profile, profiles: initialProfiles, gameweeks, currentGameweekId, fixtures: initialFixtures, predictions: initialPredictions, adjustments, seasonLabel, entryFee }: Props) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [gameweekId, setGameweekId] = useState(currentGameweekId ?? gameweeks[0]?.id ?? "");
  const [fixtures, setFixtures] = useState(initialFixtures);
  const [browserFixtures, setBrowserFixtures] = useState<Fixture[]>([]);
  const [fixtureBrowserState, setFixtureBrowserState] = useState<FixtureBrowserState | null>(null);
  const [predictions, setPredictions] = useState(initialPredictions);
  const [alertsCount, setAlertsCount] = useState(0);
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [oddsRefreshing, setOddsRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [emulatedProfileId, setEmulatedProfileId] = useState<string | null>(null);
  const [roussetOpen, setRoussetOpen] = useState(false);
  const activeGameweekButton = useRef<HTMLButtonElement | null>(null);
  const liveRefreshBusy = useRef(false);

  const profiles = useMemo(() => initialProfiles.filter((row) => row.active && row.role !== "guest"), [initialProfiles]);
  const emulatedProfile = emulatedProfileId ? initialProfiles.find((row) => row.id === emulatedProfileId && row.active) ?? null : null;
  const viewerProfile = emulatedProfile ?? profile;
  const effectiveRole = viewerProfile.role;
  const isAdmin = !emulatedProfile && (profile.role === "admin" || profile.role === "ultimate_admin");
  const isUltimate = !emulatedProfile && profile.role === "ultimate_admin";
  const readOnly = Boolean(emulatedProfile);
  const gameweek = gameweeks.find((row) => row.id === gameweekId) ?? null;
  const currentFixtures = useMemo(() => fixtures.filter((row) => row.gameweek_id === gameweekId), [fixtures, gameweekId]);
  const currentPredictions = useMemo(() => predictions.filter((row) => row.gameweek_id === gameweekId), [predictions, gameweekId]);
  const currentAdjustments = useMemo(() => adjustments.filter((row) => row.gameweek_id === gameweekId), [adjustments, gameweekId]);
  const selectionFixtures = useMemo(() => {
    const unique = new Map<string, Fixture>();
    for (const row of [...currentFixtures, ...browserFixtures]) unique.set(row.id, row);
    const rows = Array.from(unique.values());
    if (!gameweek) return rows;
    return rows.filter((row) => row.is_eligible && kickoffMatchesSelectionRule(row.kickoff_at, gameweek));
  }, [browserFixtures, currentFixtures, gameweek]);
  const attachedSelectableFixtures = useMemo(() => currentFixtures.filter((row) => row.is_eligible && (!gameweek || kickoffMatchesSelectionRule(row.kickoff_at, gameweek))), [currentFixtures, gameweek]);
  const selectedFixtureState: "loading" | "ready" | "error" = fixtureBrowserState?.gameweekId === gameweekId ? fixtureBrowserState.status : "loading";

  const standings = useMemo<Standing[]>(() => {
    const rows = new Map<string, Standing>(profiles.map((member) => [member.id, { id: member.id, name: member.display_name, played: 0, wins: 0, oneSided: 0, zeroZeroCount: 0, points: 0 }]));
    for (const prediction of predictions) {
      if (prediction.points_awarded == null) continue;
      const row = rows.get(prediction.member_id); if (!row) continue;
      row.played += 1; row.points += prediction.points_awarded;
      if (prediction.points_awarded === 3) row.wins += 1;
      if (prediction.points_awarded === 1) row.oneSided += 1;
      if (prediction.points_awarded === -1) row.zeroZeroCount += 1;
    }
    for (const adjustment of adjustments) {
      const row = rows.get(adjustment.member_id); if (!row) continue;
      const scored = predictions.some((prediction) => prediction.member_id === adjustment.member_id && prediction.gameweek_id === adjustment.gameweek_id && prediction.points_awarded != null);
      if (scored && adjustment.reason.trim().toLowerCase() === "missed selection") continue;
      if (!scored) row.played += 1;
      row.points += adjustment.points;
    }
    return Array.from(rows.values()).sort((a, b) => b.points - a.points || a.zeroZeroCount - b.zeroZeroCount || b.wins - a.wins || a.name.localeCompare(b.name));
  }, [profiles, predictions, adjustments]);

  const isOpen = Boolean(
    gameweek && gameweek.id === currentGameweekId && gameweek.status === "open" &&
    (!gameweek.opens_at || new Date(gameweek.opens_at).getTime() <= Date.now()) && new Date(gameweek.locks_at).getTime() > Date.now()
  );

  useEffect(() => { activeGameweekButton.current?.scrollIntoView({ block: "nearest", inline: "center" }); }, [gameweekId]);

  async function reloadAlerts() {
    if (!isAdmin) { setAlertsCount(0); return; }
    try {
      const response = await fetch("/api/admin/alerts", { headers: { authorization: `Bearer ${await token()}` }, cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json(); setAlertsCount((data.alerts ?? []).filter((row: { resolved?: boolean }) => !row.resolved).length);
    } catch {}
  }
  useEffect(() => { void reloadAlerts(); }, [isAdmin, activeView]);

  useEffect(() => {
    if (!gameweekId) { setBrowserFixtures([]); setFixtureBrowserState(null); return; }
    let cancelled = false; const requestedGameweekId = gameweekId;
    setBrowserFixtures([]); setFixtureBrowserState({ gameweekId: requestedGameweekId, status: "loading" });
    void (async () => {
      try {
        const response = await fetch(`/api/fixture-browser?gameweekId=${encodeURIComponent(requestedGameweekId)}`, { headers: { authorization: `Bearer ${await token()}` }, cache: "no-store" });
        if (!response.ok) throw new Error("Fixture browser unavailable");
        const data = await response.json(); if (!cancelled) { setBrowserFixtures((data.fixtures ?? []) as Fixture[]); setFixtureBrowserState({ gameweekId: requestedGameweekId, status: "ready" }); }
      } catch { if (!cancelled) { setBrowserFixtures([]); setFixtureBrowserState({ gameweekId: requestedGameweekId, status: "error" }); } }
    })();
    return () => { cancelled = true; };
  }, [gameweekId]);

  async function reloadSelectedGameweek() {
    if (!gameweekId) return;
    const client = createClient();
    const [fixtureResponse, predictionResponse] = await Promise.all([
      client.from("fixtures").select("*").eq("gameweek_id", gameweekId),
      client.from("predictions").select("id,gameweek_id,member_id,fixture_id,points_awarded,created_at,updated_at").eq("gameweek_id", gameweekId),
    ]);
    let refreshedFixtures = (fixtureResponse.data ?? []) as Fixture[];
    const refreshedPredictions = (predictionResponse.data ?? []) as Prediction[];
    const loadedIds = new Set(refreshedFixtures.map((row) => row.id));
    const missingFixtureIds = Array.from(new Set(refreshedPredictions.map((row) => row.fixture_id).filter((id) => id && !loadedIds.has(id))));
    if (missingFixtureIds.length) {
      const referencedResponse = await client.from("fixtures").select("*").in("id", missingFixtureIds);
      if (!referencedResponse.error && referencedResponse.data) refreshedFixtures = [...refreshedFixtures, ...(referencedResponse.data as Fixture[])];
    }
    if (!fixtureResponse.error) {
      const refreshedIds = new Set(refreshedFixtures.map((row) => row.id));
      setFixtures((rows) => [...rows.filter((row) => row.gameweek_id !== gameweekId && !refreshedIds.has(row.id)), ...refreshedFixtures]);
    }
    if (!predictionResponse.error) setPredictions((rows) => [...rows.filter((row) => row.gameweek_id !== gameweekId), ...refreshedPredictions]);
  }

  async function refreshFixtures(manual = true) {
    if (!gameweekId || liveRefreshBusy.current) return;
    liveRefreshBusy.current = true; setLiveRefreshing(true); if (manual) setMessage("");
    try {
      const response = await fetch(`/api/live-results?gameweekId=${encodeURIComponent(gameweekId)}`, { headers: { authorization: `Bearer ${await token()}` }, cache: "no-store" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not refresh fixtures");
      await reloadSelectedGameweek();
      if (Array.isArray(data.fixtures) && data.fixtures.length) {
        const live = new Map(data.fixtures.map((row: any) => [String(row.id), row]));
        setFixtures((rows) => rows.map((fixture) => { const update: any = live.get(fixture.id); return update ? { ...fixture, status: String(update.status ?? fixture.status), home_score: update.homeScore ?? fixture.home_score, away_score: update.awayScore ?? fixture.away_score, live_elapsed: Number.isInteger(update.elapsed) ? update.elapsed : fixture.live_elapsed } : fixture; }));
      }
      if (manual) setMessage("Live fixture data refreshed");
    } catch (error) { if (manual) setMessage(error instanceof Error ? error.message : "Could not refresh fixtures"); } finally { liveRefreshBusy.current = false; setLiveRefreshing(false); }
  }

  const livePollActive = useMemo(() => {
    if (!gameweek || !currentPredictions.length) return false;
    const selected = new Set(currentPredictions.map((row) => row.fixture_id)); const now = Date.now();
    return currentFixtures.some((fixture) => {
      if (!selected.has(fixture.id) || finishedStatuses.has(fixture.status)) return false;
      const kickoff = new Date(fixture.kickoff_at).getTime(); return kickoff <= now + 10 * 60_000 && kickoff >= now - 4 * 60 * 60_000;
    });
  }, [gameweek?.id, currentPredictions, currentFixtures]);
  useEffect(() => { if (!gameweekId) return; const timer = window.setInterval(() => void reloadSelectedGameweek(), 45_000); return () => window.clearInterval(timer); }, [gameweekId]);
  useEffect(() => { if (!livePollActive) return; void refreshFixtures(false); const timer = window.setInterval(() => void refreshFixtures(false), 15_000); return () => window.clearInterval(timer); }, [livePollActive, gameweekId]);

  async function refreshOdds() {
    if (!gameweekId || oddsRefreshing || !isAdmin) return;
    setOddsRefreshing(true); setMessage("");
    try {
      const response = await fetch("/api/admin/provider-sync", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ gameweekIds: [gameweekId], oddsOnly: true }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not refresh odds"); await reloadSelectedGameweek(); setMessage("BTTS odds refreshed");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not refresh odds"); } finally { setOddsRefreshing(false); }
  }

  async function selectFixture(fixtureId: string) {
    if (!gameweek || !isOpen) return;
    if (readOnly) return setMessage("Read-only emulation: changes are disabled.");
    const taken = currentPredictions.find((row) => row.fixture_id === fixtureId && row.member_id !== viewerProfile.id);
    if (taken) return setMessage("That fixture has already been selected.");
    const client = createClient();
    const existing = currentPredictions.find((row) => row.member_id === viewerProfile.id);
    if (existing) {
      const { error } = await client.from("predictions").update({ fixture_id: fixtureId, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (error) return setMessage(error.message);
      setPredictions((rows) => rows.map((row) => row.id === existing.id ? { ...row, fixture_id: fixtureId, updated_at: new Date().toISOString() } : row));
    } else {
      const { data, error } = await client.from("predictions").insert({ gameweek_id: gameweek.id, member_id: viewerProfile.id, fixture_id: fixtureId }).select().single();
      if (error) return setMessage(error.message.includes("duplicate") ? "That fixture has just been taken by another player." : error.message);
      if (data) setPredictions((rows) => [...rows, data as Prediction]);
    }
    setMessage("Pick saved ✓");
  }

  async function signOut() { await createClient().auth.signOut(); window.location.href = "/"; }
  function navigate(id: string) { setMobileMenu(false); setActiveView(id); }
  function emulate(id: string) { setEmulatedProfileId(id); setActiveView("dashboard"); setMobileMenu(false); }
  async function triggerRousset() { setMobileMenu(false); setRoussetOpen(true); try { await fetch("/api/easter-egg/rousset", { method: "POST", headers: { authorization: `Bearer ${await token()}` } }); } catch {} }

  return (
    <AuthenticatedShellFrame
      navItems={authenticatedNavItems}
      activeView={activeView}
      isAdmin={isAdmin}
      alertsCount={alertsCount}
      mobileMenuOpen={mobileMenu}
      profileName={profile.display_name}
      profileMeta={profile.role === "ultimate_admin" ? "Ultimate Admin" : profile.role === "admin" ? "League Admin" : profile.username}
      profileInitials={initials(profile.display_name)}
      onOpenMenu={() => setMobileMenu(true)}
      onCloseMenu={() => setMobileMenu(false)}
      onNavigate={navigate}
      onEasterEgg={() => void triggerRousset()}
      onSignOut={signOut}
      afterContent={<>
        {emulatedProfile ? <button type="button" className={styles.emulationBanner} onClick={() => { setEmulatedProfileId(null); setActiveView("admin"); }}>✕ Viewing as {emulatedProfile.display_name} · read only</button> : null}
        {roussetOpen ? <div className={styles.roussetOverlay} role="dialog" aria-modal="true" onClick={() => setRoussetOpen(false)}><div onClick={(event) => event.stopPropagation()}><img src="https://londonhearts.com/images/ianc/images/Gilles_Rousset.jpg" alt="Gilles Rousset during his Hearts career"/><strong>You&apos;ve just been Roussetted</strong><button type="button" onClick={() => setRoussetOpen(false)}>Close</button></div></div> : null}
      </>}
    >
      <div className={styles.previewHeader}><div className={styles.previewIdentity}><span>BOUNCE 2.0</span><strong>{seasonLabel}</strong></div><div className={styles.gameweekRailWrap}><span>GAMEWEEKS</span><div className={styles.gameweekRail} role="list" aria-label="Choose gameweek">{gameweeks.map((row) => { const active = row.id === gameweekId; return <button type="button" role="listitem" key={row.id} ref={active ? activeGameweekButton : undefined} className={active ? styles.activeGameweek : ""} aria-current={active ? "true" : undefined} onClick={() => setGameweekId(row.id)}><span>GW</span>{row.number}</button>; })}</div></div></div>

      {message ? <div className={styles.message}>{message}</div> : null}

      {activeView === "dashboard" ? <div data-v2-surface="dashboard"><V2EditorialDashboard gameweek={gameweek} profiles={profiles} fixtures={fixtures} predictions={currentPredictions} standings={standings} entryFee={entryFee} seasonLabel={seasonLabel} isOpen={isOpen && !readOnly} myId={viewerProfile.id} setView={navigate} /></div>
      : activeView === "pick" ? <div data-v2-surface="pick"><EnhancedPickPage gameweek={gameweek} fixtures={selectionFixtures} predictions={currentPredictions} profiles={profiles} isOpen={isOpen && !readOnly} myId={viewerProfile.id} selectFixture={selectFixture} /></div>
      : activeView === "table" ? <div data-v2-surface="stats"><V2StatCentre seasonLabel={seasonLabel} profiles={profiles} gameweeks={gameweeks} fixtures={fixtures} predictions={predictions} adjustments={adjustments} standings={standings} myId={viewerProfile.id} entryFee={entryFee} /></div>
      : (activeView === "admin" || activeView === "alerts") && isAdmin ? <div data-v2-surface="admin"><V2AdminCentre seasonLabel={seasonLabel} gameweek={gameweek} gameweeks={gameweeks} profiles={profiles} fixtures={currentFixtures} predictions={currentPredictions} adjustments={currentAdjustments} alertsCount={alertsCount} fixtureState={selectedFixtureState} entryFee={entryFee} isUltimate={isUltimate} onChanged={reloadSelectedGameweek} onReloadAll={() => window.location.reload()} onEmulate={isUltimate ? emulate : undefined} onAlertsChanged={reloadAlerts} /></div>
      : <section className={styles.placeholder}><span>BOUNCE 2.0</span><h1>{authenticatedNavItems.find((row) => row.id === activeView)?.label ?? "Bounce"}</h1><p>This surface is still awaiting its V2 presentation migration. Its production behaviour remains part of the V2 feature-parity gate and will not be removed from the final release.</p><button type="button" onClick={() => setActiveView("dashboard")}>Return to Dashboard</button></section>}

      <div className={styles.previewUtilities} aria-label="Preview utilities"><button type="button" onClick={() => void refreshFixtures(true)} disabled={liveRefreshing}>{liveRefreshing ? "Refreshing…" : "Refresh live data"}</button>{isAdmin ? <button type="button" onClick={() => void refreshOdds()} disabled={oddsRefreshing}>{oddsRefreshing ? "Refreshing…" : "Refresh odds"}</button> : null}</div>
    </AuthenticatedShellFrame>
  );
}
