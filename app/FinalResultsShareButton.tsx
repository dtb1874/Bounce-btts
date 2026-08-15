"use client";

import { useState } from "react";

type FinalResultRow = {
  player: string;
  homeTeam: string | null;
  awayTeam: string | null;
  status: string | null;
  homeScore: number | null;
  awayScore: number | null;
  points: number | null;
  outcome: string;
};

type Props = {
  gameweekNumber: number;
  seasonLabel: string;
  rows: FinalResultRow[];
  disabled?: boolean;
};

function roundedRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function tone(row:FinalResultRow){if(row.points===3)return {fill:"#1f7a45",text:"#f3fff7"};if(row.points===1)return {fill:"#8b5b16",text:"#fff6df"};if(row.points===-1)return {fill:"#7c2031",text:"#fff1f4"};return {fill:"#41434a",text:"#edf0f5"}}

async function createImage(gameweekNumber:number,seasonLabel:string,rows:FinalResultRow[]){
  const width=1200,rowHeight=100,headerHeight=230,footerHeight=105;
  const height=headerHeight+Math.max(rows.length,1)*rowHeight+footerHeight;
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Unable to create results image.");
  const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,"#090a0e");bg.addColorStop(.62,"#171116");bg.addColorStop(1,"#421524");ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  ctx.fillStyle="#eadbc9";ctx.font="700 66px Georgia,serif";ctx.fillText("BOUNCE",70,88);
  ctx.fillStyle="#c8af94";ctx.font="600 26px Georgia,serif";ctx.fillText("BTTS LEAGUE",74,130);
  ctx.fillStyle="#a9917f";ctx.font="700 19px Arial,sans-serif";ctx.fillText(`SEASON ${seasonLabel}  •  GAMEWEEK ${gameweekNumber}`,74,174);
  ctx.fillStyle="#f0cfaa";ctx.font="800 28px Arial,sans-serif";ctx.fillText("FINAL RESULTS",895,126);
  ctx.strokeStyle="#6b3442";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(70,202);ctx.lineTo(1130,202);ctx.stroke();

  rows.forEach((row,index)=>{
    const y=headerHeight+index*rowHeight;
    ctx.fillStyle=index%2?"rgba(255,255,255,.025)":"rgba(112,31,50,.22)";roundedRect(ctx,58,y+6,1084,rowHeight-12,12);ctx.fill();
    ctx.fillStyle="#eadfd4";ctx.font="800 24px Arial,sans-serif";ctx.fillText(row.player.slice(0,24),82,y+39);
    ctx.fillStyle="#f4eee8";ctx.font="700 23px Arial,sans-serif";ctx.fillText(row.homeTeam&&row.awayTeam?`${row.homeTeam} v ${row.awayTeam}`.slice(0,46):"No fixture selected",330,y+39);
    ctx.fillStyle="#b6aba2";ctx.font="600 18px Arial,sans-serif";ctx.fillText(row.homeScore!=null&&row.awayScore!=null?`${row.homeScore}–${row.awayScore} · ${row.status??"FT"}`:"MISSED PICK",330,y+71);
    const colours=tone(row);ctx.fillStyle=colours.fill;roundedRect(ctx,820,y+29,220,42,20);ctx.fill();ctx.fillStyle=colours.text;ctx.font="800 16px Arial,sans-serif";ctx.textAlign="center";const label=`${row.outcome}${row.points!=null?` · ${row.points>0?"+":""}${row.points}`:""}`;ctx.fillText(label.slice(0,26),930,y+56);ctx.textAlign="left";
    ctx.fillStyle="#f0cfaa";ctx.font="900 27px Arial,sans-serif";ctx.fillText(row.points==null?"—":row.points>0?`+${row.points}`:`${row.points}`,1072,y+57);
  });
  if(!rows.length){ctx.fillStyle="#d2c7bd";ctx.font="600 25px Arial,sans-serif";ctx.fillText("No final results available.",70,headerHeight+60)}
  const footerY=headerHeight+Math.max(rows.length,1)*rowHeight;ctx.fillStyle="#908781";ctx.font="500 17px Arial,sans-serif";ctx.fillText("BTTS +3 · Score-nil +1 · 0-0 / missed pick -1",70,footerY+48);ctx.fillStyle="#b99f8a";ctx.font="700 18px Arial,sans-serif";ctx.fillText(window.location.host,900,footerY+48);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error("Image creation failed.")),"image/jpeg",.94));
  return new File([blob],`bounce-btts-gw${gameweekNumber}-final-results.jpg`,{type:"image/jpeg"});
}

export default function FinalResultsShareButton({gameweekNumber,seasonLabel,rows,disabled=false}:Props){
  const [busy,setBusy]=useState(false);
  async function share(){if(disabled||busy)return;setBusy(true);try{const file=await createImage(gameweekNumber,seasonLabel,rows);const data:ShareData={title:`Bounce BTTS GW${gameweekNumber} final results`,text:`Bounce BTTS League — GW${gameweekNumber} final results`,files:[file]};const nav=navigator as Navigator&{canShare?:(data:ShareData)=>boolean};if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]})))await navigator.share(data);else{const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}}finally{setBusy(false)}}
  return <button className="dashboardFinalResultsShareButton" type="button" onClick={share} disabled={disabled||busy} aria-disabled={disabled||busy}><span aria-hidden="true">{disabled?"🔒":"✓"}</span><strong>{busy?"Creating…":"Share final results"}</strong><small>{disabled?"Available when all picks are settled":"Share completed GW image"}</small></button>
}
