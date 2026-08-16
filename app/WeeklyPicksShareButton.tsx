"use client";

import { useState } from "react";
import { createFixtureShareImage, type FixtureSharePick } from "./FixtureShareImage";

type Props={gameweekNumber:number;seasonLabel:string;picks:FixtureSharePick[];disabled?:boolean};

export default function WeeklyPicksShareButton({gameweekNumber,seasonLabel,picks,disabled=false}:Props){
  const [busy,setBusy]=useState(false);
  async function share(){
    if(disabled||busy)return;
    setBusy(true);
    try{
      const file=await createFixtureShareImage(gameweekNumber,seasonLabel,picks);
      const data:ShareData={title:`Bounce BTTS GW${gameweekNumber} fixtures`,text:`Bounce BTTS League — GW${gameweekNumber} selected fixtures`,files:[file]};
      const nav=navigator as Navigator&{canShare?:(data:ShareData)=>boolean};
      if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]})))await navigator.share(data);
      else{const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
    }finally{setBusy(false)}
  }
  return <button className="dashboardGoldAction" type="button" onClick={share} disabled={disabled||busy}>{busy?"Creating…":"Share fixtures"}</button>
}
