"use client";

import { useState } from "react";
import { combinedFractional } from "@/lib/fractional";

type WeeklyPick = {
  player: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoffAt: string;
  odds: string | null;
};

type Props = {
  gameweekNumber: number;
  seasonLabel: string;
  picks: WeeklyPick[];
  disabled?: boolean;
};

function roundedRect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

async function createPicksImage(gameweekNumber:number, seasonLabel:string, picks:WeeklyPick[]) {
  const width=1200, rowHeight=112, headerHeight=245, footerHeight=145;
  const height=headerHeight + Math.max(1,picks.length)*rowHeight + footerHeight;
  const canvas=document.createElement("canvas"); canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext("2d"); if(!ctx) throw new Error("Unable to create image.");
  const bg=ctx.createLinearGradient(0,0,width,height); bg.addColorStop(0,"#090a0e"); bg.addColorStop(.62,"#171116"); bg.addColorStop(1,"#421524");
  ctx.fillStyle=bg; ctx.fillRect(0,0,width,height);
  ctx.fillStyle="rgba(122,34,55,.26)"; ctx.beginPath(); ctx.arc(1070,110,240,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#eadbc9"; ctx.font="700 70px Georgia,serif"; ctx.fillText("BOUNCE",70,92);
  ctx.fillStyle="#c8af94"; ctx.font="600 27px Georgia,serif"; ctx.fillText("BTTS LEAGUE",74,136);
  ctx.fillStyle="#a9917f"; ctx.font="700 19px Arial,sans-serif"; ctx.fillText(`SEASON ${seasonLabel}  •  GAMEWEEK ${gameweekNumber}`,74,181);
  ctx.fillStyle="#f0cfaa"; ctx.font="800 28px Arial,sans-serif"; ctx.fillText("WEEKLY PICKS",905,135);
  ctx.strokeStyle="#6b3442"; ctx.lineWidth=2; ctx.beginPath();ctx.moveTo(70,212);ctx.lineTo(1130,212);ctx.stroke();

  picks.forEach((pick,index)=>{
    const y=headerHeight+index*rowHeight;
    ctx.fillStyle=index%2?"rgba(255,255,255,.025)":"rgba(112,31,50,.22)"; roundedRect(ctx,58,y+7,1084,rowHeight-14,12);ctx.fill();
    ctx.fillStyle="#eadfd4";ctx.font="800 25px Arial,sans-serif";ctx.fillText(pick.player.slice(0,24),82,y+42);
    ctx.fillStyle="#f4eee8";ctx.font="700 25px Arial,sans-serif";ctx.fillText(`${pick.homeTeam} v ${pick.awayTeam}`.slice(0,50),330,y+42);
    ctx.fillStyle="#a9a09a";ctx.font="500 17px Arial,sans-serif";ctx.fillText(pick.competition.slice(0,52),330,y+74);
    ctx.fillStyle="#ad9b8d";ctx.font="600 17px Arial,sans-serif";
    const kickoff=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(pick.kickoffAt));
    ctx.fillText(kickoff,82,y+74);
    ctx.fillStyle="#c5ad96";ctx.font="700 17px Arial,sans-serif";ctx.fillText("BTTS",1010,y+32);
    ctx.fillStyle="#ffe0b9";ctx.font="800 29px Arial,sans-serif";ctx.fillText(pick.odds??"—",1010,y+67);
  });
  if(!picks.length){ctx.fillStyle="#d2c7bd";ctx.font="600 25px Arial,sans-serif";ctx.fillText("No selections submitted yet.",70,headerHeight+65);}
  const footerY=headerHeight+Math.max(1,picks.length)*rowHeight;
  const combined=combinedFractional(picks.map(p=>p.odds));
  ctx.fillStyle="#ead5bd";ctx.font="800 24px Arial,sans-serif";ctx.fillText(`COMBINED ODDS: ${combined}`,70,footerY+52);
  ctx.fillStyle="#908781";ctx.font="500 17px Arial,sans-serif";ctx.fillText("Odds may change after the daily check.",70,footerY+88);
  ctx.fillStyle="#b99f8a";ctx.font="700 18px Arial,sans-serif";ctx.fillText(window.location.host,900,footerY+88);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error("Image creation failed.")),"image/jpeg",.94));
  return new File([blob],`bounce-btts-gw${gameweekNumber}-picks.jpg`,{type:"image/jpeg"});
}

export default function WeeklyPicksShareButton({gameweekNumber,seasonLabel,picks,disabled=false}:Props){
  const [busy,setBusy]=useState(false);
  async function share(){
    if(disabled||busy)return; setBusy(true);
    try{
      const file=await createPicksImage(gameweekNumber,seasonLabel,picks);
      const data:ShareData={title:`Bounce BTTS GW${gameweekNumber}`,text:`Bounce BTTS League — GW${gameweekNumber}`,files:[file]};
      const nav=navigator as Navigator & {canShare?:(data:ShareData)=>boolean};
      if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]}))) await navigator.share(data);
      else {const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
    } finally {setBusy(false);}
  }
  return <button className="dashboardPicksShareButton" onClick={share} disabled={disabled||busy} aria-disabled={disabled||busy}>
    <span aria-hidden="true">{disabled?"🔒":"▣"}</span><strong>{busy?"Creating image…":"Share weekly picks"}</strong><small>{disabled?`Locked until GW ${gameweekNumber} opens`:"Share as a formatted image"}</small>
  </button>;
}
