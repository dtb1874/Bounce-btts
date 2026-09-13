"use client";

import { useState } from "react";
import type { PublicStandingRow } from "@/lib/public-table";
import { drawShareAvatar, loadSharePortraits } from "@/lib/share-portraits";
import { SHARE_BRAND, drawShareFooter, drawShareMasthead, drawSharePaper, loadShareBrandArtwork } from "@/lib/share-brand";

type ShareTableButtonProps = {
  rows: PublicStandingRow[];
  seasonLabel: string;
  prizePot: number;
  gameweekNumber?: number | null;
  className?: string;
  compact?: boolean;
  label?: string;
};

async function createSnapshot(rows:PublicStandingRow[],seasonLabel:string,prizePot:number,gameweekNumber:number|null,liveUrl:string){
  const [portraits,artwork]=await Promise.all([loadSharePortraits(),loadShareBrandArtwork()]);
  const width=1200,rowHeight=76,headerHeight=250,footerHeight=142,tableHeight=Math.max(rows.length,1)*rowHeight,height=headerHeight+tableHeight+footerHeight;
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const context=canvas.getContext("2d");if(!context)throw new Error("Your browser could not create the table image.");
  drawSharePaper(context,width,height,artwork);
  drawShareMasthead(context,width,{eyebrow:`Season ${seasonLabel}${gameweekNumber?` · Gameweek ${gameweekNumber}`:""}`,title:"League Table",subtitle:`Bounce BTTS League · Prize pot £${prizePot.toFixed(0)}`,artwork,top:48,left:72});
  const columns=[80,160,690,785,875,975,1080],labels=["POS","PLAYER","P","W","S-N","0-0","PTS"];
  context.fillStyle="#8e5b35";context.font="800 17px Arial, sans-serif";labels.forEach((label,index)=>context.fillText(label,columns[index],headerHeight-18));
  rows.forEach((row,index)=>{const y=headerHeight+index*rowHeight;if(index===0){context.fillStyle="rgba(183,141,54,.12)";context.fillRect(60,y+5,1080,rowHeight-10)}context.strokeStyle="rgba(95,31,54,.11)";context.lineWidth=1;context.beginPath();context.moveTo(60,y+rowHeight);context.lineTo(1140,y+rowHeight);context.stroke();context.fillStyle=SHARE_BRAND.ink;context.font="700 23px Arial, sans-serif";context.fillText(String(index+1),columns[0],y+49);drawShareAvatar(context,portraits,{id:row.id,name:row.name,x:178,y:y+38,size:40,border:SHARE_BRAND.goldSoft,background:SHARE_BRAND.maroon});context.fillStyle=SHARE_BRAND.ink;context.font="700 25px Georgia, serif";context.fillText(row.name.slice(0,30),207,y+49);context.font="600 22px Arial, sans-serif";context.fillText(String(row.played),columns[2],y+49);context.fillText(String(row.wins),columns[3],y+49);context.fillText(String((row as PublicStandingRow&{oneSided?:number;scoreNilCount?:number}).oneSided??(row as PublicStandingRow&{scoreNilCount?:number}).scoreNilCount??0),columns[4],y+49);context.fillText(String(row.zeroZeroCount),columns[5],y+49);context.fillStyle=SHARE_BRAND.maroon;context.font="800 27px Georgia, serif";context.fillText(String(row.points),columns[6],y+49)});
  const footerY=headerHeight+tableHeight;context.fillStyle=SHARE_BRAND.muted;context.font="600 16px Arial, sans-serif";context.fillText("Ties: fewest 0–0s, most BTTS wins, then alphabetical.",72,footerY+42);context.fillStyle=SHARE_BRAND.maroon;context.font="800 18px Arial, sans-serif";context.fillText(liveUrl.replace(/^https?:\/\//,""),72,footerY+76);context.fillStyle=SHARE_BRAND.muted;context.font="500 15px Arial, sans-serif";context.textAlign="right";context.fillText(`Live snapshot · ${new Date().toLocaleString("en-GB")}`,1128,footerY+76);context.textAlign="left";drawShareFooter(context,width,height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error("The table image could not be generated.")),"image/jpeg",.94));return new File([blob],`bounce-btts-table-${seasonLabel.replace("/","-")}.jpg`,{type:"image/jpeg"});
}

export default function ShareTableButton({rows,seasonLabel,prizePot,gameweekNumber=null,className="",compact=false,label="Share league table"}:ShareTableButtonProps){
  const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
  async function share(){if(busy)return;setBusy(true);setMessage("");try{const liveUrl=`${window.location.origin}/table`;const file=await createSnapshot(rows,seasonLabel,prizePot,gameweekNumber,liveUrl);const text=`Bounce BTTS League table — Season ${seasonLabel}`+`${gameweekNumber?` — Gameweek ${gameweekNumber}`:""}\n`+`See the live table: ${liveUrl}`;const shareData:ShareData={title:"Bounce BTTS League Table",text,url:liveUrl,files:[file]};const browser=navigator as Navigator&{canShare?:(data:ShareData)=>boolean};if(navigator.share&&(!browser.canShare||browser.canShare({files:[file]}))){await navigator.share(shareData);setMessage("Shared")}else{const objectUrl=URL.createObjectURL(file);const link=document.createElement("a");link.href=objectUrl;link.download=file.name;link.click();window.setTimeout(()=>URL.revokeObjectURL(objectUrl),5000);window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer");setMessage("JPEG downloaded — attach it in WhatsApp")}}catch(error){if(error instanceof DOMException&&error.name==="AbortError")return;setMessage(error instanceof Error?error.message:"Could not share the table.")}finally{setBusy(false)}}
  return <span className={`tableShareControl ${compact?"compact":""} ${className}`.trim()}><button className="dataShareButton shareCompactWhatsApp" type="button" onClick={share} disabled={busy} aria-label="Share league table to WhatsApp">{busy?"Creating…":label}</button>{message&&<small className="tableShareMessage">{message}</small>}</span>;
}
