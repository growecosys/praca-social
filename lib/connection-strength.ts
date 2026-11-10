type Pair={userA:string;userB:string};
type Interaction={id:number;senderId:string;recipientId:string;status:string;kind:string;createdAt:string;resolvedAt?:string|null};
export function connectionLevel(days:number):1|2|3 {return days>=5?3:days>=2?2:1;}
export function connectionEdges(pairs:Pair[],interactions:Interaction[],responses:{entityId:string|null;metadataJson:string}[]) {
 const attendedIds=new Set(responses.filter(r=>{try{return JSON.parse(r.metadataJson||"{}").userAction==="attend";}catch{return false;}}).map(r=>Number(r.entityId)));
 return pairs.map(pair=>{
  const exchanges=interactions.filter(p=>((p.senderId===pair.userA&&p.recipientId===pair.userB)||(p.senderId===pair.userB&&p.recipientId===pair.userA))&&(["completed","attended","returned"].includes(p.status)||(p.status==="archived"&&attendedIds.has(p.id)))&&p.kind!=="mystery");
  const days=new Set(exchanges.map(p=>(p.resolvedAt||p.createdAt).slice(0,10))).size;
  return {a:pair.userA,b:pair.userB,level:connectionLevel(days),days};
 });
}
