import { createAdminClient } from "@/lib/supabase/admin";
import { applyMissedPickPenalties } from "@/lib/missed-picks";

export type PublicStandingRow = {
  id: string;
  name: string;
  played: number;
  wins: number;
  oneSided: number;
  zeroZeroCount: number;
  points: number;
};

export type PublicTableData = {
  seasonLabel: string;
  prizePot: number;
  gameweekNumber: number | null;
  rows: PublicStandingRow[];
};

type PublicPrediction = {
  gameweek_id: string;
  member_id: string;
  points_awarded: number | null;
};

type PublicAdjustment = {
  gameweek_id: string;
  member_id: string;
  points: number;
};

export async function loadPublicTableData(): Promise<PublicTableData> {
  const admin = createAdminClient();
  await applyMissedPickPenalties(admin).catch(() => 0);
  const { data: settings } = await admin
    .from("league_settings")
    .select("current_season_label,entry_fee")
    .eq("id", true)
    .maybeSingle();

  const { data: currentSeason } = await admin
    .from("seasons")
    .select("id,label")
    .eq("is_current", true)
    .maybeSingle();

  const { data: gameweeks } = currentSeason?.id
    ? await admin.from("gameweeks").select("id,number,opens_at,locks_at,status").eq("season_id", currentSeason.id).order("number")
    : { data: [] };
  const gameweekIds = (gameweeks ?? []).map((item) => item.id);
  const nowIso = new Date().toISOString();
  const currentGameweek =
    (gameweeks ?? []).filter((item) => !item.opens_at || item.opens_at <= nowIso).sort((a, b) => b.number - a.number)[0] ??
    null;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,display_name,active")
    .eq("approved", true)
    .eq("active", true);

  let predictions: PublicPrediction[] = [];
  let adjustments: PublicAdjustment[] = [];
  if (gameweekIds.length) {
    const [predictionResponse, adjustmentResponse] = await Promise.all([
      admin
        .from("predictions")
        .select("gameweek_id,member_id,points_awarded")
        .in("gameweek_id", gameweekIds),
      admin
        .from("score_adjustments")
        .select("gameweek_id,member_id,points")
        .in("gameweek_id", gameweekIds),
    ]);
    predictions = (predictionResponse.data ?? []) as PublicPrediction[];
    adjustments = (adjustmentResponse.data ?? []) as PublicAdjustment[];
  }

  const rows = (profiles ?? [])
    .map((profile) => {
      const memberPredictions = predictions.filter(
        (prediction) => prediction.member_id === profile.id && prediction.points_awarded !== null,
      );
      const memberAdjustments = adjustments.filter((adjustment) => adjustment.member_id === profile.id);
      return {
        id: profile.id,
        name: profile.display_name,
        played: new Set([
          ...memberPredictions.map((prediction) => prediction.gameweek_id),
          ...memberAdjustments.map((adjustment) => adjustment.gameweek_id),
        ]).size,
        wins: memberPredictions.filter((prediction) => prediction.points_awarded === 3).length,
        oneSided: memberPredictions.filter((prediction) => prediction.points_awarded === 1).length,
        zeroZeroCount: memberPredictions.filter((prediction) => prediction.points_awarded === -1).length,
        points:
          memberPredictions.reduce(
            (sum, prediction) => sum + Number(prediction.points_awarded ?? 0),
            0,
          ) + memberAdjustments.reduce((sum, adjustment) => sum + Number(adjustment.points), 0),
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.zeroZeroCount - b.zeroZeroCount ||
        b.wins - a.wins ||
        a.name.localeCompare(b.name),
    );

  const namedProfiles = (profiles ?? []).filter((profile) => !/^user\d+$/i.test(profile.display_name.trim()));

  return {
    seasonLabel: currentSeason?.label ?? settings?.current_season_label ?? "2026/27",
    prizePot: namedProfiles.length * Number(settings?.entry_fee ?? 20),
    gameweekNumber: currentGameweek?.number ?? null,
    rows,
  };
}
