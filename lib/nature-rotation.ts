// One policy for the entire active catalog. Position is fixed; species rotates per visit.
const plants=new Set(['ipe-amarelo','jabuticaba','acervo-vitoria-regia','acervo-heliconia','acervo-bromelia']);
const water=new Set(['vitoria-regia-jacana','acervo-vitoria-regia','acervo-jacana']);
const smallAnimals=new Set(['lobo-guara','acervo-irara','acervo-jabuti','acervo-beija-flor','acervo-borboleta','acervo-tucano','acervo-mico']);
export type NatureRole='hero'|'background'|'waterline'|'visitor';
export function natureCandidates<T extends {id:string}>(pool:T[],role:NatureRole,path:string,spot='title') {
 return pool.filter(a=>{
  if(a.id==='acervo-capim')return false;
  if(path==='/entrar'&&role!=='visitor')return plants.has(a.id);
  if(path==='/')return role==='hero'&&plants.has(a.id);
  if(path==='/conexoes')return role!=='visitor'&&plants.has(a.id);
  if(role==='waterline')return water.has(a.id);
  if(role==='visitor'){
   if(path==='/placar')return false;
   if(spot==='map')return false;
   if(spot==='header')return (path==='/escrever'||path==='/jogar')&&['lobo-guara','acervo-irara','acervo-jabuti'].includes(a.id);
   if(spot==='map'||spot==='button')return ['lobo-guara','acervo-irara','acervo-jabuti'].includes(a.id);
   return smallAnimals.has(a.id);
  }
  return plants.has(a.id)||(!smallAnimals.has(a.id)&&a.id!=='acervo-jacana');
 });
}
export function rotateNature<T extends {id:string}>(pool:T[],previous:string,used:string[],random= Math.random):T|undefined {
 const available=pool.filter(a=>!used.includes(a.id));
 const fresh=available.filter(a=>a.id!==previous);
 const choices=fresh.length?fresh:available;
 return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
}
export function natureScale(id:string,role:NatureRole) {
 if(role==='visitor'){
  if(id==='acervo-borboleta')return {width:72,height:64,opacity:1};
  if(id==='acervo-beija-flor')return {width:108,height:82,opacity:1};
  if(id==='acervo-jabuti')return {width:128,height:88,opacity:1};
  return {width:id==='lobo-guara'?180:155,height:104,opacity:1};
 }
 if(role==='waterline')return {width:680,height:350,opacity:1};
 if(role==='hero')return {width:580,height:480,opacity:1};
 return {width:620,height:480,opacity:.48};
}
