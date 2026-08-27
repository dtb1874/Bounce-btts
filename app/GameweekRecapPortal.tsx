"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./GameweekStory.module.css";

type Profile={id:string;display_name:string;active:boolean;role:string};
type Gameweek={id:string;number:number;locks_at?:string|null};
type Prediction={gameweek_id:string;member_id:string;fixture_id:string;points_awarded:number|null};
type Adjustment={gameweek_id:string;member_id:string;points:number;reason?:string};
type Fixture={id:string;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status?:string|null;odds_deadline_fractional?:string|null;odds_fractional?:string|null};
type Props={profiles:Profile[];gameweeks:Gameweek[];predictions:Prediction[];adjustments:Adjustment[];fixtures:Fixture[];seasonLabel:string};
type Standing={id:string;name:string;points:number;wins:number;zeroZero:number;position:number};

function oddsRatio(value:string|null|undefined){if(!value)return null;const m=value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);if(!m)return null;const n=Number(m[1]),d=Number(m[2]);return Number.isFinite(n)&&Number.isFinite(d)&&d>0?n/d:null}
function oddsLabel(value:string|null|undefined){const ratio=oddsRatio(value);return ratio==null?"—":`${ratio.toFixed(2)}/1`}
function standingsThrough(profiles:Profile[],gameweeks:Gameweek[],predictions:Prediction[],adjustments:Adjustment[],through:number){
  const players=profiles.filter(p=>p.active&&p.role!=="guest");
  const totals=new Map(players.map(p=>[p.id,{points:0,wins:0,zeroZero:0}]));
  const weeks=[...gameweeks].filter(g=>g.number<=through).sort((a,b)=>a.number-b.number);
  for(const gw of weeks){
    for(const p of players){
      const total=totals.get(p.id)!;
      const pred=predictions.find(x=>x.gameweek_id===gw.id&&x.member_id===p.id&&x.points_awarded!=null);
      const adj=adjustments.find(x=>x.gameweek_id===gw.id&&x.member_id===p.id);
      const ignore=Boolean(pred&&adj?.reason?.trim().toLowerCase()==="missed selection");
      if(pred?.points_awarded!=null){total.points+=pred.points_awarded;if(pred.points_awarded===3)total.wins+=1;if(pred.points_awarded===-1)total.zeroZero+=1}
      if(adj&&!ignore)total.points+=adj.points;
    }
  }
  const rows:Standing[]=players.map(p=>({id:p.id,name:p.display_name,...totals.get(p.id)!,position:0})).sort((a,b)=>b.points-a.points||a.zeroZero-b.zeroZero||b.wins-a.wins||a.name.localeCompare(b.name));
  rows.forEach((r,i)=>r.position=i+1);return rows;
}
function finishedWeek(gw:Gameweek,predictions:Prediction[]){const rows=predictions.filter(p=>p.gameweek_id===gw.id);return rows.length>0&&rows.every(p=>p.points_awarded!=null)}

export default function GameweekRecapPortal(props:Props){
  const [target,setTarget]=useState<Element|null>(null);const [sharing,setSharing]=useState(false);
  useEffect(()=>{let host:HTMLDivElement|null=null;const place=()=>{const race=document.querySelector(".positionRaceDashboardHost");const dashboard=document.querySelector(".compactDashboard");if(!race||!dashboard||!dashboard.contains(race)){setTarget(null);return}if(!host){host=document.createElement("div");host.className="gameweekRecapDashboardHost"}if(race.nextElementSibling!==host)race.insertAdjacentElement("afterend",host);setTarget(host)};place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();host?.remove()}},[]);
  const recap=useMemo(()=>{
    const gw=[...props.gameweeks].filter(g=>finishedWeek(g,props.predictions)).sort((a,b)=>b.number-a.number)[0];if(!gw)return null;
    const fixtureById=new Map(props.fixtures.map(f=>[f.id,f]));const profileById=new Map(props.profiles.map(p=>[p.id,p]));
    const rows=props.predictions.filter(p=>p.gameweek_id===gw.id&&p.points_awarded!=null).map(p=>({prediction:p,fixture:fixtureById.get(p.fixture_id),name:profileById.get(p.member_id)?.display_name??"Player"}));
    const wins=rows.filter(r=>r.prediction.points_awarded===3),scoreNil=rows.filter(r=>r.prediction.points_awarded===1).length,zeroZero=rows.filter(r=>r.prediction.points_awarded===-1).length;
    const goals=rows.reduce((sum,r)=>sum+Number(r.fixture?.home_score??0)+Number(r.fixture?.away_score??0),0);
    const standings=standingsThrough(props.profiles,props.gameweeks,props.predictions,props.adjustments,gw.number);const prev=gw.number>1?standingsThrough(props.profiles,props.gameweeks,props.predictions,props.adjustments,gw.number-1):[];const prevPos=new Map(prev.map(r=>[r.id,r.position]));
    const movers=standings.map(r=>({...r,move:(prevPos.get(r.id)??r.position)-r.position}));const maxMove=Math.max(0,...movers.map(r=>r.move));const biggestMovers=movers.filter(r=>r.move===maxMove&&maxMove>0);
    const pricedWins=wins.map(r=>({r,ratio:oddsRatio(r.fixture?.odds_deadline_fractional??r.fixture?.odds_fractional)})).filter((x):x is {r:typeof wins[number];ratio:number}=>x.ratio!=null);const best=pricedWins.sort((a,b)=>b.ratio-a.ratio)[0]??null;
    const maxGoals=Math.max(0,...rows.map(r=>Number(r.fixture?.home_score??0)+Number(r.fixture?.away_score??0)));const goalGame=rows.find(r=>Number(r.fixture?.home_score??0)+Number(r.fixture?.away_score??0)===maxGoals);
    return {gw,rows,wins:wins.length,scoreNil,zeroZero,goals,leader:standings[0]??null,biggestMovers,best,goalGame,maxGoals};
  },[props]);
  if(!target||!recap)return null;
  async function share(){if(sharing)return;setSharing(true);try{const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Could not create recap image.");const grad=ctx.createLinearGradient(0,0,1080,1080);grad.addColorStop(0,"#0b0a0e");grad.addColorStop(.65,"#1b1118");grad.addColorStop(1,"#5f1931");ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1080);ctx.fillStyle="#f1e2d4";ctx.font="700 58px Georgia";ctx.fillText("BOUNCE",60,82);ctx.fillStyle="#d2ad68";ctx.font="900 27px Arial";ctx.fillText(`BTTS LEAGUE · GW${recap.gw.number} RECAP`,62,126);ctx.fillStyle="#a9978b";ctx.font="700 17px Arial";ctx.fillText(`SEASON ${props.seasonLabel}`,62,158);ctx.strokeStyle="#6d3344";ctx.beginPath();ctx.moveTo(60,190);ctx.lineTo(1020,190);ctx.stroke();const cards=[["BTTS WINS",String(recap.wins)],["SCORE-NIL",String(recap.scoreNil)],["0-0",String(recap.zeroZero)],["GOALS",String(recap.goals)]];cards.forEach(([label,value],i)=>{const x=60+i*245;ctx.fillStyle="rgba(255,255,255,.035)";ctx.fillRect(x,230,220,115);ctx.fillStyle="#9e8e83";ctx.font="800 15px Arial";ctx.fillText(label,x+18,265);ctx.fillStyle="#f0cfaa";ctx.font="900 42px Arial";ctx.fillText(value,x+18,318)});const lines=[[`LEAGUE LEADER`,recap.leader?`${recap.leader.name} · ${recap.leader.points} pts`:"—"],[`BIGGEST MOVER`,recap.biggestMovers.length?`${recap.biggestMovers.map(r=>r.name).join(", ")} · ↑${recap.biggestMovers[0].move}`:"No upward movement"],[`BEST ODDS WIN`,recap.best?`${recap.best.r.name} · ${oddsLabel(recap.best.r.fixture?.odds_deadline_fractional??recap.best.r.fixture?.odds_fractional)}`:"—"],[`GOAL FEST`,recap.goalGame?.fixture?`${recap.goalGame.fixture.home_team} v ${recap.goalGame.fixture.away_team} · ${recap.maxGoals} goals`:"—"]];lines.forEach(([label,value],i)=>{const y=410+i*105;ctx.fillStyle="#c7a766";ctx.font="900 15px Arial";ctx.fillText(label,70,y);ctx.fillStyle="#f0e7df";ctx.font="800 27px Arial";ctx.fillText(value.slice(0,52),70,y+38)});ctx.fillStyle="#8f8178";ctx.font="600 16px Arial";ctx.fillText("Deadline odds are used for recap and historical odds records.",60,965);ctx.fillStyle="#d2ad68";ctx.font="900 16px Arial";ctx.fillText("MADE BY THE ARTIST, FOR THE BOUNCE",60,1010);const file=await new Promise<File>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],`bounce-gw${recap.gw.number}-recap.jpg`,{type:"image/jpeg"})):reject(new Error("Image creation failed.")),"image/jpeg",.94));const nav=navigator as Navigator&{canShare?:(d:ShareData)=>boolean};if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]})))await navigator.share({title:`Bounce BTTS GW${recap.gw.number} recap`,text:`Bounce BTTS League · GW${recap.gw.number} recap`,files:[file]});else{const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}}finally{setSharing(false)}}
  return createPortal(<section className={styles.panel}><div className={styles.hero}><div><span className={styles.eyebrow}>THE STORY OF THE WEEK</span><h3>GW {recap.gw.number} Recap</h3><p>Settled results, table movement and the standout selections.</p></div><button className={styles.share} type="button" onClick={share} disabled={sharing}>{sharing?"Creating…":"Share recap"}</button></div><div className={styles.stats}><div className={styles.stat}><span>BTTS wins</span><strong>{recap.wins}</strong></div><div className={styles.stat}><span>Score-nil</span><strong>{recap.scoreNil}</strong></div><div className={styles.stat}><span>0-0</span><strong>{recap.zeroZero}</strong></div><div className={styles.stat}><span>Goals</span><strong>{recap.goals}</strong></div></div><div className={styles.stories}><div className={styles.story}><span>League leader</span><strong>{recap.leader?`${recap.leader.name} · ${recap.leader.points} pts`:"—"}</strong></div><div className={styles.story}><span>Biggest mover</span><strong>{recap.biggestMovers.length?`${recap.biggestMovers.map(r=>r.name).join(", ")} ↑${recap.biggestMovers[0].move}`:"No upward movement"}</strong></div><div className={styles.story}><span>Best odds win</span><strong>{recap.best?`${recap.best.r.name} · ${oddsLabel(recap.best.r.fixture?.odds_deadline_fractional??recap.best.r.fixture?.odds_fractional)}`:"—"}</strong><small>Deadline price</small></div><div className={styles.story}><span>Goal fest</span><strong>{recap.goalGame?.fixture?`${recap.goalGame.fixture.home_team} v ${recap.goalGame.fixture.away_team}`:"—"}</strong><small>{recap.maxGoals?`${recap.maxGoals} goals`:"No settled fixture"}</small></div></div></section>,target);
}
