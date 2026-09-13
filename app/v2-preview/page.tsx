import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import V2PreviewClient from "./V2PreviewClient";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  role: "ultimate_admin" | "admin" | "member" | "guest";
  approved?: boolean;
  active: boolean;
  slot_number: number | null;
};

type PredictionRow = {
  id: string;
  gameweek_id: string;
  member_id: string;
  fixture_id: string;
  points_awarded: number | null;
  created_at: string;
  updated_at: string;
};

type ScoreAdjustmentRow = {
  id: string;
  gameweek_id: string;
  member_id: string;
  points: number;
  reason: string;
  source: "automatic" | "admin";
  created_at: string;
  updated_at: string;
};

export default async function V2PreviewPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,role,approved,active,slot_number")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.approved) redirect("/login");

  const [settingsResponse, seasonsResponse, profilesResponse] = await Promise.all([
    supabase.from("league_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("seasons").select("id,label,is_current,starts_at,ends_at").order("starts_at", { ascending: false }),
    supabase.from("profiles").select("id,username,display_name,role,active,slot_number").eq("approved", true).order("slot_number"),
  ]);

  const settings = settingsResponse.data;
  const seasons = seasonsResponse.data ?? [];
  const currentSeason = seasons.find((season) => season.is_current) ?? null;

  const gameweeksResponse = currentSeason?.id
    ? await supabase
        .from("gameweeks")
        .select("id,number,status,opens_at,locks_at,season_id,selection_rule_mode,selection_weekday,selection_time,selection_times,selection_time_from,selection_time_to,one_off_rule")
        .eq("season_id", currentSeason.id)
        .order("number", { ascending: true })
    : { data: [] as any[] };

  const gameweeks = gameweeksResponse.data ?? [];
  const gameweekIds = gameweeks.map((gameweek) => gameweek.id);
  const nowIso = new Date().toISOString();
  const opened = gameweeks.filter((gameweek) => !gameweek.opens_at || gameweek.opens_at <= nowIso);
  const currentGameweek =
    opened.find((gameweek) => gameweek.status === "open" && gameweek.locks_at > nowIso) ??
    opened[opened.length - 1] ??
    gameweeks[0] ??
    null;

  const predictionsPromise = gameweekIds.length
    ? supabase
        .from("predictions")
        .select("id,gameweek_id,member_id,fixture_id,points_awarded,created_at,updated_at")
        .in("gameweek_id", gameweekIds)
    : Promise.resolve({ data: [] as PredictionRow[] });

  const fixturesPromise = gameweekIds.length
    ? supabase.from("fixtures").select("*").in("gameweek_id", gameweekIds).order("kickoff_at")
    : Promise.resolve({ data: [] as any[] });

  const adjustmentsPromise = gameweekIds.length
    ? supabase
        .from("score_adjustments")
        .select("id,gameweek_id,member_id,points,reason,source,created_at,updated_at")
        .in("gameweek_id", gameweekIds)
    : Promise.resolve({ data: [] as ScoreAdjustmentRow[] });

  const [fixturesResponse, predictionsResponse, adjustmentsResponse] = await Promise.all([
    fixturesPromise,
    predictionsPromise,
    adjustmentsPromise,
  ]);

  const baseFixtures = fixturesResponse.data ?? [];
  const predictions = (predictionsResponse.data ?? []) as PredictionRow[];
  const loadedFixtureIds = new Set(baseFixtures.map((fixture: { id: string }) => fixture.id));
  const missingPredictionFixtureIds = Array.from(new Set(
    predictions.map((prediction) => prediction.fixture_id).filter((id) => id && !loadedFixtureIds.has(id))
  ));

  const referencedFixturesResponse = missingPredictionFixtureIds.length
    ? await supabase.from("fixtures").select("*").in("id", missingPredictionFixtureIds).order("kickoff_at")
    : { data: [] as any[] };

  const fixtureMap = new Map<string, any>();
  for (const fixture of [...baseFixtures, ...(referencedFixturesResponse.data ?? [])]) fixtureMap.set(fixture.id, fixture);
  const fixtures = Array.from(fixtureMap.values()).sort((a, b) => String(a.kickoff_at).localeCompare(String(b.kickoff_at)));

  return (
    <V2PreviewClient
      profile={profile as ProfileRow}
      profiles={(profilesResponse.data ?? []) as ProfileRow[]}
      gameweeks={gameweeks}
      currentGameweekId={currentGameweek?.id ?? null}
      fixtures={fixtures}
      predictions={predictions}
      adjustments={(adjustmentsResponse.data ?? []) as ScoreAdjustmentRow[]}
      seasonLabel={currentSeason?.label ?? settings?.current_season_label ?? "2026/27"}
      entryFee={Number(settings?.entry_fee ?? 20)}
    />
  );
}