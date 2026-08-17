"use client";

import { useState } from "react";
import { createCombinedShareImage, type FixtureSharePick, type FixtureShareStanding } from "./FixtureShareImage";

type Props={gameweekNumber:number;seasonLabel:string;picks:FixtureSharePick[];standings:FixtureShareStanding[];disabled?:boolean};

export default function CombinedShareButton({gameweekNumber,seasonLabel,picks,standings,disabled=false}:Props){
  const [busy,setBusy]=useState(false);
  async function share(){
    if(disabled||busy)return;
    setBusy(true);
    try{
      const file=await createCombinedShareImage(gameweekNumber,seasonLabel,picks,standings);
      const data:ShareData={title:`Bounce BTTS GW${gameweekNumber} fixtures + table`,text:`Bounce BTTS League — GW${gameweekNumber} fixtures + table`,files:[file]};
      const nav=navigator as Navigator&{canShare?:(data:ShareData)=>boolean};
      if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]})))await navigator.share(data);
      else{const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
    }finally{setBusy(false)}
  }
  return <button className="dashboardGoldAction" type="button" onClick={share} disabled={disabled||busy}>{busy?"Creating…":"Share combined table / fixtures"}</button>
}
