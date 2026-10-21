import {useLayoutEffect, useRef, useState} from 'react';
// Keep drill-down context in same-document history, preserving the PWA base path.
export default function useContextHistory<T>(state:T, routeKey:string, restore:(s:T)=>void){
 const current=useRef(state), apply=useRef(restore), last=useRef(''), restoring=useRef(false), position=useRef(0), [depth,setDepth]=useState(0);
 current.current=state;apply.current=restore;
 useLayoutEffect(()=>{
  const listener=(e:PopStateEvent)=>{
   // Native utility surfaces consume Back before leaving their underlying page.
   const surface=document.querySelector<HTMLDialogElement>('dialog.bc-drawer[open],dialog.bc-period-dialog[open],dialog[aria-label="Transaction filters"][open]');
   if(surface){history.pushState({mhfRC3:true,depth:position.current,key:last.current,context:current.current},'');surface.dispatchEvent(new Event('cancel',{cancelable:true}));return}
   if(e.state?.mhfRC3){restoring.current=true;last.current=e.state.key;position.current=e.state.depth;setDepth(e.state.depth);apply.current(e.state.context);requestAnimationFrame(()=>window.scrollTo(0,e.state.scrollY||0))}
  };
  const rememberScroll=()=>{if(history.state?.mhfRC3)history.replaceState({...history.state,scrollY:window.scrollY},'')};
  window.addEventListener('scroll',rememberScroll,{passive:true});window.addEventListener('popstate',listener);return()=>{window.removeEventListener('popstate',listener);window.removeEventListener('scroll',rememberScroll)};
 },[]);
 useLayoutEffect(()=>{
  if(restoring.current){restoring.current=false;return}
  const changed=last.current!==''&&last.current!==routeKey;
  const n=changed?position.current+1:position.current;
  const entry={mhfRC3:true,depth:n,key:routeKey,context:state,scrollY:changed?0:window.scrollY};
  if(changed)history.pushState(entry,'');else history.replaceState(entry,'');
  last.current=routeKey;position.current=n;if(depth!==n)setDepth(n);
 },[state,routeKey,depth]);
 return {canBack:depth>0,back:()=>{if(history.state?.mhfRC3&&history.state.depth>0)history.back()}};
}
