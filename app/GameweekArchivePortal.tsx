"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./GameweekStory.module.css";

type Profile={id:string;display_name:string;active:boolean;role:string};
type Gameweek={id:string;number:number;status:string;locks_at?:string|null};
type Prediction={gameweek_id:string;member_id:string;fixture_id:string;points_awarded:number|null};
type Fixture={id:string;home_team:string;away_team:string;home_score:number|null;away_score:number|null;status?:string|null;odds_deadline_fractional?:string|null;odds_fractional?:string|null};
type Props={profiles:Profile[];gameweeks:Gameweek[];predictions:Prediction[];fixtures:Fixture[];seasonLabel:string};
function ratio(value:string|null|undefined){if(!value)return null;const m=value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);if(!m)return null;const n=Number(m[1]),d=Number(m[2]);return Number.isFinite(n)&&Number.isFinite(d)&&d>0?n/d:null}
function odds(value:string|null|undefined){const r=ratio(value);return r==null?"—":`${r.toFixed(2)}/1`}
function score(f:Fixture|undefined){return f?.home_score==null||f?.away_score==null?"—":`${f.home_score}–${f.away_score}`}
function result(points:number|null){if(points===3)return "+3 BTTS";if(points===1)return "+1 S-N";if(points===-1)return "-1 0-0";return "Pending"}

export default function GameweekArchivePortal(props:Props){
 const [target,setTarget]=useState<Element|null>(null);
 const eligibleWeeks=useMemo(()=>[...props.gameweeks].filter(g=>props.predictions.some(p=>p.gameweek_id===g.id)).sort((a,b)=>b.number-a.number),[props.gameweeks,props.predictions]);
 const [selectedId,setSelectedId]=useState<string>(eligibleWeeks[0]?.id??"");
 useEffect(()=>{if(!selectedId&&eligibleWeeks[0])setSelectedId(eligibleWeeks[0].id)},[eligibleWeeks,selectedId]);
 useEffect(()=>{let host:HTMLDivElement|null=null;const place=()=>{const hero=document.querySelector('[class*="historyHero"]');const heading=Array.from(document.querySelectorAll("h2")).find(el=>(el.textContent??"").trim()==="League History");if(!hero||!heading){setTarget(null);return}if(!host){host=document.createElement("div");host.className="currentSeasonGameweekArchiveHost"}if(hero.nextElementSibling!==host)hero.insertAdjacentElement("afterend",host);setTarget(host)};place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();host?.remove()}},[]);
 const selected=eligibleWeeks.find(g=>g.id===selectedId)??eligibleWeeks[0]??null;
 const rows=useMemo(()=>{if(!selected)return[];const fixtureById=new Map(props.fixtures.map(f=>[f.id,f]));const profileById=new Map(props.profiles.map(p=>[p.id,p]));return props.predictions.filter(p=>p.gameweek_id===selected.id).map(p=>({p,f:fixtureById.get(p.fixture_id),name:profileById.get(p.member_id)?.display_name??"Player"})).sort((a,b)=>a.name.localeCompare(b.name))},[selected,props.predictions,props.fixtures,props.profiles]);
 if(!target)return null;
 const settled=rows.length>0&&rows.every(r=>r.p.points_awarded!=null);const wins=rows.filter(r=>r.p.points_awarded===3).length;const sn=rows.filter(r=>r.p.points_awarded===1).length;const zeros=rows.filter(r=>r.p.points_awarded===-1).length;
 return createPortal(<section className={styles.archive}><div className={styles.archiveHead}><span>CURRENT APP ERA · {props.seasonLabel}</span><h3>Gameweek Archive</h3><p>Detailed picks, deadline odds and final outcomes are available from the current season onward.</p></div>{eligibleWeeks.length?<><div className={styles.weeks}>{eligibleWeeks.map(g=><button key={g.id} type="button" className={`${styles.weekButton} ${selected?.id===g.id?styles.weekButtonActive:""}`} onClick={()=>setSelectedId(g.id)}>GW {g.number}</button>)}</div>{selected&&<div className={styles.detail}><div className={styles.recapLine}><span className={styles.chip}>{settled?"Settled":"In progress"}</span><span className={styles.chip}>{wins} BTTS</span><span className={styles.chip}>{sn} score-nil</span><span className={styles.chip}>{zeros} 0-0</span><span className={styles.chip}>{rows.length} picks</span></div><div className={styles.rows}>{rows.map(({p,f,name})=><div className={styles.row} key={`${p.member_id}-${p.fixture_id}`}><div className={styles.rowPlayer}>{name}</div><div className={styles.rowFixture}><strong>{f?`${f.home_team} v ${f.away_team}`:"Fixture unavailable"}</strong><small>{score(f)} · deadline odds {odds(f?.odds_deadline_fractional??f?.odds_fractional)}</small></div><div className={styles.rowResult}><strong>{result(p.points_awarded)}</strong><small>{p.points_awarded==null?"Awaiting result":"Final"}</small></div></div>)}</div></div>}</>:<div className={styles.empty}>No gameweek detail has been recorded for this season yet.</div>}<div className={styles.note}>Older seasons retain the existing final-table archive because fixture-level prediction data was not captured in the same detail.</div></section>,target)
}
