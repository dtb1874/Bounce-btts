"use client";
import { useEffect, useMemo, useState } from "react";
import type { AwardsSeasonSnapshot } from "@/lib/awards/contracts";
import { buildCeremonySteps, visibleAwards, canPublish, validateSnapshot } from "@/lib/awards/ceremony-state";
import styles from "./V2AwardsStage.module.css";
const STEP_MS = 6500;
type Props = { snapshot: AwardsSeasonSnapshot; onClose?: () => void; onFinished?: () => void; autoPlay?: boolean };
/** In-app, skippable presentation. No season finalisation or database writes. */
export default function V2AwardsStage({ snapshot, onClose, onFinished, autoPlay = true }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const awards = useMemo(() => visibleAwards(snapshot), [snapshot]);
  const steps = useMemo(() => buildCeremonySteps(awards.length), [awards.length]);
  const invalid = validateSnapshot(snapshot).length > 0 || !canPublish(snapshot);
  const finalIndex = steps.length - 1;
  const step = steps[Math.min(index,finalIndex)];
  useEffect(() => {
    if (invalid || !playing || index >= finalIndex) return;
    const timer=window.setTimeout(()=>setIndex(i=>Math.min(i+1,finalIndex)), STEP_MS);
    return ()=>window.clearTimeout(timer);
  },[invalid,playing,index,finalIndex]);
  if (invalid) return null;
  const award=step.kind==="award"?awards[step.awardIndex]:null;
  return <section className={`${styles.shell} ${step.kind==="champion"?styles.champion:""}`} aria-label={`Bounce Awards ${snapshot.seasonLabel}`}>
    <div><span className={styles.eyebrow}>Bounce BTTS · {snapshot.seasonLabel}</span>
      {step.kind==="intro"?<><h2 className={styles.headline}>The Season Awards</h2><p className={styles.detail}>The picks, the drama and the standout performers. Here are the winners.</p></>
      :award?<><h2 className={styles.headline}>{award.title}</h2><p className={styles.metric}>{award.winnerName}</p><p className={styles.detail}>{Object.entries(award.supportingValues).map(([k,v])=>`${k}: ${v ?? "—"}`).join(" · ")}</p></>
      :<>{snapshot.champion.portraitPath?<img className={styles.portrait} src={snapshot.champion.portraitPath} alt={snapshot.champion.name}/>:<div className={styles.fallback} aria-hidden="true">{snapshot.champion.name.charAt(0)}</div>}<h2 className={styles.headline}>{snapshot.champion.name}</h2><p className={styles.metric}>Bounce Champion · {snapshot.champion.points} points</p><p className={styles.detail}>The season belongs to our champion.</p></>}
    </div>
    <div className={styles.controls}>
      <button className={styles.primary} type="button" onClick={()=>{if(index===finalIndex){setIndex(0);setPlaying(true)}else setPlaying(p=>!p)}}>{index===finalIndex?"Replay":playing?"Pause":"Play"}</button>
      <button type="button" onClick={()=>{setIndex(finalIndex);setPlaying(false)}}>Skip to champion</button>
      {onClose?<button type="button" onClick={()=>{onFinished?.();onClose()}}>Close show</button>:null}
      <span className={styles.progress} aria-live="polite">{index+1} / {steps.length}</span>
    </div>
  </section>;
}
