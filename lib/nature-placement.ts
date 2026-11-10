export const NATURE_SPOTS={header:"Acima do header",title:"Sobre um título",map:"Na borda do mapa",button:"Sobre um botão",card:"Na borda de um card",margin:"Nos cantos da página"} as const;
export type NatureSpot=keyof typeof NATURE_SPOTS;
export const SUPPORTS={ground:"Caminha / apoia as patas",perch:"Pousa / se apoia",corner:"Nasce de um canto",floating:"Flutua / voa"} as const;
export type Placement={support:keyof typeof SUPPORTS;spots:NatureSpot[];size:"tiny"|"small"|"medium";motion:"still"|"sway"|"stroll";baseline:number};
const COMPATIBLE:Record<Placement["support"],NatureSpot[]>={ground:["header","title","map","button","card"],perch:["header","title","card","button"],corner:["margin","card"],floating:["margin","title","header"]};
export function compatibleSpots(support:Placement["support"]){return COMPATIBLE[support];}
export function validatePlacement(value:unknown):Placement {
 const p=value as Placement;
 if(!p||!COMPATIBLE[p.support]||!Array.isArray(p.spots)||!p.spots.length||p.spots.length>6||p.spots.some(s=>!COMPATIBLE[p.support].includes(s))||!["tiny","small","medium"].includes(p.size)||!["still","sway","stroll"].includes(p.motion)||!Number.isFinite(p.baseline)||p.baseline<0||p.baseline>20)throw Error("Escolha um apoio e pelo menos um lugar compatível para a imagem.");
 return {support:p.support,spots:[...new Set(p.spots)],size:p.size,motion:p.support==="ground"&&p.motion==="sway"?"still":p.motion,baseline:Math.round(p.baseline)};
}
export function defaultPlacement(id=""):Placement {
 if(id==="lobo-guara")return {support:"ground",spots:["header","title","map","button","card"],size:"small",motion:"stroll",baseline:4};
 if(["tucano-caju","mico-leao-dourado"].includes(id))return {support:"perch",spots:["header","title","card"],size:"small",motion:"still",baseline:0};
 if(["beija-flor-heliconia","borboleta-bromelia"].includes(id))return {support:"floating",spots:["margin","title"],size:"small",motion:"sway",baseline:0};
 return {support:"corner",spots:["margin","card"],size:"medium",motion:"sway",baseline:0};
}
export function readPlacement(raw:unknown,id=""):Placement {try {return validatePlacement(typeof raw==="string"?JSON.parse(raw):raw);}catch{return defaultPlacement(id);}}
export function chooseInhabitants<T extends {id:string;placement:Placement}>(assets:T[],spots:NatureSpot[],random= Math.random,limit=2,previous=""){
 const candidates=assets.flatMap(asset=>spots.filter(spot=>asset.placement.spots.includes(spot)).map(spot=>({asset,spot,key:asset.id+":"+spot})));
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 candidates.sort((a,b)=>Number(previous.includes(a.key))-Number(previous.includes(b.key)));
 const chosen:typeof candidates=[];
 for(const c of candidates)if(chosen.length<limit&&!chosen.some(x=>x.asset.id===c.asset.id||x.spot===c.spot))chosen.push(c);
 return chosen;
}
