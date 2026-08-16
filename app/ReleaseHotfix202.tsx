"use client";

import { useEffect } from "react";

export default function ReleaseHotfix202(){
  useEffect(()=>{
    const apply=()=>{
      document.querySelectorAll("footer").forEach(footer=>{
        if(footer.textContent?.includes("MADE BY THE ARTIST, FOR THE BOUNCE")){
          footer.textContent=footer.textContent.replace(/v2\.0\.1\b/,"v2.0.2");
        }
      });
      const heading=Array.from(document.querySelectorAll("h3")).find(h=>h.textContent?.trim()==="Release History");
      const host=heading?.parentElement;
      if(!host||host.querySelector('[data-release="2.0.2"]'))return;
      const note=document.createElement("details");
      note.open=true;
      note.setAttribute("data-release","2.0.2");
      const existing=host.querySelector("details");
      if(existing)note.className=existing.className;
      note.innerHTML='<summary><span><strong>v2.0.2</strong> · 16 Aug 2026</span><small>Mobile menu scrolling and navigation density hotfix</small></summary><ul><li>Fixed the mobile drawer so every role can scroll to the full navigation list, including Admin and Alerts.</li><li>Added safe bottom clearance above the fixed navigation dock so lower menu entries remain reachable on iPhone.</li><li>Tightened mobile menu rows slightly and increased text weight and contrast for clearer navigation.</li><li>Preserved the approved centred BOUNCE header treatment and all v2 functionality.</li></ul>';
      const intro=host.querySelector("p");
      if(intro?.nextSibling)host.insertBefore(note,intro.nextSibling);else host.appendChild(note);
      const oldFirst=Array.from(host.querySelectorAll("details")).find(d=>d!==note);
      if(oldFirst)oldFirst.removeAttribute("open");
    };
    apply();
    const observer=new MutationObserver(apply);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
