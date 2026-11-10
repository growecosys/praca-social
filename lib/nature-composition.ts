import type {Placement,NatureSpot} from "./nature-placement";
export const EDITORIAL_SPECIMENS=new Set(["acervo-vitoria-regia","acervo-heliconia","acervo-bromelia","ipe-amarelo","beija-flor-heliconia","vitoria-regia-jacana","jabuticaba","mico-leao-dourado","borboleta-bromelia","tucano-caju"]);
export function fitsNatureComposition(asset:{id:string;placement:Placement},spot:NatureSpot,scene:string,allowed:string[]) {
 if(asset.id==="acervo-capim")return false; // Habitat is paired with a terrestrial visitor, never drawn alone.
 if(asset.id==="acervo-jacana"&&scene!=="waterline")return false;
 if(!asset.placement.spots.includes(spot))return false;
 const alternatives:Record<string,string>={"acervo-vitoria-regia":"vitoria-regia-jacana","acervo-heliconia":"beija-flor-heliconia","acervo-bromelia":"borboleta-bromelia","acervo-tucano":"tucano-caju","acervo-mico":"mico-leao-dourado","acervo-jacana":"vitoria-regia-jacana"};
 if(allowed.length&&!allowed.includes(asset.id)&&!allowed.includes(alternatives[asset.id]))return false;
 if(scene)return asset.id!=="lobo-guara"&&asset.placement.size!=="tiny";
 // The original compound cutouts need an editorial area; only the wolf is a small walker.
 if(EDITORIAL_SPECIMENS.has(asset.id))return false;
 return spot!=="header"||asset.placement.support==="ground"||asset.id==="lobo-guara"||asset.placement.size==="tiny";
}
export function natureDimensions(id:string,size:Placement["size"],scene:string){
 if(!scene)return {width:id==="lobo-guara"?156:size==="tiny"?96:size==="small"?180:240,height:id==="lobo-guara"?84:100};
 const native:Record<string,{width:number;height:number}>={
  "ipe-amarelo":{width:560,height:380},
  "jabuticaba":{width:230,height:360},
  "beija-flor-heliconia":{width:420,height:300},
  "vitoria-regia-jacana":{width:540,height:260},
  "mico-leao-dourado":{width:350,height:240},
  "borboleta-bromelia":{width:280,height:270},
  "tucano-caju":{width:240,height:340},
 };
 return native[id]||{width:420,height:320};
}

// Fixed flora is separate from visitors: never substitute a bird/plant composite.
export const FIXED_FLORA = new Set(["ipe-amarelo","jabuticaba","acervo-vitoria-regia","acervo-heliconia","acervo-bromelia"]);
export function chooseFixedFlora<T extends {id:string}>(assets:T[],allowed:string[]) {
 const ids=allowed.length?allowed:["acervo-bromelia","jabuticaba","ipe-amarelo"];
 return ids.map(id=>assets.find(a=>a.id===id&&FIXED_FLORA.has(a.id))).find(Boolean);
}
export function allowNatureVisitor(path:string,spot:string,roll:number) {
 return path!=="/"&&path!=="/mural"&&spot==="map"&&roll<0.2;
}

// Every ordinary page has a botanical home, even when it has no editorial anchor.
// The preference order is fixed per route; only active assets may be selected.
export function choosePageFlora<T extends {id:string}>(assets:T[],path:string) {
 const preferred=path.startsWith('/perfil')||path.startsWith('/u/')||path.startsWith('/placar')||path.startsWith('/p/')
  ?['jabuticaba','acervo-bromelia','ipe-amarelo']
  :path.startsWith('/escrever')||path.startsWith('/editar')||path.startsWith('/entrar')
   ?['acervo-heliconia','ipe-amarelo','acervo-bromelia']
   :['acervo-bromelia','acervo-vitoria-regia','jabuticaba'];
 return chooseFixedFlora(assets,[...preferred,...Array.from(FIXED_FLORA)]);
}
