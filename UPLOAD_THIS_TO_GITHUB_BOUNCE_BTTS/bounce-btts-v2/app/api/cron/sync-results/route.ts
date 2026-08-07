import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pointsForScore } from "@/lib/scoring";

function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: fixtures, error } = await supabase
    .from("fixtures")
    .select("id,provider_fixture_id")
    .not("provider_fixture_id", "is", null)
    .in("status", ["NS", "1H", "HT", "2H", "ET", "P", "BT"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0;
  for (const fixture of fixtures ?? []) {
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixture.provider_fixture_id}&timezone=Europe/London`, {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      cache: "no-store"
    });
    const item = (await response.json()).response?.[0];
    if (!item) continue;
    const status = item.fixture.status.short;
    const home = item.goals.home;
    const away = item.goals.away;
    const finished = ["FT", "AET", "PEN"].includes(status);

    await supabase.from("fixtures").update({
      status,
      home_score: home,
      away_score: away,
      completed_at: finished ? new Date().toISOString() : null
    }).eq("id", fixture.id);

    if (finished && Number.isInteger(home) && Number.isInteger(away)) {
      const points = pointsForScore(home, away);
      await supabase.from("predictions").update({ points_awarded: points }).eq("fixture_id", fixture.id);
      updated++;
    }
  }

  return NextResponse.json({ updated });
}
