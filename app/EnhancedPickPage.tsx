"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compareCompetitions } from "@/lib/competition-order";
import styles from "./release.module.css";
import formStyles from "./EnhancedPickPage.module.css";

type Gameweek = { id: string; number: number };
type Fixture = { id: string; gameweek_id: string | null; competition: string; country: string; home_team: string; away_team: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; odds_fractional: string | null };
type Prediction = { gameweek_id: string; member_id: string; fixture_id: string };
type Profile = { id: string; display_name: string };
type FormMatch = { id: string; date: string; opponent: string; opponentLogo: string; venue: "H" | "A"; score: string; result: "W" | "D" | "L"; btts: boolean };
type TeamForm = { id: number; name: string; logo: string; matches: FormMatch[] };
type FormPayload = { home: TeamForm; away: TeamForm };

type Props = { gameweek: Gameweek | null; fixtures: Fixture[]; predictions: Prediction[]; profiles: Profile[]; isOpen: boolean; myId: string; selectFixture: (id: string) => void };

function normaliseText(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function normaliseCountry(country: string) {
  const v = normaliseText(country);
  if (v === "england") return "England";
  if (v === "scotland") return "Scotland";
  if (v === "wales") return "Wales";
  if (v === "northern ireland") return "Northern Ireland";
  return country.trim() || "Other";
}
function competitionDisplayName(fixture: Pick<Fixture, "country" | "competition">) {
  const country = normaliseCountry(fixture.country), c = normaliseText(fixture.competition);
  if (country === "England") {
    if (["premier league","england premier league","english premier league"].includes(c)) return "English Premier League";
    if (["championship","england championship","english championship","efl championship"].includes(c)) return "English Championship";
    if (["league one","england league one","english league one","efl league one"].includes(c)) return "English League One";
    if (["league two","england league two","english league two","efl league two"].includes(c)) return "English League Two";
    if (["league cup","efl cup","england efl cup","carabao cup","england carabao cup"].includes(c)) return "England — Carabao Cup";
    if (c === "national league") return "National League";
    if (c.includes("national league north")) return "National League North";
    if (c.includes("national league south")) return "National League South";
  }
  if (country === "Scotland") {
    if (["premiership","scottish premiership","scotland premiership"].includes(c)) return "Scottish Premiership";
    if (["championship","scottish championship","scotland championship"].includes(c)) return "Scottish Championship";
    if (["league one","league 1","scottish league one","scottish league 1","scotland league one"].includes(c)) return "Scottish League One";
    if (["league two","league 2","scottish league two","scottish league 2","scotland league two"].includes(c)) return "Scottish League Two";
    if (["league cup","premier sports cup","scottish league cup"].includes(c)) return "Premier Sports Cup";
  }
  return fixture.competition.trim() || `${country} — Other`;
}
function formatKickoff(value: string) { return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
function formatFixtureOddsDisplay(value: string | null | undefined) {
  if (!value) return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return value;
  const numerator = Number(match[1]), denominator = Number(match[2]);
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? `${(numerator / denominator).toFixed(2)}/1` : value;
}
function day(value: string) { return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "2-digit" }).format(new Date(value)); }

function TeamFormPanel({ team }: { team: TeamForm }) {
  return <div className={formStyles.teamBlock}>
    <div className={formStyles.teamHead}>{team.logo ? <img src={team.logo} alt=""/> : <span className={formStyles.logoFallback}>⚽</span>}<strong>{team.name}</strong></div>
    <div className={formStyles.matchStrip}>{team.matches.map((match) => <div className={formStyles.match} key={match.id}>
      {match.opponentLogo ? <img src={match.opponentLogo} alt=""/> : <span className={formStyles.miniFallback}>•</span>}
      <small>{day(match.date)}</small>
      <span className={`${formStyles.result} ${formStyles[`result${match.result}`]}`}>{match.result}</span>
      <em>{match.venue}</em>
      <b>{match.score}</b>
      <i className={match.btts ? formStyles.bttsYes : formStyles.bttsNo}>{match.btts ? "BTTS" : "NO"}</i>
    </div>)}</div>
  </div>;
}

function FixtureForm({ fixtureId, cached, loading, error, onLoad }: { fixtureId: string; cached?: FormPayload; loading: boolean; error?: string; onLoad: () => void }) {
  if (!cached && !loading && !error) return <button type="button" className={formStyles.loadForm} onClick={onLoad}>Load last 5 games</button>;
  if (loading) return <div className={formStyles.loading}>Loading recent form…</div>;
  if (error) return <div className={formStyles.error}>{error}<button type="button" onClick={onLoad}>Retry</button></div>;
  if (!cached) return null;
  return <div className={formStyles.formCard} data-fixture={fixtureId}><div className={formStyles.formTitle}><strong>Last 5 Games</strong><span>BTTS markers included</span></div><div className={formStyles.teams}><TeamFormPanel team={cached.home}/><TeamFormPanel team={cached.away}/></div></div>;
}

export default function EnhancedPickPage({ gameweek, fixtures, predictions, profiles, isOpen, myId, selectFixture }: Props) {
  const [search, setSearch] = useState("");
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [formCache, setFormCache] = useState<Record<string, FormPayload>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const q = search.toLowerCase().trim();
  const filtered = useMemo(() => [...fixtures]
    .filter((f) => !q || `${f.home_team} ${f.away_team} ${f.competition} ${f.country} ${competitionDisplayName(f)}`.toLowerCase().includes(q))
    .sort((a, b) => compareCompetitions(competitionDisplayName(a), competitionDisplayName(b)) || a.kickoff_at.localeCompare(b.kickoff_at) || `${a.home_team} v ${a.away_team}`.localeCompare(`${b.home_team} v ${b.away_team}`)), [fixtures, q]);
  const countries = Array.from(new Set(filtered.map((f) => normaliseCountry(f.country))));

  async function loadForm(fixtureId: string) {
    setOpenFormId(fixtureId);
    if (formCache[fixtureId]) return;
    setLoadingId(fixtureId);
    setErrors((current) => ({ ...current, [fixtureId]: "" }));
    try {
      const { data } = await createClient().auth.getSession();
      const accessToken = data.session?.access_token ?? "";
      const response = await fetch(`/api/fixture-form?fixtureId=${encodeURIComponent(fixtureId)}`, { headers: { authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Recent form could not be loaded.");
      setFormCache((current) => ({ ...current, [fixtureId]: body as FormPayload }));
    } catch (error) {
      setErrors((current) => ({ ...current, [fixtureId]: error instanceof Error ? error.message : "Recent form could not be loaded." }));
    } finally { setLoadingId(null); }
  }

  return <section>
    <div className={styles.pageHeading}><div><span>{gameweek ? `GAMEWEEK ${gameweek.number}` : "NO GAMEWEEK"}</span><h2>Make My Pick</h2><p>Choose one unique eligible fixture. Tap the form icon beside a fixture to compare each team&apos;s last five games.</p></div></div>
    <div className={styles.panel}>
      <input className={styles.search} type="search" placeholder="Search team, country or competition…" value={search} onChange={(e) => setSearch(e.target.value)}/>
      {countries.map((country) => <details className={styles.fixtureDetailsNested} key={country} open={Boolean(q)}>
        <summary>{country}</summary>
        {Array.from(new Set(filtered.filter((f) => normaliseCountry(f.country) === country).map(competitionDisplayName))).map((group) => <details className={styles.fixtureDetailsLeague} key={group} open={Boolean(q)}>
          <summary>{group}</summary>
          {filtered.filter((f) => normaliseCountry(f.country) === country && competitionDisplayName(f) === group).map((f) => {
            const pred = predictions.find((p) => p.fixture_id === f.id && p.gameweek_id === gameweek?.id);
            const owner = profiles.find((p) => p.id === pred?.member_id);
            const expanded = openFormId === f.id;
            return <div className={formStyles.fixtureBlock} key={f.id}>
              <div className={`${styles.row} ${formStyles.fixtureRow}`}>
                <span>{formatKickoff(f.kickoff_at)}</span>
                <strong>{f.home_team} v {f.away_team}</strong>
                <span>{formatFixtureOddsDisplay(f.odds_fractional) ?? "—"}</span>
                <div className={formStyles.actions}>
                  <button type="button" className={formStyles.formIcon} aria-label={`${expanded ? "Hide" : "Show"} recent form for ${f.home_team} v ${f.away_team}`} aria-expanded={expanded} onClick={() => { if (expanded) setOpenFormId(null); else void loadForm(f.id); }}>◔</button>
                  <button className={styles.button} disabled={!isOpen || Boolean(owner && owner.id !== myId)} onClick={() => selectFixture(f.id)}>{owner?.id === myId ? "Picked ✓" : owner ? `Taken by ${owner.display_name}` : isOpen ? "Select" : "Closed"}</button>
                </div>
              </div>
              {expanded && <FixtureForm fixtureId={f.id} cached={formCache[f.id]} loading={loadingId === f.id} error={errors[f.id]} onLoad={() => void loadForm(f.id)}/>} 
            </div>;
          })}
        </details>)}
      </details>)}
    </div>
  </section>;
}
