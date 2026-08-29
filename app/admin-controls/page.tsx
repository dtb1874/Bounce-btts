import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdvancedAdminControls from "./AdvancedAdminControls";

export const dynamic = "force-dynamic";

export default async function AdminControlsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,role,active,slot_number")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "ultimate_admin") redirect("/");

  const { data: season } = await supabase
    .from("seasons")
    .select("id,label")
    .eq("is_current", true)
    .maybeSingle();

  const { data: gameweeks } = season?.id
    ? await supabase
        .from("gameweeks")
        .select("id,number,status,opens_at,locks_at,selection_rule_mode,selection_weekday,selection_time,selection_times,one_off_rule")
        .eq("season_id", season.id)
        .order("number")
    : { data: [] };

  return (
    <AdvancedAdminControls
      profile={profile}
      seasonLabel={season?.label ?? "Current season"}
      initialGameweeks={gameweeks ?? []}
    />
  );
}
