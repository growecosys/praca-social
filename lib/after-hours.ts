// Shared, deterministic rules. The server alone persists results and spends materials.
export type Material='wood'|'bottles'|'wire'|'cells'|'cloth';
export type Stock=Record<Material,number>;
export type Design={hull:'bottles'|'wood';drive:'sail'|'propeller'|'spring';cells:number;trim:number};
export type Craft={id:string;name:string;design:Design};
export type Run={position:string;moves:number;bag:Stock;harvested:string[];solved:string[];weather:number};
export type GameState={v:1;materials:Stock;crafts:Craft[];equippedId:string|null;discoveries:string[];visited:string[];completed:boolean;expeditions:number;run:Run|null;journal:{text:string;at:string}[];receipts:{id:string;signature:string;at:number}[]};
export class GameError extends Error{constructor(message:string,public status=400){super(message)}}
export const MATERIALS:{id:Material;name:string;icon:string}[]=[{id:'wood',name:'Madeira',icon:'🪵'},{id:'bottles',name:'Garrafas',icon:'🫙'},{id:'wire',name:'Fio',icon:'🧵'},{id:'cells',name:'Baterias',icon:'🔋'},{id:'cloth',name:'Lona',icon:'🪁'}];
export const emptyStock=():Stock=>({wood:0,bottles:0,wire:0,cells:0,cloth:0});
export const WEATHER=[{name:'Brisa de leste',description:'Vento constante. Velas ganham alcance; o lago está tranquilo.',wind:3,current:0},{name:'Água agitada',description:'A corrente exige estabilidade. Uma carga bem distribuída faz diferença.',wind:1,current:2},{name:'Fim de tarde parado',description:'Quase sem vento. Uma hélice ou uma mola ajudam na travessia.',wind:0,current:1}];
export const DISCOVERIES=[{id:'lens',name:'Lente da estufa',description:'Limpa com cuidado, ainda concentra a luz do fim de tarde.',icon:'🔎'},{id:'dial',name:'Mostrador da ilhota',description:'Três marcas: folha, onda e sol. Era parte de uma estação.',icon:'🧭'},{id:'coil',name:'Bobina do moinho',description:'Ainda produz uma pequena corrente quando a roda gira.',icon:'🌀'},{id:'station',name:'O primeiro sinal',description:'A estação voltou a observar o Baldio. Tem alguém escutando do outro lado.',icon:'📡'}];
export const NODES=[
 {id:'camp',name:'Acampamento',short:'Campamento',x:13,y:79,icon:'tent',description:'A bancada, o depósito e um banco com vista para o Baldio. Aqui você guarda o que encontrou.'},
 {id:'grove',name:'Bosque torto',short:'Bosque',x:25,y:48,icon:'tree',description:'O vento deixou galhos e retalhos presos nas árvores. O caminho continua até uma estufa.'},
 {id:'scrap',name:'Pátio das sobras',short:'Pátio',x:35,y:85,icon:'gear',description:'Objetos esquecidos por quem achou que já não serviam para nada. Um ótimo lugar para começar uma invenção.'},
 {id:'jetty',name:'Ancoradouro',short:'Ancoradouro',x:49,y:64,icon:'boat',description:'A margem mais estreita do lago. Na outra ponta há uma ilhota com um pequeno instrumento de medição.'},
 {id:'greenhouse',name:'Estufa esquecida',short:'Estufa',x:39,y:23,icon:'glass',description:'Uma lente ficou presa no mecanismo de irrigação. Três válvulas controlam a pressão.'},
 {id:'island',name:'Ilhota do eco',short:'Ilhota',x:64,y:46,icon:'island',description:'Um mostrador antigo e sinos de vento. Você só consegue chegar com uma embarcação que passe no teste do lago.'},
 {id:'wheel',name:'Moinho de água',short:'Moinho',x:69,y:18,icon:'wheel',description:'A roda ainda gira. Dentro da caixa de controle, uma bobina espera o ritmo certo para ser liberada.'},
 {id:'station',name:'Estação do horizonte',short:'Estação',x:85,y:35,icon:'station',description:'Sem lente, mostrador e bobina, a estação permanece em silêncio. Talvez suas descobertas se encaixem aqui.'},
];
export const EDGES=[['camp','grove'],['camp','scrap'],['grove','greenhouse'],['grove','jetty'],['scrap','jetty'],['jetty','island'],['greenhouse','wheel'],['island','wheel'],['wheel','station']];
export const BAG_LIMIT=10;
export const stockCount=(s:Stock)=>MATERIALS.reduce((n,m)=>n+s[m.id],0);
export function initialGame():GameState{return {v:1,materials:{wood:4,bottles:4,wire:3,cells:2,cloth:2},crafts:[],equippedId:null,discoveries:[],visited:['camp'],completed:false,expeditions:0,run:null,journal:[],receipts:[]};}
export function validDesign(d:any):Design{if(!d||!['bottles','wood'].includes(d.hull)||!['sail','propeller','spring'].includes(d.drive)||!Number.isInteger(d.cells)||d.cells<0||d.cells>3||!Number.isInteger(d.trim)||d.trim<0||d.trim>4)throw new GameError('Projeto inválido. Confira as peças da bancada.');if(d.drive==='propeller'&&d.cells===0)throw new GameError('A hélice precisa de pelo menos uma bateria.');return {hull:d.hull,drive:d.drive,cells:d.cells,trim:d.trim};}
export function designCost(d:Design):Stock{const c=emptyStock();if(d.hull==='bottles'){c.bottles=3;c.wood=1;}else c.wood=3;c.cells=d.cells;if(d.drive==='sail'){c.cloth=2;c.wire=1;}if(d.drive==='propeller'){c.wire=2;c.bottles+=1;}if(d.drive==='spring'){c.wire=2;c.wood+=1;}return c;}
export function boatStats(design:Design,weather=0){const d=validDesign(design),w=WEATHER[weather]||WEATHER[0];const weight=(d.hull==='wood'?4:2)+d.cells+(d.drive==='spring'?2:1);const balance=4-Math.abs(2-d.trim)*2;const stability=Math.max(0,(d.hull==='wood'?7:5)+balance-Math.max(0,d.cells-1)-w.current);const thrust=d.drive==='sail'?2+w.wind*2:d.drive==='propeller'?5+d.cells*3:7;const range=Math.max(0,Math.round(thrust*3-weight+balance));const capacity=(d.hull==='wood'?6:5)-Math.max(0,d.cells-1);const success=range>=14&&stability>=5&&capacity>=2;
 return {weight,stability,range,capacity,success,reason:success?'Atravessou o lago com margem para a carga.':range<14?'Faltou alcance. Teste outra propulsão ou reduza o peso.':stability<5?'A embarcação perdeu estabilidade. Centralize a carga ou experimente outro casco.':'Não sobrou capacidade para a carga.'};}
export const canAfford=(have:Stock,cost:Stock)=>MATERIALS.every(m=>have[m.id]>=cost[m.id]);
function log(s:GameState,text:string,now:number){s.journal=[{text,at:new Date(now).toISOString()},...s.journal].slice(0,40);}
function discover(s:GameState,id:string,now:number){if(s.discoveries.includes(id))return;s.discoveries.push(id);log(s,'Descoberta: '+DISCOVERIES.find(d=>d.id===id)!.name+'.',now);}
const loot:Record<string,Partial<Stock>>={jetty:{wood:1,wire:1},grove:{wood:3,cloth:1},scrap:{bottles:3,wire:2,cells:1},greenhouse:{bottles:2,cloth:2},island:{cells:2,wire:2},wheel:{wood:2,wire:2},station:{cells:1}};
export function availableRoutes(s:GameState){if(!s.run)return[];return EDGES.filter(e=>e.includes(s.run!.position)).map(e=>e.find(id=>id!==s.run!.position)!);}
export function applyGameAction(input:GameState,p:any,now=Date.now()):GameState{
 const s=structuredClone(input);if(!p||typeof p.action!=='string')throw new GameError('Ação inválida.');
 const requireCamp=()=>{if(s.run)throw new GameError('Encerre a expedição antes de mexer no depósito e nas invenções.',409);};
 const requireRun=()=>{if(!s.run)throw new GameError('Comece uma expedição para explorar.',409);return s.run;};
 if(p.action==='craft'){
  requireCamp();if(s.crafts.length>=3)throw new GameError('Você já tem três invenções. Desmonte uma para abrir espaço.');const design=validDesign(p.design),cost=designCost(design);if(!canAfford(s.materials,cost))throw new GameError('Faltam materiais. Explore o bosque ou o pátio e traga o que encontrar.');const name=typeof p.name==='string'?p.name.trim().slice(0,48):'';if(!name)throw new GameError('Dê um nome à invenção.');for(const m of MATERIALS)s.materials[m.id]-=cost[m.id];const id=crypto.randomUUID();s.crafts.push({id,name,design});s.equippedId=id;log(s,'Você fabricou “'+name+'”.',now);
 }else if(p.action==='dismantle'){
  requireCamp();const c=s.crafts.find(c=>c.id===p.id);if(!c)throw new GameError('Invenção não encontrada.');const cost=designCost(c.design);for(const m of MATERIALS)s.materials[m.id]+=cost[m.id];s.crafts=s.crafts.filter(c=>c.id!==p.id);if(s.equippedId===p.id)s.equippedId=s.crafts[0]?.id||null;log(s,'“'+c.name+'” voltou a ser peças. Todos os materiais foram recuperados.',now);
 }else if(p.action==='equip'){
  requireCamp();if(p.id!==null&&!s.crafts.some(c=>c.id===p.id))throw new GameError('Invenção não encontrada.');s.equippedId=p.id;log(s,p.id?'Equipamento escolhido para a próxima saída.':'Você preparou uma saída sem embarcação.',now);
 }else if(p.action==='start'){
  requireCamp();s.run={position:'camp',moves:12,bag:emptyStock(),harvested:[],solved:[],weather:s.expeditions%WEATHER.length};s.expeditions++;log(s,'Expedição '+s.expeditions+' começou. '+WEATHER[s.run.weather].name+'.',now);
 }else if(p.action==='move'){
  const r=requireRun();if(!availableRoutes(s).includes(p.to))throw new GameError('Escolha um caminho ligado ao lugar onde você está.');if(r.moves<=0)throw new GameError('Seu fôlego acabou. Peça resgate para encerrar a saída.');const crossing=[r.position,p.to].includes('island');if(crossing){const c=s.crafts.find(c=>c.id===s.equippedId);if(!c)throw new GameError('A ilhota exige uma embarcação. Você pode voltar e fabricar uma na Oficina.');const result=boatStats(c.design,r.weather);if(!result.success)throw new GameError(result.reason+' Volte à Oficina para ajustar seu projeto.');if(stockCount(r.bag)>result.capacity)throw new GameError('A embarcação leva até '+result.capacity+' peças; sua mochila tem '+stockCount(r.bag)+'. Libere espaço no Inventário ou volte ao acampamento.');}r.position=p.to;r.moves--;if(!s.visited.includes(p.to))s.visited.push(p.to);log(s,'Você chegou: '+NODES.find(n=>n.id===p.to)!.name+'.',now);
 }else if(p.action==='gather'){
  const r=requireRun();if(!loot[r.position])throw new GameError('Não há materiais para recolher aqui.');if(r.harvested.includes(r.position))throw new GameError('Você já recolheu os materiais deste lugar nesta saída.');if(r.moves<=0)throw new GameError('Sem fôlego para recolher. Encerre a saída.');const found=loot[r.position];let room=BAG_LIMIT-stockCount(r.bag),taken=0;for(const m of MATERIALS){const n=Math.min(found[m.id]||0,room);r.bag[m.id]+=n;room-=n;taken+=n;}if(!taken)throw new GameError('A mochila está cheia. Volte ao acampamento ou libere espaço.');r.harvested.push(r.position);log(s,'Você recolheu '+taken+' peças em '+NODES.find(n=>n.id===r.position)!.name+'.',now);
 }else if(p.action==='drop'){
  const r=requireRun();if(!MATERIALS.some(m=>m.id===p.material)||!Number.isInteger(p.amount)||p.amount<1||p.amount>r.bag[p.material as Material])throw new GameError('Quantidade inválida.');r.bag[p.material as Material]-=p.amount;log(s,'Você abriu espaço na mochila.',now);
 }else if(p.action==='puzzle'){
  const r=requireRun();if(!['greenhouse','island','wheel','station'].includes(r.position))throw new GameError('Não há mecanismo aqui.');if(r.moves<=0)throw new GameError('Sem fôlego para tentar. Volte em outra saída.');if(r.solved.includes(r.position))throw new GameError('Mecanismo já resolvido nesta saída.');
  let correct=false;
  if(r.position==='greenhouse'){const a=p.answer;if(!Array.isArray(a)||a.length!==3||a.some(v=>!Number.isInteger(v)||v<0||v>3))throw new GameError('Ajuste as três válvulas.');correct=a[0]*2+a[1]*3+a[2]===10&&a[0]+a[1]+a[2]===4;}
  if(r.position==='island')correct=JSON.stringify(p.answer)===JSON.stringify(['leaf','wave','sun']);
  if(r.position==='wheel')correct=p.answer==='slow-fast-slow';
  if(r.position==='station'){if(!['lens','dial','coil'].every(id=>s.discoveries.includes(id)))throw new GameError('Ainda faltam peças únicas: procure na estufa, na ilhota e no moinho.');correct=JSON.stringify(p.answer)===JSON.stringify(['lens','dial','coil']);}
  if(!correct){r.moves--;log(s,'O mecanismo não abriu. Você perdeu 1 de fôlego; observe a pista e tente outra combinação.',now);return s;}
  r.solved.push(r.position);discover(s,{greenhouse:'lens',island:'dial',wheel:'coil',station:'station'}[r.position]!,now);if(r.position==='station'){s.completed=true;log(s,'A estação acendeu. Um sinal atravessou o Baldio: “Tem alguém aí?”. Você completou a primeira aventura.',now);}
 }else if(p.action==='return'){
  const r=requireRun();const rescued=r.position!=='camp';if(rescued&&p.confirm!==true)throw new GameError('O resgate recupera metade dos materiais da mochila. Confirme para voltar.');let count=0;for(const m of MATERIALS){const n=rescued?Math.floor(r.bag[m.id]/2):r.bag[m.id];s.materials[m.id]+=n;count+=n;}s.run=null;log(s,(rescued?'Você voltou de resgate':'Você encerrou a expedição')+' com '+count+' peças. Suas descobertas foram preservadas.',now);
 }else throw new GameError('Ação inválida.');
 return s;
}
