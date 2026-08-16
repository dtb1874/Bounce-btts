import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const LIVE = new Set(["1H","HT","2H","ET","P","BT","INT"]);

export async function GET(request:NextRequest){
 if(!process.env.API_FOOTBALL_KEY)return NextResponse.json({error:"Live provider unavailable"},{status:503});
 const gameweekId=request.nextUrl.searchParams.get("gameweekId")??"";
 if(!gameweekId)return NextResponse.json({error:"Missing gameweekId"},{status:400});
 const admin=createAdminClient();
 const {data:predictions,error:predictionError}=await admin.from("predictions").select("fixture_id").eq("gameweek_id",gameweekId);
 if(predictionError)return NextResponse.json({error:"Could not load selected fixtures"},{status:500});
 const localIds=[...new Set((predictions??[]).map(r=>String(r.fixture_id)).filter(Boolean))];
 if(!localIds.length)return NextResponse.json({fixtures:[],live:0,refreshedAt:new Date().toISOString()});
 const {data:fixtures,error:fixtureError}=await admin.from("fixtures").select("id,provider_fixture_id,status,home_score,away_score").in("id",localIds);
 if(fixtureError)return NextResponse.json({error:"Could not load fixtures"},{status:500});
 const providerToLocal=new Map<string,string>();for(const f of fixtures??[])if(f.provider_fixture_id!=null)providerToLocal.set(String(f.provider_fixture_id),String(f.id));
 const providerIds=[...providerToLocal.keys()];
 if(!providerIds.length)return NextResponse.json({fixtures:(fixtures??[]).map(f=>({id:String(f.id),status:String(f.status),elapsed:null,homeScore:f.home_score,awayScore:f.away_score})),live:0,refreshedAt:new Date().toISOString()});
 const result:Array<{id:string;status:string;elapsed:number|null;homeScore:number|null;awayScore:number|null}>=[];let live=0;
 for(let i=0;i<providerIds.length;i+=20){const batch=providerIds.slice(i,i+20);const url=new URL("https://v3.football.api-sports.io/fixtures");url.searchParams.set("ids",batch.join("-"));url.searchParams.set("timezone","Europe/London");const response=await fetch(url,{headers:{"x-apisports-key":process.env.API_FOOTBALL_KEY},next:{revalidate:15}});if(!response.ok)continue;const payload=await response.json();for(const item of payload.response??[]){const localId=providerToLocal.get(String(item.fixture?.id??""));if(!localId)continue;const status=String(item.fixture?.status?.short??"NS");const elapsed=Number.isInteger(item.fixture?.status?.elapsed)?Number(item.fixture.status.elapsed):null;const extra=Number.isInteger(item.fixture?.status?.extra)?Number(item.fixture.status.extra):null;const shown=elapsed!=null&&extra!=null&&extra>0?elapsed+extra:elapsed;const home=Number.isInteger(item.goals?.home)?Number(item.goals.home):null;const away=Number.isInteger(item.goals?.away)?Number(item.goals.away):null;if(LIVE.has(status))live++;result.push({id:localId,status,elapsed:shown,homeScore:home,awayScore:away});}}
 return NextResponse.json({fixtures:result,live,refreshedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, s-maxage=15, stale-while-revalidate=15"}});
}
