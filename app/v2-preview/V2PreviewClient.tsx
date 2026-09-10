"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AuthenticatedShellFrame from "../ui/AuthenticatedShellFrame";
import { authenticatedNavItems } from "../ui/navigation";
import V2EditorialDashboard from "../v2/V2EditorialDashboard";
import V2StatCentre from "../v2/V2StatCentre";
import V2AdminCentre from "../v2/V2AdminCentre";
import styles from "./V2PreviewClient.module.css";

type Role = "ultimate_admin" | "admin" | "member" | "guest";
type Profile = { id: string; username: string; display_name: string; role: Role; active: boolean; slot_number: number | null };
type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string; season_id: string | null; selection_rule_mode?: "exact_time" | "any_kickoff"; selection_weekday?: number; selection_time?: string };
type Fixture = { id: string; gameweek_id: string | null; competition: string; country: string; home_team: string; away_team: string; kickoff_at: string; status: string; live_elapsed?: number | null; home_score: number | null; away_score: number | null; odds_fractional: string | null; odds_checked_at: string | null; odds_deadline_fractional?: string | null; source: string; is_eligible: boolean };
type Prediction = { id: string; gameweek_id: string; member_id: string; fixture_id: string; points_awarded: number | null; created_at: string; updated_at: string };
type ScoreAdjustment = { id: string; gameweek_id: string; member_id: string; points: number; reason: string; source: "automatic" | "admin"; created_at: string; updated_at: string };
type Standing = { id: string; name: string; played: number; wins: number; oneSided: number; zeroZeroCount: number; points: number };

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
  const [predictions, setPredictions] = useState(initialPredictions);
  const [alertsCount, setAlertsCount] = useState(0);
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [oddsRefreshing, setOddsRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const profiles = useMemo(() => initialProfiles.filter((row) => row.active && row.role !== "guest"), [initialProfiles]);
  const isAdmin = profile.role === "admin" || profile.role === "ultimate_admin";
  const gameweek = gameweeks.find((row) => row.id === gameweekId) ?? null;
  const currentFixtures = useMemo(() => fixtures.filter((row) => row.gameweek_id === gameweekId), [fixtures, gameweekId]);
  const currentPredictions = useMemo(() => predictions.filter((row) => row.gameweek_id === gameweekId), [predictions, gameweekId]);

  const standings = useMemo<Standing[]>(() => {
    const rows = new Map<string, Standing>(profiles.map((member) => [member.id, { id: member.id, name: member.display_name, played: 0, wins: 0, oneSided: 0, zeroZeroCount: 0, points: 0 }]));
    for (const prediction of predictions) {
      if (prediction.points_awarded == null) continue;
      const row = rows.get(prediction.member_id);
      if (!row) continue;
      row.played += 1;
      row.points += prediction.points_awarded;
      if (prediction.points_awarded === 3) row.wins += 1;
      if (prediction.points_awarded === 1) row.oneSided += 1;
      if (prediction.points_awarded === -1) row.zeroZeroCount += 1;
    }
    for (const adjustment of adjustments) {
      const row = rows.get(adjustment.member_id);
      if (!row) continue;
      const scored = predictions.some((prediction) => prediction.member_id === adjustment.member_id && prediction.gameweek_id === adjustment.gameweek_id && prediction.points_awarded != null);
      if (scored && adjustment.reason.trim().toLowerCase() === "missed selection") continue;
      if (!scored) row.played += 1;
      row.points += adjustment.points;
    }
    return Array.from(rows.values()).sort((a, b) => b.points - a.points || a.zeroZeroCount - b.zeroZeroCount || b.wins - a.wins || a.name.localeCompare(b.name));
  }, [profiles, predictions, adjustments]);

  const isOpen = Boolean(
    gameweek &&
    gameweek.id === currentGameweekId &&
    gameweek.status === "open" &&
    (!gameweek.opens_at || new Date(gameweek.opens_at).getTime() <= Date.now()) &&
    new Date(gameweek.locks_at).getTime() > Date.now()
  );

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      try {
        const response = await fetch("/api/admin/alerts", { headers: { authorization: `Bearer ${await token()}` } });
        if (!response.ok) return;
        const data = await response.json();
        setAlertsCount((data.alerts ?? []).filter((row: { resolved?: boolean }) => !row.resolved).length);
      } catch {}
    })();
  }, [isAdmin]);

  async function reloadSelectedGameweek() {
    if (!gameweekId) return;
    const client = createClient();
    const [fixtureResponse, predictionResponse] = await Promise.all([
      client.from("fixtures").select("*").eq("gameweek_id", gameweekId),
      client.from("predictions").select("id,gameweek_id,member_id,fixture_id,points_awarded,created_at,updated_at").eq("gameweek_id", gameweekId),
    ]);
    if (!fixtureResponse.error && fixtureResponse.data) {
      setFixtures((rows) => [...rows.filter((row) => row.gameweek_id !== gameweekId), ...(fixtureResponse.data as Fixture[])]);
    }
    if (!predictionResponse.error && predictionResponse.data) {
      setPredictions((rows) => [...rows.filter((row) => row.gameweek_id !== gameweekId), ...(predictionResponse.data as Prediction[])]);
    }
  }

  async function refreshFixtures() {
    if (!gameweekId || liveRefreshing) return;
    setLiveRefreshing(true);
    setMessage("");
    try {
      const response = await fetch(`/api/live-results?gameweekId=${encodeURIComponent(gameweekId)}`, { headers: { authorization: `Bearer ${await token()}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not refresh fixtures");
      await reloadSelectedGameweek();
      setMessage("Live fixture data refreshed");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not refresh fixtures");
    } finally {
      setLiveRefreshing(false);
    }
  }

  async function refreshOdds() {
    if (!gameweekId || oddsRefreshing || !isAdmin) return;
    setOddsRefreshing(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/provider-sync", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ gameweekIds: [gameweekId], oddsOnly: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not refresh odds");
      await reloadSelectedGameweek();
      setMessage("BTTS odds refreshed");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not refresh odds");
    } finally {
      setOddsRefreshing(false);
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  function navigate(id: string) {
    setMobileMenu(false);
    setActiveView(id);
  }

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
      onEasterEgg={() => undefined}
      onSignOut={signOut}
    >
      <div className={styles.previewHeader}>
        <div className={styles.previewIdentity}>
          <span>BOUNCE 2.0</span>
          <strong>VISUAL RESET</strong>
          <em>{seasonLabel}</em>
        </div>
        <label className={styles.gameweekControl}>
          <span>VIEWING</span>
          <select value={gameweekId} onChange={(event) => setGameweekId(event.target.value)}>
            {gameweeks.map((row) => <option value={row.id} key={row.id}>GW {row.number}</option>)}
          </select>
        </label>
      </div>

      {message ? <div className={styles.message}>{message}</div> : null}

      {activeView === "dashboard" ? (
        <V2EditorialDashboard
          gameweek={gameweek}
          profiles={profiles}
          fixtures={currentFixtures}
          predictions={currentPredictions}
          standings={standings}
          entryFee={entryFee}
          seasonLabel={seasonLabel}
          isOpen={isOpen}
          myId={profile.id}
          setView={navigate}
        />
      ) : activeView === "table" ? (
        <V2StatCentre
          seasonLabel={seasonLabel}
          profiles={profiles}
          gameweeks={gameweeks}
          fixtures={fixtures}
          predictions={predictions}
          standings={standings}
          myId={profile.id}
        />
      ) : activeView === "admin" && isAdmin ? (
        <V2AdminCentre
          seasonLabel={seasonLabel}
          gameweek={gameweek}
          profiles={profiles}
          fixtures={currentFixtures}
          predictions={currentPredictions}
          alertsCount={alertsCount}
        />
      ) : (
        <section className={styles.placeholder}>
          <span>BOUNCE 2.0 · VISUAL RESET</span>
          <h1>{authenticatedNavItems.find((row) => row.id === activeView)?.label ?? "Bounce"}</h1>
          <p>This surface is next in the same premium redesign process. Dashboard, Stat Centre and Admin now establish the V2 visual language before the remaining product areas inherit it.</p>
          <button type="button" onClick={() => setActiveView("dashboard")}>Return to Dashboard</button>
        </section>
      )}

      <div className={styles.previewUtilities} aria-label="Preview utilities">
        <button type="button" onClick={refreshFixtures} disabled={liveRefreshing}>{liveRefreshing ? "Refreshing…" : "Refresh live data"}</button>
        {isAdmin ? <button type="button" onClick={refreshOdds} disabled={oddsRefreshing}>{oddsRefreshing ? "Refreshing…" : "Refresh odds"}</button> : null}
      </div>
    </AuthenticatedShellFrame>
  );
}
