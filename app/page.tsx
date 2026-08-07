import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LeagueApp from "./LeagueApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const admin = createAdminClient();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
  if ((count ?? 0) === 0) redirect("/setup");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,role,approved,active,slot_number")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.approved) redirect("/login");

  const { data: settings } = await supabase.from("league_settings").select("*").eq("id", true).maybeSingle();
  const { data: currentSeason } = await supabase.from("seasons").select("id,label").eq("is_current", true).maybeSingle();

  const { data: seasonGameweeks } = currentSeason?.id
    ? await supabase.from("gameweeks").select("id,number,status,opens_at,locks_at,season_id").eq("season_id", currentSeason.id).order("number", { ascending: true })
    : { data: [] };

  const gameweeks = seasonGameweeks ?? [];
  const gameweek = gameweeks.length ? gameweeks[gameweeks.length - 1] : null;
  const gameweekIds = gameweeks.map((item) => item.id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,username,display_name,role,active,slot_number")
    .eq("approved", true)
    .order("slot_number");

  let fixtures: any[] = [];
  if (gameweek) {
    const response = await supabase
      .from("fixtures")
      .select("*")
      .eq("gameweek_id", gameweek.id)
      .eq("is_eligible", true)
      .order("kickoff_at");
    fixtures = response.data ?? [];
  }

  let predictions: any[] = [];
  if (gameweekIds.length) {
    const response = await supabase
      .from("predictions")
      .select("id,gameweek_id,member_id,fixture_id,points_awarded,created_at,updated_at")
      .in("gameweek_id", gameweekIds);
    predictions = response.data ?? [];
  }

  return (
    <LeagueApp
      initialProfile={profile}
      initialProfiles={profiles ?? []}
      initialGameweek={gameweek ?? null}
      initialFixtures={fixtures}
      initialPredictions={predictions}
      seasonLabel={currentSeason?.label ?? settings?.current_season_label ?? "2026/27"}
      entryFee={Number(settings?.entry_fee ?? 20)}
    />
  );
}
