"use client";

import { useEffect, useState } from "react";
import { refreshFixtureShareOdds } from "./refreshFixtureShareOdds";
import { createCombinedShareImage, type FixtureSharePick, type FixtureShareStanding } from "./FixtureShareImage";
import { sortFixtureSharePicks } from "./shareFixtureSort";
import { drawShareAvatar, loadSharePortraits } from "@/lib/share-portraits";
import { SHARE_BRAND } from "@/lib/share-brand";

type Props={gameweekNumber:number;seasonLabel:string;picks:FixtureSharePick[];standings:FixtureShareStanding[];disabled?:boolean;gameweekId?:string;preGameweek?:boolean;label?:string};
const finished=new Set(["FT","AET","PEN"]);

async function withRecap(base:File,gameweekNumber:number,picks:FixtureSharePick[],standings:FixtureShareStanding[]){
  const settled=picks.length>0&&picks.every(p=>finished.has(p.status??"")&&p.homeScore!=null&&p.awayScore!=null);
  if(!settled)return base;
  const portraits=await loadSharePortraits();
  const wins=picks.filter(p=>(p.homeScore??0)>0&&(p.awayScore??0)>0).length;
  const zeroZero=picks.filter(p=>p.homeScore===0&&p.awayScore===0).length;
  const scoreNil=picks.length-wins-zeroZero;
  const goals=picks.reduce((sum,p)=>sum+Number(p.homeScore??0)+Number(p.awayScore??0),0);
  const leader=standings[0];
  const src=URL.createObjectURL(base);
  try{
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Could not extend combined share image."));img.src=src});
    const extra=255;const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height+extra;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Could not create recap share image.");ctx.drawImage(image,0,0);const y=image.height;
    ctx.fillStyle=SHARE_BRAND.paper;ctx.fillRect(0,y,canvas.width,extra);ctx.strokeStyle="rgba(95,31,54,.18)";ctx.beginPath();ctx.moveTo(70,y+18);ctx.lineTo(1130,y+18);ctx.stroke();
    ctx.fillStyle="#8e5b35";ctx.font="900 17px Arial,sans-serif";ctx.fillText(`GW${gameweekNumber} RECAP`,70,y+52);
    const cards=[["BTTS",wins],["SCORE-NIL",scoreNil],["0-0",zeroZero],["GOALS",goals]] as const;cards.forEach(([label,value],i)=>{const x=70+i*190;ctx.fillStyle=SHARE_BRAND.muted;ctx.font="900 13px Arial,sans-serif";ctx.fillText(label,x,y+94);ctx.fillStyle=SHARE_BRAND.maroonDeep;ctx.font="700 30px Georgia,serif";ctx.fillText(String(value),x,y+132)});
    ctx.fillStyle="#8e5b35";ctx.font="900 13px Arial,sans-serif";ctx.fillText("LEAGUE LEADER",850,y+94);if(leader){drawShareAvatar(ctx,portraits,{name:leader.name,x:872,y:y+128,size:42,border:SHARE_BRAND.goldSoft,background:SHARE_BRAND.maroon});ctx.fillStyle=SHARE_BRAND.maroon;ctx.font="700 23px Georgia,serif";ctx.fillText(`${leader.name} · ${leader.points} pts`,903,y+136)}else{ctx.fillStyle=SHARE_BRAND.maroon;ctx.font="700 23px Georgia,serif";ctx.fillText("—",850,y+132)}
    ctx.fillStyle=SHARE_BRAND.muted;ctx.font="600 15px Arial,sans-serif";ctx.fillText("Gameweek recap added automatically once every selected fixture is settled.",70,y+198);
    ctx.strokeStyle="rgba(95,31,54,.14)";ctx.beginPath();ctx.moveTo(70,y+222);ctx.lineTo(1130,y+222);ctx.stroke();ctx.fillStyle=SHARE_BRAND.maroon;ctx.font="900 13px Arial,sans-serif";ctx.fillText("BOUNCE BTTS LEAGUE · EDINBURGH",70,y+244);
    return await new Promise<File>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],`bounce-btts-gw${gameweekNumber}-fixtures-table-recap.jpg`,{type:"image/jpeg"})):reject(new Error("Image creation failed.")),"image/jpeg",.94));
  }finally{URL.revokeObjectURL(src)}
}

export default function CombinedShareButton({gameweekNumber,seasonLabel,picks,standings,disabled=false,gameweekId,preGameweek=false,label="Share combined table / fixtures"}:Props){
  const [phase,setPhase]=useState("Checking latest odds…");
  const [file,setFile]=useState<File|null>(null);
  const [error,setError]=useState("");
  const picksSignature=JSON.stringify(picks);
  const standingSignature=JSON.stringify(standings);
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
        const base=await createCombinedShareImage(gameweekNumber,seasonLabel,sorted,standings);
        const file=await withRecap(base,gameweekNumber,sorted,standings);
        if(!cancelled){setFile(file);setPhase("");}
      }catch(e){
        if(!cancelled){setPhase("");setError(e instanceof Error?e.message:"Could not prepare fixture sharing.");}
      }
    })();
    return ()=>{cancelled=true;};
  },[gameweekId,preGameweek,gameweekNumber,seasonLabel,disabled,picksSignature,standingSignature]);
  function share(){
    if(!file||disabled)return;
    const data:ShareData={title:`Bounce BTTS GW${gameweekNumber} fixtures + table`,text:`Bounce BTTS League — GW${gameweekNumber} fixtures + table`,files:[file]};
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
