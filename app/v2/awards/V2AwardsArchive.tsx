"use client";
import { useState } from "react";
import type { AwardsSeasonSnapshot } from "@/lib/awards/contracts";
import { canPublish, validateSnapshot } from "@/lib/awards/ceremony-state";
import V2AwardsStage from "./V2AwardsStage";
import styles from "./V2AwardsArchive.module.css";
type Props={snapshot:AwardsSeasonSnapshot;publicViewer?:boolean};
/** Future signed-in/public archive. Render only from a published, immutable snapshot. */
export default function V2AwardsArchive({snapshot,publicViewer=false}:Props){
  const [show,setShow]=useState(false);
  if(!canPublish(snapshot)||validateSnapshot(snapshot).length || (publicViewer && snapshot.visibility!=="public"))return null;
  return <section className={styles.archive} aria-label={`Awards for ${snapshot.seasonLabel}`}>
    <header className={styles.champion}><span>ROLL OF HONOUR · {snapshot.seasonLabel}</span><h2>{snapshot.champion.name}</h2><p>League Champion · {snapshot.champion.points} points</p><button type="button" onClick={()=>setShow(true)}>Replay the Awards Show</button></header>
    {show?<div className={styles.stage}><V2AwardsStage snapshot={snapshot} onClose={()=>setShow(false)}/></div>:null}
    <div className={styles.ledger}>{[...snapshot.awards].sort((a,b)=>a.sortOrder-b.sortOrder).map(award=><article className={styles.row} key={award.awardKey}><div><small>{award.title}</small><strong>{award.winnerName}</strong></div><p>{Object.entries(award.supportingValues).map(([key,value])=>`${key}: ${value ?? "—"}`).join(" · ")}</p></article>)}</div>
  </section>;
}
