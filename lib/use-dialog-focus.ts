"use client";
import { useEffect, useRef } from "react";
export function useDialogFocus(open:boolean, close:()=>void, busy=false, selector='[role="dialog"]') {
 const closeRef=useRef(close),busyRef=useRef(busy);closeRef.current=close;busyRef.current=busy;
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement as HTMLElement|null;
  const dialog=document.querySelector<HTMLElement>(selector);
  if(!dialog)return;
  const overflow=document.body.style.overflow;document.body.style.overflow="hidden";
  const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length);
  dialog.tabIndex=-1;(controls()[0]||dialog).focus();
  function key(event:KeyboardEvent){
   if(event.key==="Escape"){event.preventDefault();event.stopPropagation();if(!busyRef.current)closeRef.current();}
   if(event.key==="Tab"){const list=controls(),first=list[0],last=list[list.length-1];if(!first){event.preventDefault();dialog!.focus();return;}if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!dialog!.contains(document.activeElement))){event.preventDefault();first.focus();}}
  }
  document.addEventListener("keydown",key,true);
  return ()=>{document.removeEventListener("keydown",key,true);document.body.style.overflow=overflow;previous?.focus();};
 },[open,selector]);
}
