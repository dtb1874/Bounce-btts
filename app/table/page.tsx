import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Pred={id:string;gameweek_id:string;member_id:string;fixture_id:string;points_awarded:number|null};
type Fixture={id:string;home_team:string;away_team:string;kickoff_at:string;status:string;home_score:number|null;away_score:number|null;odds_fractional:string|null;competition:string;country:string};
type Adjustment={gameweek_id:string;member_id:string;points:number;reason:string};
type PublicProfile={id:string;display_name:string;active:boolean};
type PublicGameweek={id:string;number:number;status:string;opens_at:string|null;locks_at:string};

const finished=new Set(["FT","AET","PEN"]);
function statusText(f:Fixture){return f.status;}
function outcome(f:Fixture,p:Pred):[string,string]{if(p.points_awarded===3)return ["BTTS WON +3","good"];if(p.points_awarded===1)return ["SCORE-NIL +1","warn"];if(p.points_awarded===-1)return ["0-0 -1","bad"];if(f.home_score!=null&&f.away_score!=null){if(f.home_score>0&&f.away_score>0)return [finished.has(f.status)?"BTTS WON +3":"BTTS WINNING","good"];if(f.home_score===0&&f.away_score===0)return [finished.has(f.status)?"0-0 -1":"0-0 LIVE","bad"];return [finished.has(f.status)?"SCORE-NIL +1":"SCORE-NIL LIVE","warn"]}return ["PENDING","neutral"];}
function comp(f:Fixture){const c=f.competition.toLowerCase();if(f.country==="England"&&c.includes("premier"))return "English Premier League";if(f.country==="England"&&c.includes("championship"))return "English Championship";if(f.country==="England"&&c.includes("league one"))return "English League One";if(f.country==="England"&&c.includes("league two"))return "English League Two";return f.competition;}

export default async function PublicTablePage(){
  const admin=createAdminClient();
  const [{data:settings},{data:season},{data:profileData}]=await Promise.all([
    admin.from("league_settings").select("current_season_label,entry_fee").eq("id",true).maybeSingle(),
    admin.from("seasons").select("id,label").eq("is_current",true).maybeSingle(),
    admin.from("profiles").select("id,display_name,active").eq("approved",true).eq("active",true),
  ]);
  const profiles=(profileData??[]) as PublicProfile[];
  const gwResponse=season?.id?await admin.from("gameweeks").select("id,number,status,opens_at,locks_at").eq("season_id",season.id).order("number"):null;
  const gameweeks=((gwResponse?.data??[]) as PublicGameweek[]);
  const now=new Date().toISOString();
  const opened=gameweeks.filter(g=>!g.opens_at||g.opens_at<=now);
  const current=opened.find(g=>g.status==="open"&&g.locks_at>now)??opened[opened.length-1]??gameweeks[0]??null;
  const ids=gameweeks.map(g=>g.id);
  let predictions:Pred[]=[];let adjustments:Adjustment[]=[];
  if(ids.length){const [pr,ad]=await Promise.all([admin.from("predictions").select("id,gameweek_id,member_id,fixture_id,points_awarded").in("gameweek_id",ids),admin.from("score_adjustments").select("gameweek_id,member_id,points,reason").in("gameweek_id",ids)]);predictions=(pr.data??[]) as Pred[];adjustments=(ad.data??[]) as Adjustment[];}
  const currentPreds=predictions.filter(p=>p.gameweek_id===current?.id);
  const fixtureIds=[...new Set(currentPreds.map(p=>p.fixture_id))];let fixtures:Fixture[]=[];
  if(fixtureIds.length){const fx=await admin.from("fixtures").select("id,home_team,away_team,kickoff_at,status,home_score,away_score,odds_fractional,competition,country").in("id",fixtureIds);fixtures=(fx.data??[]) as Fixture[];}
  const rows=profiles.map(profile=>{let played=0,wins=0,scoreNil=0,zeros=0,points=0;for(const p of predictions.filter(x=>x.member_id===profile.id)){if(p.points_awarded==null)continue;played++;points+=p.points_awarded;if(p.points_awarded===3)wins++;if(p.points_awarded===1)scoreNil++;if(p.points_awarded===-1)zeros++;}for(const a of adjustments.filter(x=>x.member_id===profile.id)){const scored=predictions.some(p=>p.member_id===a.member_id&&p.gameweek_id===a.gameweek_id&&p.points_awarded!=null);if(scored&&a.reason.trim().toLowerCase()==="missed selection")continue;if(!scored)played++;points+=a.points;}return{id:profile.id,name:profile.display_name,played,wins,scoreNil,zeros,points};}).sort((a,b)=>b.points-a.points||a.zeros-b.zeros||b.wins-a.wins||a.name.localeCompare(b.name));
  const picks=profiles.map(profile=>{const p=currentPreds.find(x=>x.member_id===profile.id);const f=fixtures.find(x=>x.id===p?.fixture_id);return{profile,p,f};});
  const liveCount=picks.filter(x=>x.f&&["1H","HT","2H","ET","P","BT","INT"].includes(x.f.status)).length;
  return <main className="spectatorPage">
    <header className="spectatorHero"><div className="spectatorHeroCopy"><span>PRIVATE SPECTATOR VIEW · SEASON {season?.label??settings?.current_season_label??"2026/27"}</span><h1>BOUNCE</h1><h2>BTTS LEAGUE</h2><p>Current picks, live scores and the league race — read only.</p></div><img src="/assets/st-giles-heart.jpg" alt="Heart of Midlothian pavement mosaic"/></header>
    <nav className="spectatorNav"><a className="active" href="/table">Live League</a><a href="/stats">League Stats</a><a href="/login">Member Login</a></nav>
    <section className="spectatorStatus"><article><span>GAMEWEEK</span><strong>GW {current?.number??"—"}</strong><small>{current?.status?.toUpperCase()??"—"}</small></article><article><span>LIVE NOW</span><strong>{liveCount}</strong><small>selected matches</small></article><article><span>LEADER</span><strong>{rows[0]?.name??"—"}</strong><small>{rows[0]?`${rows[0].points} pts`:"No scores"}</small></article><article><span>SEASON POT</span><strong>£{(profiles.length*Number(settings?.entry_fee??20)).toFixed(0)}</strong><small>{profiles.length} players</small></article></section>
    <section className="spectatorSection"><div className="spectatorHeading"><div><span>GAMEWEEK {current?.number??"—"}</span><h3>Everyone's picks</h3><p>Scores and BTTS state shown from the latest league data.</p></div><b>{currentPreds.length}/{profiles.length} picks</b></div><div className="spectatorPicks">{picks.map(({profile,p,f})=>{const state:[string,string]=f&&p?outcome(f,p):["AWAITING PICK","neutral"];return <article key={profile.id} className={`spectatorPick ${state[1]}`}><div className="spectatorPlayer"><span>{profile.display_name.split(/\s+/).map((part:string)=>part[0]).join("").slice(0,2)}</span><strong>{profile.display_name}</strong></div>{f?<><div className="spectatorFixture"><strong>{f.home_team} <em>v</em> {f.away_team}</strong><small>{comp(f)} · BTTS {f.odds_fractional??"—"}</small></div><div className="spectatorScore"><strong>{f.home_score==null?"—":`${f.home_score}-${f.away_score}`}</strong><small>{statusText(f)}</small></div></>:<div className="spectatorFixture"><strong>Awaiting selection</strong><small>Nothing submitted yet</small></div>}<div className="spectatorOutcome">{state[0]}</div></article>})}</div></section>
    <section className="spectatorSection"><div className="spectatorHeading"><div><span>SEASON STANDINGS</span><h3>League Table</h3></div><a href="/stats">Explore League Stats →</a></div><div className="spectatorTable"><div className="spectatorTableRow head"><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span></div>{rows.map((r,i)=><div className={`spectatorTableRow ${i===0?"leader":""}`} key={r.id}><span>{i===0?"🏆":i+1}</span><strong>{r.name}</strong><span>{r.played}</span><span>{r.wins}</span><span>{r.scoreNil}</span><span>{r.zeros}</span><b>{r.points}</b></div>)}</div><p className="spectatorRule">Ties: fewest 0–0 results, most BTTS wins, then alphabetical.</p></section>
    <footer className="spectatorFooter"><img src="/assets/st-giles-round.jpg" alt=""/><div><strong>BOUNCE BTTS LEAGUE</strong><span>Edinburgh · Est 2024</span></div></footer>
  </main>;
}
