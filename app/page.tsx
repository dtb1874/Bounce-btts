import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LeagueApp from "./LeagueApp";
import PublicLeagueTable from "./PublicLeagueTable";
import PositionRacePortal from "./PositionRacePortal";
import SweepTracker from "./SweepTracker";
import StatsCentreEnhancer from "./StatsCentreEnhancer";
import { loadPublicTableData } from "@/lib/public-table";
import { applyMissedPickPenalties } from "@/lib/missed-picks";

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

export default async function HomePage() {
  const admin = createAdminClient();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
  if ((count ?? 0) === 0) redirect("/setup");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const publicTable = await loadPublicTableData();
    return <PublicLeagueTable {...publicTable} />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,role,approved,active,slot_number")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.approved) redirect("/login");

  await applyMissedPickPenalties(admin).catch(() => 0);

  const [settingsResponse, seasonsResponse, profilesResponse] = await Promise.all([
    supabase.from("league_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("seasons").select("id,label,is_current,starts_at,ends_at").order("starts_at", { ascending: false }),
    supabase.from("profiles").select("id,username,display_name,role,active,slot_number").eq("approved", true).order("slot_number"),
  ]);

  const settings = settingsResponse.data;
  const seasons = seasonsResponse.data;
  const profiles = profilesResponse.data;

  const currentSeason = (seasons ?? []).find((season) => season.is_current) ?? null;
  const gameweeksResponse = currentSeason?.id
    ? await supabase.from("gameweeks").select("id,number,status,opens_at,locks_at,season_id,selection_rule_mode,selection_weekday,selection_time").eq("season_id", currentSeason.id).order("number", { ascending: true })
    : { data: [] };
  const seasonGameweeks = gameweeksResponse.data ?? [];
  const nowIso = new Date().toISOString();
  const openedGameweeks = seasonGameweeks.filter((item) => !item.opens_at || item.opens_at <= nowIso);
  const gameweek =
    openedGameweeks.find((item) => item.status === "open" && item.locks_at > nowIso) ??
    openedGameweeks[openedGameweeks.length - 1] ??
    seasonGameweeks.find((item) => !item.opens_at || item.opens_at <= nowIso) ??
    seasonGameweeks[0] ??
    null;
  const currentGameweekIds = seasonGameweeks.map((item) => item.id);

  const currentFixturesPromise = currentGameweekIds.length
    ? supabase
        .from("fixtures")
        .select("*")
        .in("gameweek_id", currentGameweekIds)
        .order("kickoff_at")
        .order("competition")
        .order("home_team")
    : Promise.resolve({ data: [] as any[] });

  const predictionsPromise = currentGameweekIds.length
    ? supabase
        .from("predictions")
        .select("id,gameweek_id,member_id,fixture_id,points_awarded,created_at,updated_at")
        .in("gameweek_id", currentGameweekIds)
    : Promise.resolve({ data: [] as PredictionRow[] });

  const adjustmentsPromise = currentGameweekIds.length
    ? supabase
        .from("score_adjustments")
        .select("id,gameweek_id,member_id,points,reason,source,created_at,updated_at")
        .in("gameweek_id", currentGameweekIds)
    : Promise.resolve({ data: [] as ScoreAdjustmentRow[] });

  const [currentFixturesResponse, predictionResponse, adjustmentResponse] = await Promise.all([
    currentFixturesPromise,
    predictionsPromise,
    adjustmentsPromise,
  ]);

  const fixtures = currentFixturesResponse.data ?? [];
  const allPredictions = (predictionResponse.data ?? []) as PredictionRow[];
  const allAdjustments = (adjustmentResponse.data ?? []) as ScoreAdjustmentRow[];

  const predictions = allPredictions.filter((prediction) => currentGameweekIds.includes(prediction.gameweek_id));
  const adjustments = allAdjustments.filter((adjustment) => currentGameweekIds.includes(adjustment.gameweek_id));
  const profileRows = (profiles ?? []) as ProfileRow[];
  const seasonLabel = currentSeason?.label ?? settings?.current_season_label ?? "2026/27";

  return (
    <>
      <LeagueApp
        initialProfile={profile}
        initialProfiles={profileRows}
        initialGameweek={gameweek ?? null}
        initialGameweeks={seasonGameweeks}
        initialFixtures={fixtures}
        initialPredictions={predictions}
        initialAdjustments={adjustments}
        seasonLabel={seasonLabel}
        entryFee={Number(settings?.entry_fee ?? 20)}
      />
      <PositionRacePortal
        profiles={profileRows}
        gameweeks={seasonGameweeks}
        predictions={predictions}
        adjustments={adjustments}
        seasonLabel={seasonLabel}
      />
      <SweepTracker
        seasonLabel={seasonLabel}
        gameweeks={seasonGameweeks}
        predictions={predictions}
        fixtures={fixtures}
      />
      <StatsCentreEnhancer />
    </>
  );
}
