import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pointsForScore } from "@/lib/scoring";

const UK_COUNTRIES = new Set(["England", "Scotland", "Wales", "Northern-Ireland"]);
const DISALLOWED = ["heart of midlothian", "hearts"];
function authorised(req: NextRequest) { const secret=process.env.CRON_SECRET; return !!secret && req.headers.get("authorization")===`Bearer ${secret}`; }
function nextSaturday(){ const d=new Date(); const days=(6-d.getUTCDay()+7)%7; d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); }

export async function GET(req: NextRequest){
  if(!authorised(req)) return NextResponse.json({error:"Unauthorised"},{status:401});
  if(!process.env.API_FOOTBALL_KEY) return NextResponse.json({error:"Missing API_FOOTBALL_KEY"},{status:500});
  const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
  let resultsUpdated=0;
  const {data:active}=await supabase.from("fixtures").select("id,provider_fixture_id").not("provider_fixture_id","is",null).in("status",["NS","1H","HT","2H","ET","P","BT"]);
  for(const fixture of active??[]){
    const r=await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixture.provider_fixture_id}&timezone=Europe/London`,{headers:{"x-apisports-key":process.env.API_FOOTBALL_KEY},cache:"no-store"});
    if(!r.ok) continue; const item=(await r.json()).response?.[0]; if(!item) continue;
    const status=item.fixture.status.short, home=item.goals.home, away=item.goals.away, finished=["FT","AET","PEN"].includes(status);
    await supabase.from("fixtures").update({status,home_score:home,away_score:away,completed_at:finished?new Date().toISOString():null}).eq("id",fixture.id);
    if(finished&&Number.isInteger(home)&&Number.isInteger(away)){ await supabase.from("predictions").update({points_awarded:pointsForScore(home,away)}).eq("fixture_id",fixture.id); resultsUpdated++; }
  }
  const date=nextSaturday();
  const url=new URL("https://v3.football.api-sports.io/fixtures"); url.searchParams.set("date",date); url.searchParams.set("timezone","Europe/London");
  const response=await fetch(url,{headers:{"x-apisports-key":process.env.API_FOOTBALL_KEY},cache:"no-store"});
  if(!response.ok) return NextResponse.json({error:"Football provider failed",resultsUpdated},{status:502});
  const payload=await response.json();
  const fixtures=(payload.response??[]).filter((item:any)=>{ const country=item.league?.country; const time=String(item.fixture?.date??"").slice(11,16); const home=String(item.teams?.home?.name??"").toLowerCase(); const away=String(item.teams?.away?.name??"").toLowerCase(); const hearts=DISALLOWED.some(n=>home.includes(n)||away.includes(n)); return UK_COUNTRIES.has(country)&&time==="15:00"&&!hearts&&["NS","TBD"].includes(item.fixture?.status?.short); }).map((item:any)=>({provider_fixture_id:String(item.fixture.id),competition:item.league.name,country:item.league.country,home_team:item.teams.home.name,away_team:item.teams.away.name,kickoff_at:item.fixture.date,status:item.fixture.status.short,source:"api-football",is_eligible:true}));
  if(fixtures.length){ const {error}=await supabase.from("fixtures").upsert(fixtures,{onConflict:"provider_fixture_id"}); if(error) return NextResponse.json({error:error.message},{status:500}); }
  return NextResponse.json({date,fixturesImported:fixtures.length,resultsUpdated,odds:"Odds feed to be connected separately"});
}
