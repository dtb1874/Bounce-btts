import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { competitionKey, isUkFixtureCountry } from "@/lib/uk-competition-settings";
import { isExcludedBounceClub, kickoffMatchesSelectionRule } from "@/lib/gameweek-rules";

export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin } = context;
  // Page through fixtures: Supabase defaults to a maximum of 1,000 rows.
  const known = new Map<string, { country: string; competition: string; count: number }>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("fixtures").select("country,competition").range(offset, offset + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const fixture of data ?? []) {
      if (!isUkFixtureCountry(fixture.country)) continue;
      const key = competitionKey(fixture.country, fixture.competition);
      const row = known.get(key) ?? { country: fixture.country, competition: fixture.competition, count: 0 };
      row.count++;
      known.set(key, row);
    }
    if ((data ?? []).length < 1000) break;
  }
  const { data: overrides, error } = await admin.from("fixture_competition_settings").select("country,competition,enabled");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const disabled = new Set((overrides ?? []).filter(row => !row.enabled).map(row => competitionKey(row.country, row.competition)));
  for (const row of overrides ?? []) {
    const key = competitionKey(row.country, row.competition);
    if (!known.has(key)) known.set(key, { country: row.country, competition: row.competition, count: 0 });
  }
  const competitions = [...known.values()].map(row => ({ ...row, enabled: !disabled.has(competitionKey(row.country, row.competition)) }))
    .sort((a,b) => a.country.localeCompare(b.country) || a.competition.localeCompare(b.competition));
  return NextResponse.json({ competitions });
}

export async function PATCH(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin, user } = context;
  const body = await request.json().catch(() => null);
  const country = String(body?.country ?? "").trim();
  const competition = String(body?.competition ?? "").trim();
  if (!isUkFixtureCountry(country) || !competition || competition.length > 180 || typeof body?.enabled !== "boolean")
    return NextResponse.json({ error: "Select a valid UK competition and enabled state." }, { status: 400 });
  // Only allow competitions already observed from the UK provider feed or previously configured.
  const { data: observed, error: observedError } = await admin.from("fixtures").select("id")
    .eq("country", country).eq("competition", competition).limit(1);
  if (observedError) return NextResponse.json({ error: observedError.message }, { status: 500 });
  const { data: configured } = await admin.from("fixture_competition_settings").select("country")
    .eq("country", country).eq("competition", competition).maybeSingle();
  if (!observed?.length && !configured) return NextResponse.json({ error: "Unknown UK competition." }, { status: 400 });
  const { error } = await admin.from("fixture_competition_settings").upsert({
    country, competition, enabled: body.enabled, updated_by: user.id, updated_at: new Date().toISOString(),
  }, { onConflict: "country,competition" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Immediately update upcoming choices, without rewriting completed games or historical scoring.
  const { data: weeks, error: weekError } = await admin.from("gameweeks")
    .select("id,selection_rule_mode,selection_weekday,selection_time,selection_times,selection_time_from,selection_time_to,one_off_rule");
  if (weekError) return NextResponse.json({ error: weekError.message }, { status: 500 });
  const weekById = new Map((weeks ?? []).map(week => [week.id, week]));
  const now = new Date().toISOString();
  let updated = 0;
  for (let offset = 0; ; offset += 500) {
    const { data: rows, error: rowsError } = await admin.from("fixtures")
      .select("id,gameweek_id,kickoff_at,home_team,away_team,status,source")
      .eq("country", country).eq("competition", competition).gte("kickoff_at", now)
      .order("id").range(offset, offset + 499);
    if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });
    for (const fixture of rows ?? []) {
      const week = weekById.get(fixture.gameweek_id);
      const selectable = Boolean(body.enabled && week && ["NS","TBD"].includes(fixture.status)
        && !isExcludedBounceClub(fixture.home_team, fixture.away_team)
        && kickoffMatchesSelectionRule(fixture.kickoff_at, week));
      const { error: updateError } = await admin.from("fixtures").update({ is_eligible: selectable }).eq("id", fixture.id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      updated++;
    }
    if ((rows ?? []).length < 500) break;
  }
  await admin.from("audit_log").insert({ actor_id: user.id, action: "competition_availability_changed",
    entity_type: "competition", details: { country, competition, enabled: body.enabled, affectedFixtures: updated } });
  return NextResponse.json({ country, competition, enabled: body.enabled, updated });
}
