"use client";

import { useMemo, useState } from "react";
import GameweekRecapCard from "../GameweekRecapCard";
import PositionRacePortal from "../PositionRacePortal";
import SweepTracker from "../SweepTracker";
import ReminderShareButton from "../ReminderShareButton";
import DataShareButton from "../DataShareButton";
import { rollOfHonour } from "@/lib/history-data";
import styles from "./V2DashboardParity.module.css";

type Profile={id:string;display_name:string;active:boolean;role:string};
type Gameweek={id:string;number:number;status:string;locks_at:string};
type Prediction={id:string;gameweek_id:string;member_id:string;fixture_id:string;points_awarded:number|null};
type Adjustment={gameweek_id:string;member_id:string;points:number;reason:string};
type Fixture={id:string;gameweek_id:string|null;competition:string;country?:string|null;home_team:string;away_team:string;kickoff_at:string;home_score:number|null;away_score:number|null;status?:string|null;odds_fractional?:string|null;odds_deadline_fractional?:string|null};
type Props={seasonLabel:string;gameweek:Gameweek|null;gameweeks:Gameweek[];profiles:Profile[];fixtures:Fixture[];allPredictions:Prediction[];currentPredictions:Prediction[];adjustments:Adjustment[];isAdmin:boolean;isOpen:boolean};

function pointsFor(playerId:string,gwId:string,predictions:Prediction[],adjustments:Adjustment[]){const pred=predictions.find(p=>p.member_id===playerId&&p.gameweek_id===gwId&&p.points_awarded!=null);if(pred?.points_awarded!=null)return pred.points_awarded;const adj=adjustments.find(a=>a.member_id===playerId&&a.gameweek_id===gwId);return adj?.points??null}
function combinedOdds(values:Array<string|null|undefined>){if(!values.length)return null;let decimal=1;for(const value of values){const m=value?.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);if(!m)return null;const n=Number(m[1]),d=Number(m[2]);if(!Number.isFinite(n)||!Number.isFinite(d)||d<=0)return null;decimal*=1+n/d}return `${(decimal-1).toFixed(2)}/1`}

export default function V2DashboardParity(props:Props){
 const[formRange,setFormRange]=useState<6|12|18>(6);const[honoursOpen,setHonoursOpen]=useState(false);
 const activeProfiles=useMemo(()=>props.profiles.filter(p=>p.active&&p.role!=="guest"),[props.profiles]);
 const selectedNumber=props.gameweek?.number??Math.max(0,...props.gameweeks.map(g=>g.number));
 const formWeeks=useMemo(()=>[...props.gameweeks].filter(g=>g.number<=selectedNumber).sort((a,b)=>b.number-a.number).slice(0,formRange).sort((a,b)=>a.number-b.number),[props.gameweeks,selectedNumber,formRange]);
 const formRows=useMemo(()=>activeProfiles.map(profile=>{const values=formWeeks.map(g=>pointsFor(profile.id,g.id,props.allPredictions,props.adjustments));return{name:profile.display_name,values,total:values.reduce<number>((sum,value)=>sum+(value??0),0)}}).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name)),[activeProfiles,formWeeks,props.allPredictions,props.adjustments]);
 const fixtureById=new Map(props.fixtures.map(f=>[f.id,f]));
 const missing=activeProfiles.filter(profile=>!props.currentPredictions.some(p=>p.member_id===profile.id));
 const submitted=props.currentPredictions.map(pred=>{const profile=activeProfiles.find(p=>p.id===pred.member_id),fixture=fixtureById.get(pred.fixture_id);return profile&&fixture?{name:profile.display_name,fixture:`${fixture.home_team} v ${fixture.away_team}`}:null}).filter((row):row is {name:string;fixture:string}=>Boolean(row));
 const currentOdds=props.currentPredictions.map(pred=>fixtureById.get(pred.fixture_id)?.odds_deadline_fractional??fixtureById.get(pred.fixture_id)?.odds_fractional);
 const shareRows=formRows.map(row=>[row.name,...row.values.map(value=>value==null?"—":value>0?`+${value}`:String(value)),row.total>0?`+${row.total}`:row.total]);
 return <section className={styles.shell} aria-label="V1 feature parity tools">
   <div className={styles.section}><GameweekRecapCard profiles={activeProfiles} gameweeks={props.gameweeks} predictions={props.allPredictions} adjustments={props.adjustments} fixtures={props.fixtures} seasonLabel={props.seasonLabel}/></div>
   <section className={styles.section} id="v2-current-form">
     <div className={styles.head}><div><span>RECENT FORM</span><h3>{formRange}-Week Form</h3></div><div className={styles.headActions}><select aria-label="Form range" value={formRange} onChange={event=>setFormRange(Number(event.target.value) as 6|12|18)}><option value={6}>6 weeks</option><option value={12}>12 weeks</option><option value={18}>18 weeks</option></select><DataShareButton compact title={`${formRange}-Week Form`} subtitle={`Season ${props.seasonLabel} · through GW ${selectedNumber}`} columns={["Player",...formWeeks.map(g=>`GW${g.number}`),"Total"]} rows={shareRows} fileName={`bounce-form-${formRange}w.jpg`} label={`Share ${formRange}-week form`}/></div></div>
     <div className={styles.formLegend} aria-label="Form result legend"><span className={styles.good}>+3 <small>BTTS</small></span><span className={styles.ok}>+1 <small>Score-nil</small></span><span className={styles.bad}>−1 <small>0-0</small></span><span className={styles.muted}>— <small>No score</small></span></div>
     <div className={styles.formRows}>{formRows.map(row=><div className={styles.formPlayerRow} key={row.name}><strong>{row.name}</strong><div className={styles.formPills}>{row.values.map((value,index)=><span key={`${row.name}-${formWeeks[index]?.id}`} className={`${styles.formPill} ${value===3?styles.good:value===1?styles.ok:value!=null&&value<0?styles.bad:styles.muted}`}><small>GW{formWeeks[index]?.number}</small><b>{value==null?"—":value>0?`+${value}`:value}</b></span>)}</div><b className={styles.formTotal}>{row.total>0?`+${row.total}`:row.total}</b></div>)}</div>
   </section>
   {props.gameweek?<div className={styles.oddsStrip}><span>Combined BTTS odds for submitted selections</span><strong>{combinedOdds(currentOdds)??"—"}</strong></div>:null}
   {props.isAdmin&&props.gameweek?<section className={styles.section}><div className={styles.head}><div><span>ADMIN SECONDARY ACTIONS</span><h3>Gameweek Reminder</h3></div><div className={styles.adminTools}><ReminderShareButton gameweekNumber={props.gameweek.number} seasonLabel={props.seasonLabel} deadline={props.gameweek.locks_at} missingNames={missing.map(p=>p.display_name)} submittedPicks={submitted} disabled={!props.isOpen||!missing.length}/><span>{missing.length?`${missing.length} still to pick`:"All selections submitted"}</span></div></div></section>:null}
   <section className={styles.honours}><div className={styles.honoursTitle}><span>ROLL OF HONOUR</span><h3>Bounce Cup Champions</h3></div><button type="button" className={styles.honoursButton} aria-expanded={honoursOpen} onClick={()=>setHonoursOpen(value=>!value)}><img src="/assets/bounce-cup.png" alt=""/>{honoursOpen?"Hide honours":"View honours"}</button>{honoursOpen?<div className={styles.honoursList}>{[...rollOfHonour].reverse().map(row=><div className={styles.honourRow} key={row.season}><span>{row.season}</span><strong>{row.winner}</strong><b>{row.points} PTS</b></div>)}</div>:null}</section>
   <div className={`${styles.section} ${styles.trackerGrid}`}><PositionRacePortal inline profiles={activeProfiles} gameweeks={props.gameweeks} predictions={props.allPredictions} adjustments={props.adjustments} seasonLabel={props.seasonLabel}/><SweepTracker inline seasonLabel={props.seasonLabel} gameweeks={props.gameweeks} predictions={props.allPredictions} fixtures={props.fixtures}/></div>
 </section>
}
