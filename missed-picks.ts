import type { SupabaseClient } from "@supabase/supabase-js";

export async function applyMissedPickPenalties(admin: SupabaseClient, gameweekId?: string | null) {
  const { data, error } = await admin.rpc("apply_missed_pick_penalties", {
    p_gameweek_id: gameweekId ?? null,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
