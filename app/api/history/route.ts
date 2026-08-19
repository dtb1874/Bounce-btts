import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PredictionRow = {
  gameweek_id: string;
  member_id: string;
  points_awarded: number | null;
};

type AdjustmentRow = {
  gameweek_id: string;
  member_id: string;
  points: number;
  reason: string;
};

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await admin
    .from("profiles")
    .select("id,approved,active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.approved || !profile.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [seasonsResponse, profilesResponse, membershipsResponse] = await Promise.all([
    admin.from("seasons").select("id,label,is_current,starts_at,ends_at").eq("is_current", false).order("starts_at", { ascending: false }),
    admin.from("profiles").select("id,display_name,role,active").eq("approved", true).order("slot_number"),
    admin.from("season_memberships").select("season_id,profile_id,active,display_name_snapshot"),
  ]);

  const seasons = seasonsResponse.data ?? [];
  const profiles = profilesResponse.data ?? [];
  const memberships = membershipsResponse.data ?? [];
  const seasonIds = seasons.map((season) => season.id);
  if (!seasonIds.length) return NextResponse.json({ seasonHistory: [] });

  const { data: gameweeks } = await admin
    .from("gameweeks")
    .select("id,number,season_id")
    .in("season_id", seasonIds)
    .order("number", { ascending: true });

  const gameweekIds = (gameweeks ?? []).map((gameweek) => gameweek.id);
  let predictions: PredictionRow[] = [];
  let adjustments: AdjustmentRow[] = [];
  if (gameweekIds.length) {
    const [predictionResponse, adjustmentResponse] = await Promise.all([
      admin.from("predictions").select("gameweek_id,member_id,points_awarded").in("gameweek_id", gameweekIds),
      admin.from("score_adjustments").select("gameweek_id,member_id,points,reason").in("gameweek_id", gameweekIds),
    ]);
    predictions = (predictionResponse.data ?? []) as PredictionRow[];
    adjustments = (adjustmentResponse.data ?? []) as AdjustmentRow[];
  }

  const leagueMemberIds = new Set(profiles.filter((member) => member.role !== "guest").map((member) => member.id));
  const seasonHistory = seasons.map((season) => {
    const seasonGameweeks = (gameweeks ?? []).filter((item) => item.season_id === season.id);
    const seasonGameweekIds = new Set(seasonGameweeks.map((item) => item.id));
    const scored = predictions.filter((prediction) =>
      leagueMemberIds.has(prediction.member_id) && seasonGameweekIds.has(prediction.gameweek_id) && prediction.points_awarded !== null
    );
    const seasonAdjustments = adjustments.filter((adjustment) => {
      if (!leagueMemberIds.has(adjustment.member_id) || !seasonGameweekIds.has(adjustment.gameweek_id)) return false;
      const hasScoredPrediction = scored.some((prediction) => prediction.member_id === adjustment.member_id && prediction.gameweek_id === adjustment.gameweek_id);
      const isMissedSelection = adjustment.reason.trim().toLowerCase() === "missed selection";
      return !(hasScoredPrediction && isMissedSelection);
    });
    const participantIds = new Set([
      ...scored.map((prediction) => prediction.member_id),
      ...seasonAdjustments.map((adjustment) => adjustment.member_id),
    ]);
    const standings = profiles
      .filter((member) => member.role !== "guest" && participantIds.has(member.id))
      .map((member) => {
        const memberPredictions = scored.filter((prediction) => prediction.member_id === member.id);
        const memberAdjustments = seasonAdjustments.filter((adjustment) => adjustment.member_id === member.id);
        return {
          id: member.id,
          name: memberships.find((membership) => membership.season_id === season.id && membership.profile_id === member.id)?.display_name_snapshot ?? member.display_name,
          played: new Set([
            ...memberPredictions.map((prediction) => prediction.gameweek_id),
            ...memberAdjustments.map((adjustment) => adjustment.gameweek_id),
          ]).size,
          wins: memberPredictions.filter((prediction) => prediction.points_awarded === 3).length,
          zeroZeroCount: memberPredictions.filter((prediction) => prediction.points_awarded === -1).length,
          points: memberPredictions.reduce((sum, prediction) => sum + Number(prediction.points_awarded ?? 0), 0) + memberAdjustments.reduce((sum, adjustment) => sum + Number(adjustment.points), 0),
        };
      })
      .sort((a, b) => b.points - a.points || a.zeroZeroCount - b.zeroZeroCount || b.wins - a.wins || a.name.localeCompare(b.name));

    return {
      id: season.id,
      label: season.label,
      isCurrent: false,
      gameweeks: seasonGameweeks.length,
      completedPicks: new Set([
        ...scored.map((prediction) => `${prediction.gameweek_id}:${prediction.member_id}`),
        ...seasonAdjustments.map((adjustment) => `${adjustment.gameweek_id}:${adjustment.member_id}`),
      ]).size,
      standings,
    };
  });

  return NextResponse.json({ seasonHistory });
}
