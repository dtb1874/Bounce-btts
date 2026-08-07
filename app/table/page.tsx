import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PublicPrediction = { member_id: string; points_awarded: number | null };

export default async function PublicTablePage() {
  const admin = createAdminClient();
  const { data: settings } = await admin.from("league_settings").select("current_season_label,entry_fee").eq("id", true).maybeSingle();
  const { data: currentSeason } = await admin.from("seasons").select("id,label").eq("is_current", true).maybeSingle();

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

  const rows = (profiles ?? []).map((profile) => {
    const memberPredictions = predictions.filter((prediction) => prediction.member_id === profile.id && prediction.points_awarded !== null);
    return {
      id: profile.id,
      name: profile.display_name,
      played: memberPredictions.length,
      wins: memberPredictions.filter((prediction) => prediction.points_awarded === 3).length,
      zeros: memberPredictions.filter((prediction) => prediction.points_awarded === -1).length,
      points: memberPredictions.reduce((sum, prediction) => sum + Number(prediction.points_awarded ?? 0), 0),
    };
  }).sort((a, b) => b.points - a.points || a.zeros - b.zeros || b.wins - a.wins || a.name.localeCompare(b.name));

  return (
    <main className="publicTablePage">
      <header className="publicHero">
        <img src="/assets/hearts-crest.png" alt="Heart of Midlothian crest" />
        <div><p>EST 2024 · SEASON {currentSeason?.label ?? settings?.current_season_label ?? "2026/27"}</p><h1>BOUNCE</h1><h2>BTTS LEAGUE</h2></div>
      </header>
      <section className="publicTableCard">
        <div className="publicTableHeading"><div><span>PUBLIC STANDINGS</span><h3>League Table</h3></div><strong>Prize pot £{((profiles?.length ?? 0) * Number(settings?.entry_fee ?? 20)).toFixed(0)}</strong></div>
        <div className="largeTable"><div className="largeTableRow header"><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>0-0</span><span>PTS</span></div>{rows.map((row,index)=><div className={`largeTableRow ${index===0?"leader":""}`} key={row.id}><span>{index+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.zeros}</span><b>{row.points}</b></div>)}</div>
        <p className="tieRule">Ties: fewest 0–0 results, most BTTS wins, then alphabetical.</p>
      </section>
      <footer className="siteFooter"><span>♡</span><strong>MADE BY THE ARTIST, FOR THE BOUNCE</strong></footer>
    </main>
  );
}
