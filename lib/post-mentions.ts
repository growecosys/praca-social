import {mentionedUsers} from './inline-text';
export function mentionStatements(db:any,blocks:any[],actor:{id:string;displayName:string},slug:string,title:string){
 return mentionedUsers(blocks).map(({username,blockId})=>db.prepare(`INSERT INTO notifications(recipient_id,actor_id,type,title,body,href,dedupe_key) SELECT u.id,?,'mention',?,?,?,'mention:'||p.id||':'||u.id FROM users u JOIN posts p ON p.slug=? AND p.owner_id=? WHERE u.profile_complete=1 AND u.id<>? AND (u.username=? OR u.id=(SELECT user_id FROM profile_aliases WHERE username=?)) ON CONFLICT(dedupe_key) DO NOTHING`).bind(actor.id,`${actor.displayName} mencionou você`.slice(0,140),title.slice(0,240),`/p/${slug}#bloco-${encodeURIComponent(blockId)}`.slice(0,240),slug,actor.id,actor.id,username,username));
}
export function normalizePostBlocks(value:unknown){
 const types=new Set(['paragraph','heading','quote','embed','image']);if(!Array.isArray(value)||!value.length||value.length>200)throw Error('Adicione um conteúdo válido.');
 const ids=new Set<string>();let total=0;
 const blocks=value.map(b=>{if(!b||typeof b!=='object'||!types.has(b.type)||typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(b.id)||ids.has(b.id))throw Error('Conteúdo inválido.');ids.add(b.id);const field=(key:string,max:number)=>{if(b[key]===undefined)return undefined;if(typeof b[key]!=='string')throw Error('Conteúdo inválido.');return b[key].slice(0,max);};const text=field('text',30000);total+=text?.length||0;return {id:b.id,type:b.type,text,url:field('url',2048),caption:field('caption',500),mediaType:field('mediaType',100),...(b.inlineFormat==='markdown'?{inlineFormat:'markdown' as const}:{})};});
 if(total>100000)throw Error('O texto pode ter até 100 mil caracteres.');mentionedUsers(blocks);return blocks;
}
