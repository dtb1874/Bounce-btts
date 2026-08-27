"use client";

import { useState } from "react";
import { createCombinedShareImage, type FixtureSharePick, type FixtureShareStanding } from "./FixtureShareImage";
import { sortFixtureSharePicks } from "./shareFixtureSort";

type Props={gameweekNumber:number;seasonLabel:string;picks:FixtureSharePick[];standings:FixtureShareStanding[];disabled?:boolean};
const finished=new Set(["FT","AET","PEN"]);

async function withRecap(base:File,gameweekNumber:number,picks:FixtureSharePick[],standings:FixtureShareStanding[]){
  const settled=picks.length>0&&picks.every(p=>finished.has(p.status??"")&&p.homeScore!=null&&p.awayScore!=null);
  if(!settled)return base;
  const wins=picks.filter(p=>(p.homeScore??0)>0&&(p.awayScore??0)>0).length;
  const zeroZero=picks.filter(p=>p.homeScore===0&&p.awayScore===0).length;
  const scoreNil=picks.length-wins-zeroZero;
  const goals=picks.reduce((sum,p)=>sum+Number(p.homeScore??0)+Number(p.awayScore??0),0);
  const leader=standings[0];
  const src=URL.createObjectURL(base);
  try{
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Could not extend combined share image."));img.src=src});
    const extra=255;const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height+extra;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Could not create recap share image.");ctx.drawImage(image,0,0);const y=image.height;const grad=ctx.createLinearGradient(0,y,canvas.width,y+extra);grad.addColorStop(0,"#171116");grad.addColorStop(1,"#471525");ctx.fillStyle=grad;ctx.fillRect(0,y,canvas.width,extra);ctx.strokeStyle="#6b3442";ctx.beginPath();ctx.moveTo(70,y+18);ctx.lineTo(1130,y+18);ctx.stroke();ctx.fillStyle="#f0cfaa";ctx.font="800 24px Arial,sans-serif";ctx.fillText(`GW${gameweekNumber} RECAP`,70,y+56);const cards=[["BTTS",wins],["SCORE-NIL",scoreNil],["0-0",zeroZero],["GOALS",goals]] as const;cards.forEach(([label,value],i)=>{const x=70+i*190;ctx.fillStyle="#a99a90";ctx.font="800 13px Arial,sans-serif";ctx.fillText(label,x,y+96);ctx.fillStyle="#f3dfcb";ctx.font="900 30px Arial,sans-serif";ctx.fillText(String(value),x,y+132)});ctx.fillStyle="#a99a90";ctx.font="800 13px Arial,sans-serif";ctx.fillText("LEAGUE LEADER",850,y+96);ctx.fillStyle="#f0cfaa";ctx.font="900 24px Arial,sans-serif";ctx.fillText(leader?`${leader.name} · ${leader.points} pts`:"—",850,y+132);ctx.fillStyle="#8f8178";ctx.font="600 15px Arial,sans-serif";ctx.fillText("Gameweek recap added automatically once every selected fixture is settled.",70,y+198);return await new Promise<File>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],`bounce-btts-gw${gameweekNumber}-fixtures-table-recap.jpg`,{type:"image/jpeg"})):reject(new Error("Image creation failed.")),"image/jpeg",.94));
  }finally{URL.revokeObjectURL(src)}
}

export default function CombinedShareButton({gameweekNumber,seasonLabel,picks,standings,disabled=false}:Props){
  const [busy,setBusy]=useState(false);
  async function share(){
    if(disabled||busy)return;
    setBusy(true);
    try{
      const orderedPicks=sortFixtureSharePicks(picks);
      const base=await createCombinedShareImage(gameweekNumber,seasonLabel,orderedPicks,standings);
      const file=await withRecap(base,gameweekNumber,orderedPicks,standings);
      const data:ShareData={title:`Bounce BTTS GW${gameweekNumber} fixtures + table`,text:`Bounce BTTS League — GW${gameweekNumber} fixtures + table`,files:[file]};
      const nav=navigator as Navigator&{canShare?:(data:ShareData)=>boolean};
      if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]})))await navigator.share(data);
      else{const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
    }finally{setBusy(false)}
  }
  return <button className="dashboardGoldAction" type="button" onClick={share} disabled={disabled||busy}>{busy?"Creating…":"Share combined table / fixtures"}</button>
}
