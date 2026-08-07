import { createAdminClient } from "@/lib/supabase/admin";

export type PublicStandingRow = {
  id: string;
  name: string;
  played: number;
  wins: number;
  zeroZeroCount: number;
  points: number;
};

export type PublicTableData = {
  seasonLabel: string;
  prizePot: number;
  rows: PublicStandingRow[];
};

type PublicPrediction = {
  member_id: string;
  points_awarded: number | null;
};

export async function loadPublicTableData(): Promise<PublicTableData> {
  const admin = createAdminClient();
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
    ? await admin.from("gameweeks").select("id").eq("season_id", currentSeason.id)
    : { data: [] };
  const gameweekIds = (gameweeks ?? []).map((item) => item.id);

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,display_name,active")
    .eq("approved", true)
    .eq("active", true);

  let predictions: PublicPrediction[] = [];
  if (gameweekIds.length) {
    const response = await admin
      .from("predictions")
      .select("member_id,points_awarded")
      .in("gameweek_id", gameweekIds);
    predictions = (response.data ?? []) as PublicPrediction[];
  }

  const rows = (profiles ?? [])
    .map((profile) => {
      const memberPredictions = predictions.filter(
        (prediction) => prediction.member_id === profile.id && prediction.points_awarded !== null,
      );
      return {
        id: profile.id,
        name: profile.display_name,
        played: memberPredictions.length,
        wins: memberPredictions.filter((prediction) => prediction.points_awarded === 3).length,
        zeroZeroCount: memberPredictions.filter((prediction) => prediction.points_awarded === -1).length,
        points: memberPredictions.reduce(
          (sum, prediction) => sum + Number(prediction.points_awarded ?? 0),
          0,
        ),
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.zeroZeroCount - b.zeroZeroCount ||
        b.wins - a.wins ||
        a.name.localeCompare(b.name),
    );

  return {
    seasonLabel: currentSeason?.label ?? settings?.current_season_label ?? "2026/27",
    prizePot: (profiles?.length ?? 0) * Number(settings?.entry_fee ?? 20),
    rows,
  };
}
