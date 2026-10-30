"use client";

import { useEffect, useState } from "react";
import { refreshFixtureShareOdds } from "./refreshFixtureShareOdds";
import { createFixtureShareImage, type FixtureSharePick } from "./FixtureShareImage";
import { sortFixtureSharePicks } from "./shareFixtureSort";

type Props={gameweekNumber:number;seasonLabel:string;picks:FixtureSharePick[];disabled?:boolean;gameweekId?:string;preGameweek?:boolean;label?:string};

export default function WeeklyPicksShareButton({gameweekNumber,seasonLabel,picks,disabled=false,gameweekId,preGameweek=false,label="Share fixtures"}:Props){
  const [phase,setPhase]=useState("Checking latest odds…");
  const [file,setFile]=useState<File|null>(null);
  const [error,setError]=useState("");
  const picksSignature=JSON.stringify(picks);
  
  // Prepare odds and the export before the share gesture. iOS requires navigator.share
  // to run synchronously from the actual user tap, not after awaiting a network call.
  useEffect(()=>{
    let cancelled=false;
    setFile(null);
    if(disabled)return;
    (async()=>{
      try{
        setError("");
        setPhase(preGameweek?"Checking latest odds…":"Preparing share…");
        const fresh=preGameweek&&gameweekId?await refreshFixtureShareOdds(gameweekId,picks):picks;
        if(cancelled)return;
        setPhase("Preparing share…");
        const sorted=sortFixtureSharePicks(fresh);
        const file=await createFixtureShareImage(gameweekNumber,seasonLabel,sorted);
        if(!cancelled){setFile(file);setPhase("");}
      }catch(e){
        if(!cancelled){setPhase("");setError(e instanceof Error?e.message:"Could not prepare fixture sharing.");}
      }
    })();
    return ()=>{cancelled=true;};
  },[gameweekId,preGameweek,gameweekNumber,seasonLabel,disabled,picksSignature]);
  function share(){
    if(!file||disabled)return;
    const data:ShareData={title:`Bounce BTTS GW${gameweekNumber} fixtures`,text:`Bounce BTTS League — GW${gameweekNumber} selected fixtures`,files:[file]};
    const nav=navigator as Navigator&{canShare?:(data:ShareData)=>boolean};
    if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]}))){
      // Call immediately: no awaited refresh or image generation during the share click.
      navigator.share(data).catch(e=>{if(e?.name!=="AbortError")setError("Sharing unavailable in this browser.");});
    }else{
      const url=URL.createObjectURL(file);
      const link=document.createElement("a");link.href=url;link.download=file.name;link.click();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
    }
  }
  return <div className="fixtureShareRefresh" style={{position:"relative",minWidth:0}}>
    <button className="dashboardGoldAction" type="button" onClick={share} disabled={disabled||!file}>{!file&&!error?"Preparing…":label}</button>
    {(!file||error)&&<div role="status" aria-live="polite" style={{position:"absolute",top:"100%",left:0,zIndex:5,width:"min(230px, 72vw)",marginTop:5,padding:"5px 8px",borderRadius:7,background:"var(--surface, #281a24)",color:"inherit",boxShadow:"0 3px 12px #0005",fontSize:12,lineHeight:1.35,overflowWrap:"break-word"}}>{error||phase}</div>}
  </div>;
}
