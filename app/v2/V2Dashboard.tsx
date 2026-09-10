"use client";

import { useEffect, useMemo, useState } from "react";
import { outcomeLabel } from "@/lib/scoring";
import { competitionDisplayName } from "@/lib/competition-display";
import { rollOfHonour } from "@/lib/history-data";
import WeeklyPicksShareButton from "../WeeklyPicksShareButton";
import CombinedShareButton from "../CombinedShareButton";
import ReminderShareButton from "../ReminderShareButton";
import ShareTableButton from "../ShareTableButton";
import GameweekRecapCard from "../GameweekRecapCard";
import ProfileAvatar from "../ProfileAvatar";
import styles from "./V2Dashboard.module.css";

type Role = "ultimate_admin" | "admin" | "member" | "guest";
type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "combined" | "history" | "players" | "about" | "alerts" | "admin";

type Profile = { id: string; username: string; display_name: string; role: Role; active: boolean; slot_number: number | null };
type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string; season_id: string | null; selection_rule_mode?: "exact_time" | "any_kickoff"; selection_weekday?: number; selection_time?: string };
type Fixture = { id: string; gameweek_id: string | null; competition: string; country: string; home_team: string; away_team: string; kickoff_at: string; status: string; live_elapsed?: number | null; home_score: number | null; away_score: number | null; odds_fractional: string | null; odds_checked_at: string | null; odds_deadline_fractional?: string | null; source: string; is_eligible: boolean };
type Prediction = { id: string; gameweek_id: string; member_id: string; fixture_id: string; points_awarded: number | null; created_at: string; updated_at: string };
type ScoreAdjustment = { id: string; gameweek_id: string; member_id: string; points: number; reason: string; source: "automatic" | "admin"; created_at: string; updated_at: string };
type Standing = { id: string; name: string; played: number; wins: number; oneSided: number; zeroZeroCount: number; points: number };
type SeasonHistory = { id: string; label: string; isCurrent: boolean; gameweeks: number; completedPicks: number; standings: Array<{ id: string; name: string; played: number; wins: number; oneSided?: number; zeroZeroCount: number; points: number }> };
type Portrait = { id: string; displayName?: string; portraitUrl?: string | null };

type Props = {
  gameweek: Gameweek | null;
  gameweeks: Gameweek[];
  profiles: Profile[];
  fixtures: Fixture[];
  allFixtures: Fixture[];
  predictions: Prediction[];
  allPredictions: Prediction[];
  allAdjustments: ScoreAdjustment[];
  adjustment?: ScoreAdjustment;
  myFixture?: Fixture;
  standings: Standing[];
  entryFee: number;
  seasonLabel: string;
  seasonHistory: SeasonHistory[];
  isOpen: boolean;
  role: Role;
  myId: string;
  alertsCount: number;
  setView: (view: View) => void;
  onLiveRefresh: () => void;
  liveRefreshing: boolean;
  onOddsRefresh: () => void;
  oddsRefreshing: boolean;
};

const finishedStatuses = new Set(["FT", "AET", "PEN"]);
const liveStatuses = new Set(["1H", "2H", "HT", "ET", "P", "BT", "INT", "SUSP", "LIVE"]);

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  const mod10 = value % 10;
  if (mod10 === 1) return `${value}st`;
  if (mod10 === 2) return `${value}nd`;
  if (mod10 === 3) return `${value}rd`;
  return `${value}th`;
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

function fixtureStatusLabel(fixture: Fixture) {
  return liveStatuses.has(fixture.status) && fixture.live_elapsed != null ? `${fixture.live_elapsed}′` : fixture.status;
}

function ratioFromOdds(value: string | null | undefined) {
  if (!value) return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator : null;
}

function combinedOdds(values: Array<string | null | undefined>) {
  if (!values.length) return null;
  let decimal = 1;
  for (const value of values) {
    const ratio = ratioFromOdds(value);
    if (ratio == null) return null;
    decimal *= 1 + ratio;
  }
  return `${Math.max(0, decimal - 1).toFixed(2)}/1`;
}

function pointsTone(points: number | null | undefined) {
  if (points === 3) return styles.positive;
  if (points === 1) return styles.warning;
  if (points === -1) return styles.negative;
  return styles.muted;
}

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function pickState(fixture: Fixture | undefined, prediction: Prediction | undefined) {
  if (!prediction) return { label: "NO PICK", detail: "Awaiting selection", tone: "missing" as const };
  if (!fixture) return { label: "WAITING", detail: "Fixture unavailable", tone: "waiting" as const };

  const home = fixture.home_score ?? 0;
  const away = fixture.away_score ?? 0;
  const hasBtts = home > 0 && away > 0;
  const finished = finishedStatuses.has(fixture.status);
  const kickoff = new Date(fixture.kickoff_at).getTime();
  const started = Date.now() >= kickoff || liveStatuses.has(fixture.status);

  if (hasBtts) return { label: "LANDED", detail: "Both teams scored", tone: "landed" as const };
  if (finished) return { label: "FAILED", detail: "Finished without BTTS", tone: "failed" as const };
  if (!started) return { label: "WAITING", detail: formatKickoff(fixture.kickoff_at), tone: "waiting" as const };
  if (home > 0 && away === 0) return { label: `NEEDS ${fixture.away_team}`, detail: "One goal away", tone: "needs" as const };
  if (away > 0 && home === 0) return { label: `NEEDS ${fixture.home_team}`, detail: "One goal away", tone: "needs" as const };
  return { label: "WAITING", detail: "Needs both teams", tone: "waiting" as const };
}

function lifecycleCopy(gameweek: Gameweek | null, isOpen: boolean, myPrediction: Prediction | undefined, myFixture: Fixture | undefined, fixtures: Fixture[]) {
  if (!gameweek) return { eyebrow: "LEAGUE STATUS", title: "No gameweek selected", detail: "Choose a gameweek to view its league state.", tone: "idle" as const };
  if (gameweek.status === "complete") return { eyebrow: `GAMEWEEK ${gameweek.number} · COMPLETE`, title: "The week is settled", detail: "Review the result, table impact and gameweek recap below.", tone: "complete" as const };
  if (isOpen && !myPrediction) return { eyebrow: `GAMEWEEK ${gameweek.number} · PICKS OPEN`, title: "Your pick is waiting", detail: `Selections close ${formatKickoff(gameweek.locks_at)}.`, tone: "action" as const };
  if (isOpen && myPrediction) return { eyebrow: `GAMEWEEK ${gameweek.number} · PICK SUBMITTED`, title: myFixture ? `${myFixture.home_team} v ${myFixture.away_team}` : "Your pick is in", detail: `You can change it until ${formatKickoff(gameweek.locks_at)}.`, tone: "selected" as const };
  const anyLive = fixtures.some((fixture) => liveStatuses.has(fixture.status));
  if (anyLive) return { eyebrow: `GAMEWEEK ${gameweek.number} · LIVE`, title: "The Bounce is live", detail: "Follow what each match means for the league below.", tone: "live" as const };
  return { eyebrow: `GAMEWEEK ${gameweek.number} · LOCKED`, title: myFixture ? `${myFixture.home_team} v ${myFixture.away_team}` : "Selections are locked", detail: myFixture ? `Kick-off ${formatKickoff(myFixture.kickoff_at)}.` : "Everyone's selections are shown below.", tone: "locked" as const };
}

export default function V2Dashboard({
  gameweek,
  gameweeks,
  profiles,
  fixtures,
  allFixtures,
  predictions,
  allPredictions,
  allAdjustments,
  myFixture,
  standings,
  entryFee,
  seasonLabel,
  seasonHistory,
  isOpen,
  role,
  myId,
  alertsCount,
  setView,
  onLiveRefresh,
  liveRefreshing,
  onOddsRefresh,
  oddsRefreshing,
}: Props) {
  const isAdmin = role === "admin" || role === "ultimate_admin";
  const [formRange, setFormRange] = useState<6 | 12 | 18>(6);
  const [honoursOpen, setHonoursOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [portraits, setPortraits] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/member-portraits", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { portraits?: Portrait[] };
        if (cancelled) return;
        const next = new Map<string, string>();
        for (const row of data.portraits ?? []) {
          if (row.displayName && row.portraitUrl) next.set(normalise(row.displayName), row.portraitUrl);
        }
        setPortraits(next);
      } catch {
        if (!cancelled) setPortraits(new Map());
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const picks = useMemo(() => profiles.map((profile) => {
    const prediction = predictions.find((row) => row.member_id === profile.id);
    return { profile, prediction, fixture: fixtures.find((row) => row.id === prediction?.fixture_id) };
  }), [profiles, predictions, fixtures]);

  const missingPicks = picks.filter(({ prediction }) => !prediction).map(({ profile }) => profile);
  const myPrediction = predictions.find((row) => row.member_id === myId);
  const actualMyFixture = myFixture ?? fixtures.find((fixture) => fixture.id === myPrediction?.fixture_id);
  const myStanding = standings.find((row) => row.id === myId);
  const myPositionIndex = standings.findIndex((row) => row.id === myId);
  const myPosition = myPositionIndex >= 0 ? myPositionIndex + 1 : null;
  const submitted = predictions.length;
  const finished = fixtures.filter((fixture) => finishedStatuses.has(fixture.status));
  const prizePot = profiles.length * entryFee;
  const hero = lifecycleCopy(gameweek, isOpen, myPrediction, actualMyFixture, fixtures);

  const pickStates = picks.map((row) => ({ ...row, state: pickState(row.fixture, row.prediction) }));
  const landedCount = pickStates.filter((row) => row.state.tone === "landed").length;
  const failedCount = pickStates.filter((row) => row.state.tone === "failed").length;
  const activeCount = pickStates.filter((row) => ["needs", "waiting"].includes(row.state.tone) && row.fixture && (liveStatuses.has(row.fixture.status) || Date.now() >= new Date(row.fixture.kickoff_at).getTime())).length;

  const selectedNumber = gameweek?.number ?? Math.max(0, ...gameweeks.map((row) => row.number));
  const formGameweeks = [...gameweeks]
    .filter((row) => row.number <= selectedNumber)
    .sort((a, b) => b.number - a.number)
    .slice(0, formRange)
    .sort((a, b) => a.number - b.number);

  function pointsFor(playerId: string, gameweekId: string) {
    const prediction = allPredictions.find((row) => row.member_id === playerId && row.gameweek_id === gameweekId && row.points_awarded != null);
    if (prediction?.points_awarded != null) return prediction.points_awarded;
    return allAdjustments.find((row) => row.member_id === playerId && row.gameweek_id === gameweekId)?.points ?? null;
  }

  const dynamicHonours = seasonHistory
    .filter((season) => !season.isCurrent && season.standings[0])
    .map((season) => ({ season: season.label, winner: season.standings[0].name }));
  const honours = [...rollOfHonour, ...dynamicHonours.filter((row) => !rollOfHonour.some((existing) => existing.season === row.season))]
    .sort((a, b) => b.season.localeCompare(a.season));

  const sharePicks = picks.filter((row) => row.fixture).map((row) => ({
    player: row.profile.display_name,
    homeTeam: row.fixture!.home_team,
    awayTeam: row.fixture!.away_team,
    competition: competitionDisplayName(row.fixture!),
    kickoffAt: row.fixture!.kickoff_at,
    odds: row.fixture!.odds_fractional,
    status: row.fixture!.status,
    homeScore: row.fixture!.home_score,
    awayScore: row.fixture!.away_score,
    elapsed: row.fixture!.live_elapsed ?? null,
  }));

  const combined = combinedOdds(picks.filter((row) => row.fixture).map((row) => row.fixture?.odds_fractional));

  async function shareForm() {
    const scale = 2;
    const width = 1120;
    const rowHeight = 62;
    const headerHeight = 150;
    const height = headerHeight + rowHeight * (standings.length + 1) + 34;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(scale, scale);
    context.fillStyle = "#09090d";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#641f35";
    context.fillRect(0, 0, width, 108);
    context.fillStyle = "#f5f1eb";
    context.font = "bold 34px Georgia";
    context.fillText("BOUNCE BTTS LEAGUE", 32, 48);
    context.font = "18px Arial";
    context.fillText(`Season ${seasonLabel} · ${formRange}-week form · through GW ${gameweek?.number ?? "—"}`, 32, 82);
    const nameWidth = 250;
    const totalWidth = 90;
    const availableWidth = width - 64 - nameWidth - totalWidth;
    const cellWidth = availableWidth / Math.max(formGameweeks.length, 1);
    const startY = 130;
    context.font = "bold 15px Arial";
    context.fillStyle = "#d8c1ad";
    context.fillText("PLAYER", 32, startY + 30);
    formGameweeks.forEach((row, index) => context.fillText(`GW ${row.number}`, 32 + nameWidth + index * cellWidth, startY + 30));
    context.fillText("TOTAL", width - 32 - totalWidth, startY + 30);
    standings.forEach((player, rowIndex) => {
      const y = startY + rowHeight * (rowIndex + 1);
      if (rowIndex % 2 === 0) {
        context.fillStyle = "#141419";
        context.fillRect(24, y - 8, width - 48, rowHeight);
      }
      context.fillStyle = "#f0e4da";
      context.font = "bold 16px Arial";
      context.fillText(player.name, 32, y + 28);
      const values = formGameweeks.map((row) => pointsFor(player.id, row.id));
      values.forEach((points, index) => {
        context.fillStyle = points === 3 ? "#75d7a1" : points === 1 ? "#e9c56e" : points === -1 ? "#ee8993" : "#8e878a";
        context.font = "bold 16px Arial";
        context.fillText(points == null ? "—" : points > 0 ? `+${points}` : `${points}`, 32 + nameWidth + index * cellWidth, y + 28);
      });
      const total = values.reduce<number>((sum, points) => sum + (points ?? 0), 0);
      context.fillStyle = "#f0e4da";
      context.fillText(total > 0 ? `+${total}` : `${total}`, width - 32 - totalWidth, y + 28);
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .94));
    if (!blob) return;
    const file = new File([blob], `bounce-form-${formRange}w.jpg`, { type: "image/jpeg" });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Bounce ${formRange}-week form` });
        return;
      }
    } catch {}
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className={styles.root} data-ui-foundation-view="dashboard" data-v2-dashboard="true">
      <section className={`${styles.hero} ${styles[`hero_${hero.tone}`]}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{hero.eyebrow}</span>
          <h2>{hero.title}</h2>
          <p>{hero.detail}</p>
          <div className={styles.heroActions}>
            {isOpen ? (
              <button className={styles.primaryAction} type="button" onClick={() => setView("pick")}>
                {myPrediction ? "Change my pick" : "Make my pick"}
              </button>
            ) : (
              <button className={styles.primaryAction} type="button" onClick={() => setView("results")}>View results</button>
            )}
            <button className={styles.quietAction} type="button" onClick={() => setView("table")}>Open Stat Centre</button>
          </div>
        </div>

        <div className={styles.heroFixture}>
          {actualMyFixture ? (
            <>
              <span className={styles.heroFixtureLabel}>YOUR SELECTION</span>
              <span className={styles.heroCompetition}>{competitionDisplayName(actualMyFixture)}</span>
              <div className={styles.heroTeams}>
                <strong>{actualMyFixture.home_team}</strong>
                <span>{actualMyFixture.home_score != null && actualMyFixture.away_score != null ? `${actualMyFixture.home_score} – ${actualMyFixture.away_score}` : "v"}</span>
                <strong>{actualMyFixture.away_team}</strong>
              </div>
              <div className={styles.heroFixtureMeta}>
                <span>{fixtureStatusLabel(actualMyFixture)}</span>
                <span>{actualMyFixture.odds_fractional ? `${actualMyFixture.odds_fractional} BTTS` : formatKickoff(actualMyFixture.kickoff_at)}</span>
              </div>
            </>
          ) : (
            <div className={styles.heroEmptyPick}>
              <span>YOUR SELECTION</span>
              <strong>{isOpen ? "Not submitted" : "No selection recorded"}</strong>
              <small>{isOpen ? `${profiles.length - submitted} league ${profiles.length - submitted === 1 ? "pick" : "picks"} still to come in.` : "Use the gameweek controls above to review another round."}</small>
            </div>
          )}
        </div>
      </section>

      <div className={styles.snapshot} aria-label="League snapshot">
        <div>
          <span>Position</span>
          <strong>{myPosition ? ordinal(myPosition) : "—"}</strong>
          <small>{myStanding ? `${myStanding.points} pts` : "No score yet"}</small>
        </div>
        <div>
          <span>Form</span>
          <strong>{myStanding ? `${myStanding.wins}W` : "—"}</strong>
          <small>{myStanding ? `${myStanding.played} played` : "No results yet"}</small>
        </div>
        <div>
          <span>League picks</span>
          <strong>{submitted}/{profiles.length}</strong>
          <small>{missingPicks.length ? `${missingPicks.length} still waiting` : "Everyone is in"}</small>
        </div>
        <div>
          <span>Prize pot</span>
          <strong>£{prizePot.toFixed(0)}</strong>
          <small>Season {seasonLabel}</small>
        </div>
        {isAdmin ? (
          <button className={styles.alertSnapshot} type="button" onClick={() => setView("alerts")}>
            <span>Admin alerts</span>
            <strong>{alertsCount}</strong>
            <small>{alertsCount ? "Needs attention" : "All clear"}</small>
          </button>
        ) : null}
      </div>

      {(liveStatuses.size > 0 && (landedCount > 0 || activeCount > 0 || failedCount > 0)) ? (
        <div className={styles.liveStrip} aria-label="Live Bounce state">
          <span className={styles.livePulse}>LIVE LEAGUE</span>
          <div><strong>{landedCount}</strong><small>Landed</small></div>
          <div><strong>{activeCount}</strong><small>In play</small></div>
          <div><strong>{failedCount}</strong><small>Failed</small></div>
          <span className={styles.liveStripNote}>What the current scores mean for the Bounce</span>
        </div>
      ) : null}

      <section className={styles.section} id="weekly-picks">
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.eyebrow}>GAMEWEEK {gameweek?.number ?? "—"}</span>
            <h3>Everyone's picks</h3>
            <p>{isOpen ? "Selections remain private until the league rules reveal them." : "Current scores and what each fixture means for the league."}</p>
          </div>
          <div className={styles.sectionActions}>
            <span className={styles.oddsSummary}><small>Combined BTTS</small><strong>{combined ?? "—"}</strong></span>
            <button className={styles.quietAction} type="button" onClick={() => setToolsOpen((value) => !value)} aria-expanded={toolsOpen}>Gameweek tools</button>
          </div>
        </div>

        {toolsOpen ? (
          <div className={styles.toolsBand}>
            <button type="button" onClick={onLiveRefresh} disabled={liveRefreshing}>{liveRefreshing ? "Refreshing…" : "Refresh fixtures"}</button>
            {isAdmin ? <button type="button" onClick={onOddsRefresh} disabled={oddsRefreshing || !gameweek}>{oddsRefreshing ? "Checking…" : "Refresh odds"}</button> : null}
            <WeeklyPicksShareButton disabled={!gameweek} gameweekNumber={gameweek?.number ?? 0} seasonLabel={seasonLabel} picks={sharePicks} />
            <button type="button" onClick={() => setView("combined")}>Combined results</button>
            <CombinedShareButton disabled={!gameweek} gameweekNumber={gameweek?.number ?? 0} seasonLabel={seasonLabel} picks={sharePicks} standings={standings} />
            {isAdmin && gameweek ? (
              <ReminderShareButton
                gameweekNumber={gameweek.number}
                seasonLabel={seasonLabel}
                deadline={gameweek.locks_at}
                missingNames={missingPicks.map((profile) => profile.display_name)}
                submittedPicks={picks.filter((row) => row.prediction && row.fixture).map((row) => ({ name: row.profile.display_name, fixture: `${row.fixture!.home_team} v ${row.fixture!.away_team}` }))}
                disabled={!isOpen || !missingPicks.length}
              />
            ) : null}
          </div>
        ) : null}

        <div className={styles.pickRows}>
          {pickStates.map(({ profile, prediction, fixture, state }) => {
            const outcome = fixture ? outcomeLabel(fixture.home_score, fixture.away_score, fixture.status, prediction?.points_awarded ?? null) : null;
            const displayPoints = prediction?.points_awarded ?? outcome?.points ?? null;
            return (
              <div className={`${styles.pickRow} ${profile.id === myId ? styles.myPickRow : ""}`} key={profile.id}>
                <div className={styles.memberCell}>
                  <ProfileAvatar name={profile.display_name} portraitUrl={portraits.get(normalise(profile.display_name)) ?? null} size="small" />
                  <div><strong>{profile.display_name}</strong>{profile.id === myId ? <small>You</small> : null}</div>
                </div>
                <div className={styles.fixtureCell}>
                  {fixture ? (
                    <>
                      <small>{competitionDisplayName(fixture)}</small>
                      <strong>{fixture.home_team} <span>v</span> {fixture.away_team}</strong>
                    </>
                  ) : (
                    <strong className={styles.awaiting}>Awaiting selection</strong>
                  )}
                </div>
                <div className={styles.scoreCell}>
                  <strong>{fixture?.home_score != null && fixture?.away_score != null ? `${fixture.home_score}–${fixture.away_score}` : "—"}</strong>
                  <small>{fixture ? fixtureStatusLabel(fixture) : "PENDING"}</small>
                </div>
                <div className={`${styles.stateCell} ${styles[`state_${state.tone}`]}`}>
                  <strong>{state.label}</strong>
                  <small>{state.detail}</small>
                </div>
                <div className={`${styles.pointsCell} ${pointsTone(displayPoints)}`}>{displayPoints == null ? "—" : displayPoints > 0 ? `+${displayPoints}` : displayPoints}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className={styles.dashboardFlow}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.eyebrow}>STAT CENTRE</span>
              <h3>League position</h3>
              <p>A quick read of the table. Deeper analysis lives in Stat Centre.</p>
            </div>
            <div className={styles.sectionActions}>
              <button className={styles.quietAction} type="button" onClick={() => setView("table")}>Full Stat Centre</button>
              <ShareTableButton compact rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweek?.number ?? null} prizePot={prizePot} />
            </div>
          </div>
          <div className={styles.tableRows}>
            {standings.slice(0, 8).map((row, index) => (
              <div className={`${styles.tableRow} ${row.id === myId ? styles.myTableRow : ""}`} key={row.id}>
                <span className={styles.position}>{index + 1}</span>
                <ProfileAvatar name={row.name} portraitUrl={portraits.get(normalise(row.name)) ?? null} size="small" />
                <strong className={styles.tableName}>{row.name}</strong>
                <span>{row.played}<small>P</small></span>
                <span>{row.wins}<small>W</small></span>
                <b>{row.points}<small>PTS</small></b>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.honoursSection}`}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.eyebrow}>BOUNCE HISTORY</span>
              <h3>Roll of Honour</h3>
              <p>{honours[0] ? `${honours[0].winner} is the current holder of the Bounce Cup.` : "Champions will appear here as seasons are completed."}</p>
            </div>
            <button className={styles.honoursButton} type="button" aria-expanded={honoursOpen} onClick={() => setHonoursOpen((value) => !value)}>
              <img src="/assets/bounce-cup.png" alt="" />
              <span>{honoursOpen ? "Close honours" : "View honours"}</span>
            </button>
          </div>
          {honoursOpen ? (
            <div className={styles.honoursRows}>
              {honours.map((row, index) => (
                <div key={row.season}><span>{row.season}</span><strong>{row.winner}</strong><small>{index === 0 ? "Reigning champion" : "Bounce champion"}</small></div>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <section className={styles.section} id="current-form">
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.eyebrow}>RECENT PERFORMANCE</span>
            <h3>{formRange}-week form</h3>
            <p>Points earned across the latest selected gameweeks.</p>
          </div>
          <div className={styles.sectionActions}>
            <select className={styles.select} aria-label="Form range" value={formRange} onChange={(event) => setFormRange(Number(event.target.value) as 6 | 12 | 18)}>
              <option value={6}>6 weeks</option>
              <option value={12}>12 weeks</option>
              <option value={18}>18 weeks</option>
            </select>
            <button className={styles.quietAction} type="button" onClick={shareForm}>Share form</button>
          </div>
        </div>
        <div className={styles.formLegend}><span className={styles.formWin}>+3 BTTS</span><span className={styles.formScoreNil}>+1 score–nil</span><span className={styles.formLoss}>−1 0–0 / missed</span></div>
        <div className={styles.formScroll}>
          <div className={styles.formTable} style={{ gridTemplateColumns: `minmax(142px,1.45fr) repeat(${Math.max(formGameweeks.length, 1)},minmax(46px,1fr)) 58px` }}>
            <div className={styles.formHeader}>PLAYER</div>
            {formGameweeks.map((row) => <div className={styles.formHeader} key={row.id}>GW {row.number}</div>)}
            {!formGameweeks.length ? <div className={styles.formHeader}>FORM</div> : null}
            <div className={styles.formHeader}>TOTAL</div>
            {standings.map((player) => {
              const values = formGameweeks.map((row) => pointsFor(player.id, row.id));
              const total = values.reduce<number>((sum, points) => sum + (points ?? 0), 0);
              return (
                <div className={`${styles.formRow} ${player.id === myId ? styles.myFormRow : ""}`} style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: `minmax(142px,1.45fr) repeat(${Math.max(formGameweeks.length, 1)},minmax(46px,1fr)) 58px` }} key={player.id}>
                  <div className={styles.formName}>{player.name}</div>
                  {values.map((points, index) => <div className={styles.formCell} key={`${player.id}-${formGameweeks[index].id}`}><span className={pointsTone(points)}>{points == null ? "—" : points > 0 ? `+${points}` : points}</span></div>)}
                  {!values.length ? <div className={styles.formCell}>—</div> : null}
                  <div className={styles.formTotal}>{total > 0 ? `+${total}` : total}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.recapSection} aria-label="Gameweek recap">
        <GameweekRecapCard profiles={profiles} gameweeks={gameweeks} predictions={allPredictions} adjustments={allAdjustments} fixtures={allFixtures} seasonLabel={seasonLabel} />
      </section>

      <nav className={styles.secondaryLinks} aria-label="Dashboard secondary links">
        <button type="button" onClick={() => setView("pick")}>Make My Pick <span>→</span></button>
        <button type="button" onClick={() => setView("results")}>Results <span>→</span></button>
        <button type="button" onClick={() => setView("players")}>Players <span>→</span></button>
        {isAdmin ? <button type="button" onClick={() => setView("admin")}>Admin <span>→</span></button> : null}
      </nav>
    </section>
  );
}
