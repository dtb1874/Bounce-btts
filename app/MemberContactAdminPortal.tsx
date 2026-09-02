"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type UserRow = { id:string; display_name:string; username:string; role:"ultimate_admin"|"admin"|"member"|"guest"; active:boolean; slot_number:number|null; mobile_number?:string };
type UserTarget = { slot:number; host:HTMLElement };
type LoadedImage = { source:CanvasImageSource; width:number; height:number; close:()=>void };

async function accessToken(){ const { data } = await createClient().auth.getSession(); return data.session?.access_token ?? ""; }

function findUserCardTargets(){
  if(typeof document === "undefined") return [] as UserTarget[];
  const usersButton = Array.from(document.querySelectorAll("button")).find((button)=>button.textContent?.trim()==="Users" && /active/i.test(button.className));
  if(!usersButton) return [] as UserTarget[];
  const targets:UserTarget[]=[];
  for(const card of Array.from(document.querySelectorAll<HTMLElement>("[data-slot]"))){
    const slot=Number(card.dataset.slot ?? ""); if(!Number.isFinite(slot)) continue;
    card.style.position="relative";
    let host=card.querySelector<HTMLElement>(":scope > [data-member-profile-host='true']");
    if(!host){ host=document.createElement("div"); host.dataset.memberProfileHost="true"; host.style.gridColumn="1 / -1"; host.style.width="100%"; card.appendChild(host); }
    targets.push({slot,host});
  }
  return targets;
}

async function loadImage(file:File):Promise<LoadedImage>{
  if(typeof window !== "undefined" && "createImageBitmap" in window){
    try{
      const bitmap=await createImageBitmap(file);
      return { source:bitmap, width:bitmap.width, height:bitmap.height, close:()=>bitmap.close() };
    }catch{}
  }
  const url=URL.createObjectURL(file);
  return await new Promise<LoadedImage>((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve({ source:image, width:image.naturalWidth || image.width, height:image.naturalHeight || image.height, close:()=>URL.revokeObjectURL(url) });
    image.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error("Could not open this image on this device.")); };
    image.src=url;
  });
}

async function portraitBlob(file:File, zoom:number, panX:number, panY:number){
  const image=await loadImage(file); const width=720, height=900;
  try{
    const canvas=document.createElement("canvas"); canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext("2d"); if(!ctx) throw new Error("Could not prepare portrait crop.");
    const safeZoom=Math.max(1.1,zoom);
    const scale=Math.max(width/image.width,height/image.height)*safeZoom;
    const sourceWidth=width/scale, sourceHeight=height/scale;
    const availableX=Math.max(0,image.width-sourceWidth), availableY=Math.max(0,image.height-sourceHeight);
    const sx=availableX*Math.max(0,Math.min(100,panX))/100;
    const sy=availableY*Math.max(0,Math.min(100,panY))/100;
    ctx.drawImage(image.source,sx,sy,sourceWidth,sourceHeight,0,0,width,height);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error("Could not create portrait crop.")),"image/jpeg",.9));
  } finally { image.close(); }
}

export default function MemberContactAdminPortal(){
  const [targets,setTargets]=useState<UserTarget[]>([]);
  const [users,setUsers]=useState<UserRow[]>([]);
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const [savingId,setSavingId]=useState<string|null>(null);
  const [messages,setMessages]=useState<Record<string,string>>({});
  const [files,setFiles]=useState<Record<string,File|undefined>>({});
  const [previewUrls,setPreviewUrls]=useState<Record<string,string>>({});
  const [savedPortraitUrls,setSavedPortraitUrls]=useState<Record<string,string>>({});
  const [zoom,setZoom]=useState<Record<string,number>>({});
  const [focusX,setFocusX]=useState<Record<string,number>>({});
  const [focusY,setFocusY]=useState<Record<string,number>>({});
  const [imageSavingId,setImageSavingId]=useState<string|null>(null);

  useEffect(()=>{ const update=()=>setTargets(findUserCardTargets()); update(); const observer=new MutationObserver(update); observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]}); return()=>observer.disconnect(); },[]);

  useEffect(()=>{
    if(!targets.length || users.length) return;
    void(async()=>{ try{
      const auth=await accessToken(); const response=await fetch("/api/admin/users",{headers:{authorization:`Bearer ${auth}`}}); const json=await response.json();
      if(!response.ok) throw new Error(json.error ?? "Could not load member profiles.");
      const rows=(json.users ?? []) as UserRow[]; setUsers(rows); setDrafts(Object.fromEntries(rows.map((row)=>[row.id,row.mobile_number ?? ""])));
      setZoom(Object.fromEntries(rows.map((row)=>[row.id,1.15]))); setFocusX(Object.fromEntries(rows.map((row)=>[row.id,50]))); setFocusY(Object.fromEntries(rows.map((row)=>[row.id,45])));
      const images=await Promise.all(rows.map(async(row)=>{ const r=await fetch(`/api/admin/profile-image?profileId=${encodeURIComponent(row.id)}`,{headers:{authorization:`Bearer ${auth}`}}); if(!r.ok) return [row.id,""] as const; const j=await r.json(); return [row.id,String(j.portraitUrl ?? "")] as const; }));
      setSavedPortraitUrls(Object.fromEntries(images));
    }catch(error){ setMessages({global:error instanceof Error?error.message:"Could not load member profiles."}); } })();
  },[targets.length,users.length]);

  useEffect(()=>()=>{ for(const url of Object.values(previewUrls)) if(url) URL.revokeObjectURL(url); },[previewUrls]);

  const usersBySlot=useMemo(()=>new Map(users.map((user)=>[Number(user.slot_number),user])),[users]);

  async function saveContact(user:UserRow){
    setSavingId(user.id); setMessages((current)=>({...current,[user.id]:""}));
    try{ const response=await fetch("/api/admin/users",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await accessToken()}`},body:JSON.stringify({id:user.id,username:user.username,displayName:user.display_name,role:user.role,active:user.active,password:"",mobileNumber:drafts[user.id] ?? ""})}); const json=await response.json(); if(!response.ok) throw new Error(json.error ?? "Could not save mobile number."); const cleaned=(drafts[user.id] ?? "").trim().replace(/[\s()-]/g,""); setDrafts((c)=>({...c,[user.id]:cleaned})); setUsers((c)=>c.map((row)=>row.id===user.id?{...row,mobile_number:cleaned}:row)); setMessages((c)=>({...c,[user.id]:"Contact saved."})); }
    catch(error){ setMessages((c)=>({...c,[user.id]:error instanceof Error?error.message:"Could not save mobile number."})); }
    finally{ setSavingId(null); }
  }

  async function choosePhoto(user:UserRow,file?:File){
    if(!file) return;
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){ setMessages((c)=>({...c,[user.id]:"Use a JPEG, PNG or WebP image."})); return; }
    if(file.size>10*1024*1024){ setMessages((c)=>({...c,[user.id]:"Photo must be under 10 MB."})); return; }
    if(previewUrls[user.id]) URL.revokeObjectURL(previewUrls[user.id]);
    const url=URL.createObjectURL(file); setFiles((c)=>({...c,[user.id]:file})); setPreviewUrls((c)=>({...c,[user.id]:url})); setZoom((c)=>({...c,[user.id]:1.15})); setFocusX((c)=>({...c,[user.id]:50})); setFocusY((c)=>({...c,[user.id]:45})); setMessages((c)=>({...c,[user.id]:"Suggested crop ready — adjust if needed."}));
    try{
      const Detector=(window as any).FaceDetector;
      if(Detector){
        const image=await loadImage(file);
        try{
          const faces=await new Detector({fastMode:true,maxDetectedFaces:1}).detect(image.source);
          if(faces?.[0]?.boundingBox){ const box=faces[0].boundingBox; const x=((box.x+box.width*.5)/image.width)*100; const y=((box.y+box.height*.52)/image.height)*100; const suggestedZoom=Math.max(1.15,Math.min(2.1,image.height/Math.max(1,box.height*3.8))); setFocusX((c)=>({...c,[user.id]:Math.max(0,Math.min(100,x))})); setFocusY((c)=>({...c,[user.id]:Math.max(0,Math.min(100,y))})); setZoom((c)=>({...c,[user.id]:suggestedZoom})); setMessages((c)=>({...c,[user.id]:"Face detected — suggested portrait crop applied."})); }
        } finally { image.close(); }
      }
    }catch{}
  }

  async function savePhoto(user:UserRow){
    const file=files[user.id]; if(!file) return; setImageSavingId(user.id); setMessages((c)=>({...c,[user.id]:""}));
    try{ const crop=await portraitBlob(file,zoom[user.id] ?? 1.15,focusX[user.id] ?? 50,focusY[user.id] ?? 45); const form=new FormData(); form.append("profileId",user.id); form.append("original",file,file.name || "original.jpg"); form.append("portrait",new File([crop],"portrait.jpg",{type:"image/jpeg"})); const response=await fetch("/api/admin/profile-image",{method:"POST",headers:{authorization:`Bearer ${await accessToken()}`},body:form}); const json=await response.json(); if(!response.ok) throw new Error(json.error ?? "Could not save profile picture."); setSavedPortraitUrls((c)=>({...c,[user.id]:`${json.portraitUrl}?v=${Date.now()}`})); setMessages((c)=>({...c,[user.id]:"Profile picture saved. Original stored privately."})); }
    catch(error){ setMessages((c)=>({...c,[user.id]:error instanceof Error?error.message:"Could not save profile picture."})); }
    finally{ setImageSavingId(null); }
  }

  async function removePhoto(user:UserRow){
    if(!window.confirm(`Remove the saved profile picture for ${user.display_name}?`)) return;
    setImageSavingId(user.id); setMessages((c)=>({...c,[user.id]:""}));
    try{
      const response=await fetch("/api/admin/profile-image",{method:"DELETE",headers:{"content-type":"application/json",authorization:`Bearer ${await accessToken()}`},body:JSON.stringify({profileId:user.id})});
      const json=await response.json(); if(!response.ok) throw new Error(json.error ?? "Could not remove profile picture.");
      if(previewUrls[user.id]) URL.revokeObjectURL(previewUrls[user.id]);
      setFiles((c)=>({...c,[user.id]:undefined})); setPreviewUrls((c)=>({...c,[user.id]:""})); setSavedPortraitUrls((c)=>({...c,[user.id]:""}));
      setZoom((c)=>({...c,[user.id]:1.15})); setFocusX((c)=>({...c,[user.id]:50})); setFocusY((c)=>({...c,[user.id]:45})); setMessages((c)=>({...c,[user.id]:"Profile picture removed."}));
    }catch(error){ setMessages((c)=>({...c,[user.id]:error instanceof Error?error.message:"Could not remove profile picture."})); }
    finally{ setImageSavingId(null); }
  }

  return <>
    {messages.global && <div style={{display:"none"}}>{messages.global}</div>}
    {targets.map(({slot,host})=>{ const user=usersBySlot.get(slot); if(!user) return null; const message=messages[user.id] ?? ""; const imageUrl=previewUrls[user.id] || savedPortraitUrls[user.id] || ""; const z=Math.max(1.1,zoom[user.id] ?? 1.15); const px=focusX[user.id] ?? 50; const py=focusY[user.id] ?? 45; const translateX=(50-px)*(z-1)/z; const translateY=(50-py)*(z-1)/z; return createPortal(
      <details style={{marginTop:4}}>
        <summary aria-label={`Open contact and profile details for ${user.display_name}`} title="Contact & profile" style={{position:"absolute",top:12,right:14,width:40,height:40,borderRadius:10,border:"1px solid rgba(199,175,149,.38)",background:"rgba(20,14,18,.82)",color:"#f0cfaa",cursor:"pointer",display:"grid",placeItems:"center",listStyle:"none",fontSize:20,fontWeight:900,zIndex:4}}>⌄</summary>
        <div style={{marginTop:10,paddingTop:12,borderTop:"1px solid rgba(255,255,255,.08)",display:"grid",gap:12}}>
          <div><strong style={{display:"block",color:"#f0cfaa",fontSize:11,letterSpacing:".08em"}}>CONTACT & PROFILE</strong><small style={{color:"#9f938c"}}>Ultimate Admin only · private contact and profile image controls</small></div>
          <label style={{display:"grid",gap:5,color:"#c9bbb2",fontSize:11,fontWeight:800}}>MOBILE NUMBER<input type="tel" inputMode="tel" autoComplete="off" placeholder="+447700900123" value={drafts[user.id] ?? ""} onChange={(event)=>setDrafts((c)=>({...c,[user.id]:event.target.value}))} style={{width:"100%",boxSizing:"border-box",background:"#0c0e13",color:"#fff",border:"1px solid #4c3139",borderRadius:8,padding:10}}/></label>
          <div><button type="button" disabled={savingId===user.id} onClick={()=>saveContact(user)} style={{border:"1px solid #93475c",borderRadius:9,padding:"9px 12px",background:"linear-gradient(180deg,#7c263d,#641b31)",color:"#f2ede7",fontWeight:800}}>{savingId===user.id?"Saving…":"Save contact details"}</button></div>
          <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:12,display:"grid",gap:10}}>
            <strong style={{color:"#f0cfaa",fontSize:11,letterSpacing:".08em"}}>PROFILE PICTURE</strong>
            <div style={{display:"grid",gridTemplateColumns:"110px minmax(0,1fr)",gap:12,alignItems:"start"}}>
              <div style={{width:110,aspectRatio:"4 / 5",overflow:"hidden",borderRadius:12,border:"1px solid #633642",background:"#0c0e13",position:"relative"}}>{imageUrl?<img src={imageUrl} alt={`${user.display_name} portrait preview`} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",transformOrigin:"center",transform:`scale(${z}) translate(${translateX}%, ${translateY}%)`,willChange:"transform"}}/>:<div style={{height:"100%",display:"grid",placeItems:"center",color:"#766d68",fontSize:11,textAlign:"center",padding:8}}>No profile picture</div>}</div>
              <div style={{display:"grid",gap:9}}>
                <label style={{display:"grid",gap:5,color:"#c9bbb2",fontSize:11,fontWeight:800}}>CHOOSE PHOTO<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>void choosePhoto(user,event.target.files?.[0])}/></label>
                {files[user.id] && <>
                  <label style={{display:"grid",gap:4,color:"#a99d96",fontSize:10}}>ZOOM<input type="range" min="1.1" max="2.4" step="0.05" value={z} onChange={(e)=>setZoom((c)=>({...c,[user.id]:Number(e.target.value)}))}/></label>
                  <label style={{display:"grid",gap:4,color:"#a99d96",fontSize:10}}>HORIZONTAL FRAMING<input type="range" min="0" max="100" step="1" value={px} onChange={(e)=>setFocusX((c)=>({...c,[user.id]:Number(e.target.value)}))}/></label>
                  <label style={{display:"grid",gap:4,color:"#a99d96",fontSize:10}}>VERTICAL FRAMING<input type="range" min="0" max="100" step="1" value={py} onChange={(e)=>setFocusY((c)=>({...c,[user.id]:Number(e.target.value)}))}/></label>
                  <button type="button" disabled={imageSavingId===user.id} onClick={()=>void savePhoto(user)} style={{border:"1px solid #93475c",borderRadius:9,padding:"9px 12px",background:"linear-gradient(180deg,#7c263d,#641b31)",color:"#f2ede7",fontWeight:800}}>{imageSavingId===user.id?"Saving picture…":"Save profile picture"}</button>
                </>}
                {savedPortraitUrls[user.id] && <button type="button" disabled={imageSavingId===user.id} onClick={()=>void removePhoto(user)} style={{border:"1px solid #783743",borderRadius:9,padding:"8px 11px",background:"#2a151b",color:"#eab0b8",fontWeight:800}}>{imageSavingId===user.id?"Working…":"Remove saved picture"}</button>}
              </div>
            </div>
            <small style={{color:"#8f8781"}}>The portrait starts slightly zoomed so both framing sliders have room to pan. The saved 4:5 portrait is public for league display; the original upload is stored privately.</small>
          </div>
          {message && <span style={{color:/(saved|ready|detected|removed|privately)/i.test(message)?"#9fd8b8":"#ef9aa8",fontSize:12}}>{message}</span>}
        </div>
      </details>,host,`member-profile-${slot}`); })}
  </>;
}
