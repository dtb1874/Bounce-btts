"use client";

import { useState } from "react";

type Props = {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  fileName: string;
  label: string;
  compact?: boolean;
};

function fitText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let text = value;
  while (text.length > 1 && ctx.measureText(`${text}…`).width > maxWidth) text = text.slice(0, -1);
  return `${text}…`;
}

async function createImage({ title, subtitle, columns, rows }: Pick<Props,"title"|"subtitle"|"columns"|"rows">) {
  const width = 1200;
  const headerHeight = 230;
  const rowHeight = 72;
  const footerHeight = 110;
  const height = headerHeight + Math.max(rows.length, 1) * rowHeight + footerHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create share image.");

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#090a0e");
  background.addColorStop(.62, "#171116");
  background.addColorStop(1, "#421524");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(122,34,55,.25)";
  ctx.beginPath(); ctx.arc(1070, 105, 230, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#eadbc9"; ctx.font = "700 66px Georgia,serif"; ctx.fillText("BOUNCE", 70, 88);
  ctx.fillStyle = "#c8af94"; ctx.font = "600 26px Georgia,serif"; ctx.fillText("BTTS LEAGUE", 74, 130);
  ctx.fillStyle = "#f0cfaa"; ctx.font = "800 25px Arial,sans-serif"; ctx.fillText(title.toUpperCase(), 70, 178);
  if (subtitle) { ctx.fillStyle = "#a9917f"; ctx.font = "600 17px Arial,sans-serif"; ctx.fillText(fitText(ctx, subtitle, 1030), 70, 207); }

  const left = 62, right = 1138, tableWidth = right-left;
  const colWidth = tableWidth / Math.max(columns.length,1);
  ctx.fillStyle = "rgba(116,32,52,.72)"; ctx.fillRect(left, headerHeight-8, tableWidth, 52);
  ctx.fillStyle = "#fff0de"; ctx.font = "800 16px Arial,sans-serif";
  columns.forEach((column,index)=>ctx.fillText(fitText(ctx,column,colWidth-18),left+index*colWidth+10,headerHeight+24));

  if (!rows.length) {
    ctx.fillStyle = "#cbbfb6"; ctx.font = "600 22px Arial,sans-serif"; ctx.fillText("No data to share yet.", 70, headerHeight+95);
  }
  rows.forEach((row,rowIndex)=>{
    const y=headerHeight+44+rowIndex*rowHeight;
    if(rowIndex%2===0){ctx.fillStyle="rgba(255,255,255,.025)";ctx.fillRect(left,y,tableWidth,rowHeight)}
    row.forEach((value,colIndex)=>{
      ctx.fillStyle=colIndex===row.length-1?"#f0cfaa":"#ece4dc";
      ctx.font=colIndex===0||colIndex===row.length-1?"800 18px Arial,sans-serif":"600 18px Arial,sans-serif";
      ctx.fillText(fitText(ctx,String(value),colWidth-18),left+colIndex*colWidth+10,y+43);
    });
    ctx.strokeStyle="rgba(255,255,255,.07)";ctx.beginPath();ctx.moveTo(left,y+rowHeight);ctx.lineTo(right,y+rowHeight);ctx.stroke();
  });

  const footerY=height-footerHeight;
  ctx.fillStyle="#a9917f";ctx.font="600 17px Arial,sans-serif";ctx.fillText("Bounce BTTS League · shareable snapshot",70,footerY+50);
  ctx.fillStyle="#c8af94";ctx.font="700 17px Arial,sans-serif";ctx.fillText(window.location.host,900,footerY+50);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error("Image creation failed.")),"image/jpeg",.94));
  return blob;
}

export default function DataShareButton(props: Props){
  const [busy,setBusy]=useState(false);
  async function share(){
    if(busy)return;setBusy(true);
    try{
      const blob=await createImage(props);
      const file=new File([blob],props.fileName,{type:"image/jpeg"});
      const data:ShareData={title:props.title,text:`Bounce BTTS League — ${props.title}`,files:[file]};
      const nav=navigator as Navigator & {canShare?:(data:ShareData)=>boolean};
      if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]}))) await navigator.share(data);
      else {const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
    } finally {setBusy(false);}
  }
  return <button type="button" className={`dataShareButton shareCompactWhatsApp ${props.compact?"compact":""}`} onClick={share} disabled={busy} aria-label={`${props.label} to WhatsApp`}>{busy?"Creating…":"Share to WhatsApp"}</button>;
}
