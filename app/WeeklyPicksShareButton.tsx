"use client";

import { useState } from "react";
import { refreshFixtureShareOdds } from "./refreshFixtureShareOdds";
import { createFixtureShareImage, type FixtureSharePick } from "./FixtureShareImage";
import { sortFixtureSharePicks } from "./shareFixtureSort";

type Props={gameweekNumber:number;seasonLabel:string;picks:FixtureSharePick[];disabled?:boolean;gameweekId?:string;preGameweek?:boolean};

export default function WeeklyPicksShareButton({gameweekNumber,seasonLabel,picks,disabled=false,gameweekId,preGameweek=false}:Props){
  const [busy,setBusy]=useState(false);
  const [phase,setPhase]=useState("");
  const [error,setError]=useState("");
  async function share(){
    if(disabled||busy)return;
    setBusy(true);
    try{
      setError("");
      setPhase(preGameweek?"Checking latest odds…":"Preparing share…");
      const freshPicks=preGameweek&&gameweekId?await refreshFixtureShareOdds(gameweekId,picks):picks;
      setPhase("Preparing share…");
      const orderedPicks=sortFixtureSharePicks(freshPicks);
      const file=await createFixtureShareImage(gameweekNumber,seasonLabel,orderedPicks);
      const data:ShareData={title:`Bounce BTTS GW${gameweekNumber} fixtures`,text:`Bounce BTTS League — GW${gameweekNumber} selected fixtures`,files:[file]};
      const nav=navigator as Navigator&{canShare?:(data:ShareData)=>boolean};
      if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]})))await navigator.share(data);
      else{const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
    }catch(e){setError(e instanceof Error?e.message:"Could not prepare share.");}finally{setBusy(false);setPhase("")}
  }
  return <div className="fixtureShareRefresh"><button className="dashboardGoldAction" type="button" onClick={share} disabled={disabled||busy}>{busy?phase:"Share fixtures"}</button>{busy&&<small role="status" aria-live="polite" style={{display:"block",opacity:.8,marginTop:4}}>{phase}</small>}{error&&<small role="alert" style={{display:"block",marginTop:4}}>{error} Try again to share.</small>}</div>
}
