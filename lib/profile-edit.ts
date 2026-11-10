export function validateProfileEdit(p:any){
 if(!p||typeof p!=='object')throw Error('Dados de perfil inválidos.');
 const displayName=typeof p.displayName==='string'?p.displayName.trim().replace(/\s+/g,' '):'';
 const username=typeof p.username==='string'?p.username.trim().replace(/^@/,'').toLowerCase():'';
 const bio=typeof p.bio==='string'?p.bio.trim():'';
 if(displayName.length<2||displayName.length>60)throw Error('Use um nome público de 2 a 60 caracteres.');
 if(!/^[a-z0-9_]{3,24}$/.test(username))throw Error('O identificador precisa ter 3 a 24 letras sem acento, números ou sublinhado.');
 if(bio.length>500)throw Error('A apresentação pode ter até 500 caracteres.');
 return {displayName,username,bio};
}
export async function saveProfileEdit(db:any,user:any,input:unknown){
 const p=validateProfileEdit(input),fields=Object.keys(p).filter(key=>p[key as keyof typeof p]!==user[key]);
 if(!fields.length)return p;
 const claim=(username:string)=>db.prepare('INSERT INTO profile_aliases(username,user_id) VALUES (?,?) ON CONFLICT(username) DO UPDATE SET user_id=CASE WHEN user_id=excluded.user_id THEN user_id ELSE NULL END').bind(username,user.id);
 try{await db.batch([
  claim(user.username),claim(p.username),
  db.prepare('UPDATE users SET display_name=?,username=?,bio=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(p.displayName,p.username,p.bio,user.id),
  db.prepare("INSERT INTO activity_events(user_id,action,entity_type,entity_id,metadata_json) VALUES (?,'profile_updated','user',?,?)").bind(user.id,user.id,JSON.stringify({fields})),
 ]);}catch{throw Error('Não foi possível salvar. Esse identificador pode já estar reservado.');}
 return p;
}
