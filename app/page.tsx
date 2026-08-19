import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LeagueApp from "./LeagueApp";
import PublicLeagueTable from "./PublicLeagueTable";
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

  // Make any overdue no-pick penalties visible as soon as the site is opened.
  await applyMissedPickPenalties(admin).catch(() => 0);

  // These reads do not depend on each other, so wait for them together rather than serially.
  const [settingsResponse, seasonsResponse, membershipsResponse, gameweeksResponse, profilesResponse] = await Promise.all([
    supabase.from("league_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("seasons").select("id,label,is_current,starts_at,ends_at").order("starts_at", { ascending: false }),
    supabase.from("season_memberships").select("season_id,profile_id,active,display_name_snapshot"),
    supabase.from("gameweeks").select("id,number,status,opens_at,locks_at,season_id").order("number", { ascending: true }),
    supabase.from("profiles").select("id,username,display_name,role,active,slot_number").eq("approved", true).order("slot_number"),
  ]);

  const settings = settingsResponse.data;
  const seasons = seasonsResponse.data;
  const seasonMemberships = membershipsResponse.data;
  const allGameweeks = gameweeksResponse.data;
  const profiles = profilesResponse.data;

  const currentSeason = (seasons ?? []).find((season) => season.is_current) ?? null;
  const seasonGameweeks = (allGameweeks ?? []).filter((gameweek) => gameweek.season_id === currentSeason?.id);
  const nowIso = new Date().toISOString();
  const openedGameweeks = seasonGameweeks.filter((item) => !item.opens_at || item.opens_at <= nowIso);
  const gameweek =
    openedGameweeks.find((item) => item.status === "open" && item.locks_at > nowIso) ??
    openedGameweeks[openedGameweeks.length - 1] ??
    seasonGameweeks.find((item) => !item.opens_at || item.opens_at <= nowIso) ??
    seasonGameweeks[0] ??
    null;
  const currentGameweekIds = seasonGameweeks.map((item) => item.id);
  const allGameweekIds = (allGameweeks ?? []).map((item) => item.id);

  // The general Fixtures page is deliberately broader than Make My Pick.
  // Load every fixture stored for the current calendar week and the following week,
  // regardless of gameweek, eligibility, kick-off day/time, or club exclusions.
  const now = new Date();
  const currentWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const mondayOffset = (currentWeekStart.getUTCDay() + 6) % 7;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - mondayOffset);
  const followingWeekEnd = new Date(currentWeekStart);
  followingWeekEnd.setUTCDate(followingWeekEnd.getUTCDate() + 14);

  const currentFixturesPromise = currentGameweekIds.length
    ? supabase
        .from("fixtures")
        .select("*")
        .in("gameweek_id", currentGameweekIds)
        .order("kickoff_at")
        .order("competition")
        .order("home_team")
    : Promise.resolve({ data: [] as any[] });

  const allFixturesPromise = supabase
    .from("fixtures")
    .select("*")
    .gte("kickoff_at", currentWeekStart.toISOString())
    .lt("kickoff_at", followingWeekEnd.toISOString())
    .order("kickoff_at")
    .order("competition")
    .order("home_team");

  const predictionsPromise = allGameweekIds.length
    ? supabase
        .from("predictions")
        .select("id,gameweek_id,member_id,fixture_id,points_awarded,created_at,updated_at")
        .in("gameweek_id", allGameweekIds)
    : Promise.resolve({ data: [] as PredictionRow[] });

  const adjustmentsPromise = allGameweekIds.length
    ? supabase
        .from("score_adjustments")
        .select("id,gameweek_id,member_id,points,reason,source,created_at,updated_at")
        .in("gameweek_id", allGameweekIds)
    : Promise.resolve({ data: [] as ScoreAdjustmentRow[] });

  const [currentFixturesResponse, allFixtureResponse, predictionResponse, adjustmentResponse] = await Promise.all([
    currentFixturesPromise,
    allFixturesPromise,
    predictionsPromise,
    adjustmentsPromise,
  ]);

  const fixtures = currentFixturesResponse.data ?? [];
  const allFixtures = allFixtureResponse.data ?? [];
  const allPredictions = (predictionResponse.data ?? []) as PredictionRow[];
  const allAdjustments = (adjustmentResponse.data ?? []) as ScoreAdjustmentRow[];

  const predictions = allPredictions.filter((prediction) => currentGameweekIds.includes(prediction.gameweek_id));
  const adjustments = allAdjustments.filter((adjustment) => currentGameweekIds.includes(adjustment.gameweek_id));
  const profileRows = (profiles ?? []) as ProfileRow[];

  const seasonHistory = (seasons ?? []).map((season) => {
    const gameweeks = (allGameweeks ?? []).filter((item) => item.season_id === season.id);
    const gameweekIds = new Set(gameweeks.map((item) => item.id));
    const leagueMemberIds = new Set(profileRows.filter((member) => member.role !== "guest").map((member) => member.id));
    const scored = allPredictions.filter((prediction) =>
      leagueMemberIds.has(prediction.member_id) && gameweekIds.has(prediction.gameweek_id) && prediction.points_awarded !== null
    );
    const seasonAdjustments = allAdjustments.filter((adjustment) => {
      if (!leagueMemberIds.has(adjustment.member_id) || !gameweekIds.has(adjustment.gameweek_id)) return false;
      const hasScoredPrediction = scored.some((prediction) => prediction.member_id === adjustment.member_id && prediction.gameweek_id === adjustment.gameweek_id);
      const isMissedSelection = adjustment.reason.trim().toLowerCase() === "missed selection";
      if (hasScoredPrediction && isMissedSelection) return false;
      return true;
    });
    const participantIds = new Set([
      ...scored.map((prediction) => prediction.member_id),
      ...seasonAdjustments.map((adjustment) => adjustment.member_id),
    ]);
    const standings = profileRows
      .filter((member) => member.role !== "guest" && participantIds.has(member.id))
      .map((member) => {
        const memberPredictions = scored.filter((prediction) => prediction.member_id === member.id);
        const memberAdjustments = seasonAdjustments.filter((adjustment) => adjustment.member_id === member.id);
        return {
          id: member.id,
          name: (seasonMemberships ?? []).find((membership) => membership.season_id === season.id && membership.profile_id === member.id)?.display_name_snapshot ?? member.display_name,
          played: new Set([
            ...memberPredictions.map((prediction) => prediction.gameweek_id),
            ...memberAdjustments.map((adjustment) => adjustment.gameweek_id),
          ]).size,
          wins: memberPredictions.filter((prediction) => prediction.points_awarded === 3).length,
          zeroZeroCount: memberPredictions.filter((prediction) => prediction.points_awarded === -1).length,
          points:
            memberPredictions.reduce((sum, prediction) => sum + Number(prediction.points_awarded ?? 0), 0) +
            memberAdjustments.reduce((sum, adjustment) => sum + Number(adjustment.points), 0),
        };
      })
      .sort((a, b) =>
        b.points - a.points ||
        a.zeroZeroCount - b.zeroZeroCount ||
        b.wins - a.wins ||
        a.name.localeCompare(b.name)
      );

    return {
      id: season.id,
      label: season.label,
      isCurrent: season.is_current,
      gameweeks: gameweeks.length,
      completedPicks: new Set([
        ...scored.map((prediction) => `${prediction.gameweek_id}:${prediction.member_id}`),
        ...seasonAdjustments.map((adjustment) => `${adjustment.gameweek_id}:${adjustment.member_id}`),
      ]).size,
      standings,
    };
  });

  return (
    <LeagueApp
      initialProfile={profile}
      initialProfiles={profileRows}
      initialGameweek={gameweek ?? null}
      initialGameweeks={seasonGameweeks}
      initialFixtures={fixtures}
      initialAllFixtures={allFixtures}
      initialPredictions={predictions}
      initialAdjustments={adjustments}
      seasonLabel={currentSeason?.label ?? settings?.current_season_label ?? "2026/27"}
      entryFee={Number(settings?.entry_fee ?? 20)}
      seasonHistory={seasonHistory}
    />
  );
}
