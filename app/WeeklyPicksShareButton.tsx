"use client";

import { useState } from "react";
import { refreshFixtureShareOdds } from "./refreshFixtureShareOdds";
import { createFixtureShareImage, type FixtureSharePick } from "./FixtureShareImage";
import { sortFixtureSharePicks } from "./shareFixtureSort";

type Props={gameweekNumber:number;seasonLabel:string;picks:FixtureSharePick[];disabled?:boolean;gameweekId?:string;preGameweek?:boolean;label?:string};

export default function WeeklyPicksShareButton({gameweekNumber,seasonLabel,picks,disabled=false,gameweekId,preGameweek=false,label="Share fixtures"}:Props){
  const [busy,setBusy]=useState(false);
  const [phase,setPhase]=useState("");
  const [error,setError]=useState("");
  const [ready,setReady]=useState<File|null>(null);
  async function openShare(file:File){
    const data:ShareData={title:`Bounce BTTS GW${gameweekNumber} fixtures`,text:`Bounce BTTS League — GW${gameweekNumber} selected fixtures`,files:[file]};
    const nav=navigator as Navigator&{canShare?:(data:ShareData)=>boolean};
    if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]}))) {
      await navigator.share(data);
    } else {
      const url=URL.createObjectURL(file);
      const a=document.createElement("a");a.href=url;a.download=file.name;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
    }
  }
  async function share(){
    if(disabled||busy)return;
    if(ready){
      try{await openShare(ready);setReady(null);setError("");}
      catch(e){if((e as Error)?.name!=="AbortError")setError("Sharing blocked. Tap Share now again or use Safari.");}
      return;
    }
    setBusy(true);setError("");
    try{
      setPhase(preGameweek?"Checking latest odds…":"Preparing share…");
      const freshPicks=preGameweek&&gameweekId?await refreshFixtureShareOdds(gameweekId,picks):picks;
      setPhase("Preparing share…");
      const orderedPicks=sortFixtureSharePicks(freshPicks);
      const file=await createFixtureShareImage(gameweekNumber,seasonLabel,orderedPicks);
      setReady(file);
      // iOS may revoke the original tap's user activation during the odds API request.
      // Try the automatic share first; if blocked, keep the generated file for a fresh tap.
      try{await openShare(file);setReady(null);}
      catch(e){if((e as Error)?.name==="AbortError"){setReady(null);}else{setError("Ready to share. Tap Share now.");}}
    }catch(e){setReady(null);setError(e instanceof Error?"Odds or image unavailable. Try again.":"Could not prepare share.");}
    finally{setBusy(false);setPhase("");}
  }
  return <div className="fixtureShareRefresh" style={{position:"relative",minWidth:0}}>
    <button className="dashboardGoldAction" type="button" onClick={share} disabled={disabled||busy}>{busy?"Preparing…":ready?"Share now":label}</button>
    {(busy||error)&&<div role="status" aria-live="polite" style={{position:"absolute",top:"100%",left:0,zIndex:5,width:"min(230px, 72vw)",marginTop:5,padding:"5px 8px",borderRadius:7,background:"var(--surface, #281a24)",color:"inherit",boxShadow:"0 3px 12px #0005",fontSize:12,lineHeight:1.35,overflowWrap:"break-word"}}>{busy?phase:error}</div>}
  </div>;
}
