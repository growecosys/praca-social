'use client';
import {useRef,useState} from 'react';
import {commitHistory,stepHistory,type EditorHistory} from './editor-history';
import type {ContentBlock} from './content';
type Document={title:string;blocks:ContentBlock[]};
export function useEditorHistory(initial:Document){
 const [history,setHistory]=useState<EditorHistory<Document>>({past:[],present:initial,future:[]}),ref=useRef(history),group=useRef({key:'',at:0});
 const apply=(next:EditorHistory<Document>)=>{ref.current=next;setHistory(next);};
 function commit(value:Document|((d:Document)=>Document),key=''){const h=ref.current,next=typeof value==='function'?value(h.present):value;if(JSON.stringify(next)===JSON.stringify(h.present))return;const now=Date.now(),coalesce=Boolean(key&&key===group.current.key&&now-group.current.at<900&&!h.future.length);apply(commitHistory(h,next,coalesce));group.current={key,at:now};}
 function step(direction:'undo'|'redo'){group.current={key:'',at:0};apply(stepHistory(ref.current,direction));}
 return {history,commit,undo:()=>step('undo'),redo:()=>step('redo'),restore:(present:Document,past:Document[]=[],future:Document[]=[])=>{group.current={key:'',at:0};apply({present,past:past.slice(-30),future:future.slice(0,30)});},setTitle:(title:string)=>commit(d=>({...d,title}),'title'),setBlocks:(value:ContentBlock[]|((b:ContentBlock[])=>ContentBlock[]))=>commit(d=>({...d,blocks:typeof value==='function'?value(d.blocks):value}))};
}
