export async function emptyEmailAccount(db:any,id:string){
 const user=await db.prepare('SELECT username,display_name,profile_complete,answers_json,deleted_at FROM users WHERE id=?').bind(id).first();
 if(!user||user.deleted_at||user.profile_complete||user.display_name!=='Nova pessoa'||!/^pessoa_[a-f0-9]{12}$/.test(user.username)||user.answers_json!=='[]')return false;
 const content=await db.prepare('SELECT id FROM posts WHERE owner_id=? UNION SELECT id FROM comments WHERE user_id=? LIMIT 1').bind(id,id).first();return !content;
}

export const EMAIL_TOKEN_TTL=15*60*1000;
export function normalizeEmail(value:unknown){
 if(typeof value!=='string')throw Error('Digite um e-mail válido.');
 const email=value.trim().toLowerCase();
 if(email.length>254||!/^([^\s@<>]+)@([^\s@<>]+)\.([^\s@<>]+)$/.test(email))throw Error('Digite um e-mail válido.');
 return email;
}
export function randomEmailCode(){const a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=4200000000);return String(a[0]%100000000).padStart(8,'0');}
export function randomEmailToken(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export async function emailDigest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function emailReady(env:any){return Boolean(env.RESEND_API_KEY&&env.AUTH_EMAIL_FROM);}
export function emailOrigin(env:any){const url=new URL(env.AUTH_EMAIL_ORIGIN||'https://praca-fs.greenpillbr.chatgpt.site');if(url.protocol!=='https:')throw Error('Origem de e-mail inválida.');return url.origin;}
export async function takeEmailLimit(db:any,key:string,max:number,now=Date.now()){
 const slot=Math.floor(now/(15*60*1000)),id=await emailDigest(key+':'+slot),expiry=new Date((slot+1)*15*60*1000).toISOString();
 return Boolean(await db.prepare('INSERT INTO auth_email_limits(id,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1 WHERE attempts<? RETURNING id').bind(id,expiry,max).first());
}
export async function requestEmailAccess(db:any,env:any,email:string,purpose:'login'|'link',userId:string|null,nonce:string,ip:string,send=fetch){
 if(!emailReady(env))throw Error('O acesso por e-mail ainda não está disponível. Entre com usuário e senha.');
 if(!await takeEmailLimit(db,'request-ip:'+ip,15)||!await takeEmailLimit(db,'request-email:'+email,3))return {sent:false};
 await db.batch([
  db.prepare('DELETE FROM auth_email_limits WHERE id IN (SELECT id FROM auth_email_limits WHERE expires_at<? LIMIT 200)').bind(new Date().toISOString()),
  db.prepare('DELETE FROM email_auth_tokens WHERE id IN (SELECT id FROM email_auth_tokens WHERE expires_at<? LIMIT 200)').bind(new Date(Date.now()-7*24*60*60*1000).toISOString()),
 ]);
 const existing=await db.prepare('SELECT user_id FROM account_emails WHERE email=?').bind(email).first();
 // Linking never signs into a different account or transfers another person's address.
 if(purpose==='link'&&existing&&existing.user_id!==userId&&!await emptyEmailAccount(db,existing.user_id))return {sent:false};
 const id=crypto.randomUUID(),token=randomEmailToken(),code=randomEmailCode(),expires=new Date(Date.now()+EMAIL_TOKEN_TTL).toISOString();
 await db.prepare('INSERT INTO email_auth_tokens(id,email,purpose,user_id,token_hash,code_hash,request_hash,expires_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,email,purpose,purpose==='link'?userId:existing?.user_id||null,await emailDigest(token),await emailDigest('code:'+code),await emailDigest(nonce),expires).run();
 const link=emailOrigin(env)+'/acesso-email#token='+token;
 try{
  const response=await send('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json','idempotency-key':'praca-auth/'+id},body:JSON.stringify({from:env.AUTH_EMAIL_FROM,to:[email],subject:purpose==='link'?'Confirme seu e-mail na Praça':'Seu link para entrar na Praça',text:`${purpose==='link'?'Confirme este e-mail para sua conta':'Entre na sua conta na Praça'}:\n\n${link}\n\nSe estiver no celular ou em outro navegador, volte à página onde pediu o acesso e digite este código: ${code}\n\nO código e o link valem por 15 minutos. Use um deles uma única vez. Abra no mesmo navegador em que fez o pedido. Se não pediu este e-mail, ignore esta mensagem.`})});
  if(!response.ok)throw Error('delivery');
 }catch{await db.prepare('DELETE FROM email_auth_tokens WHERE id=?').bind(id).run();throw Error('Não foi possível enviar o link agora. Tente novamente mais tarde.');}
 // Raw tokens and provider responses must never be returned or logged.
 return {sent:true};
}
export async function redeemEmailAccess(db:any,token:string,nonce:string,currentUserId:string|null,createAccount:(id:string,email:string,verifiedAt:string)=>Promise<void>){
 const isCode=/^[0-9]{8}$/.test(token);
 if((!isCode&&!/^[a-f0-9]{64}$/.test(token))||!/^[a-f0-9]{64}$/.test(nonce))throw Error('Link inválido. Solicite um novo link neste navegador.');
 if(isCode&&!await takeEmailLimit(db,'code-attempt:'+nonce,5))throw Error('Muitas tentativas de código. Aguarde 15 minutos.');
 const column=isCode?'code_hash':'token_hash';
 const now=new Date().toISOString(),tokenHash=await emailDigest(isCode?'code:'+token:token),requestHash=await emailDigest(nonce);
 const pending=await db.prepare(`SELECT purpose,user_id FROM email_auth_tokens WHERE ${column}=? AND request_hash=? AND consumed_at IS NULL AND expires_at>?`).bind(tokenHash,requestHash,now).first();
 if(pending?.purpose==='link'&&pending.user_id!==currentUserId)throw Error('Para confirmar seu e-mail, volte ao navegador onde sua conta está aberta.');
 const row=await db.prepare(`UPDATE email_auth_tokens SET consumed_at=? WHERE ${column}=? AND request_hash=? AND consumed_at IS NULL AND expires_at>? RETURNING email,purpose,user_id`).bind(now,tokenHash,requestHash,now).first();
 if(!row)throw Error('Este link expirou ou já foi usado. Solicite outro.');
 if(row.purpose==='link'){
  const owner=await db.prepare('SELECT user_id FROM account_emails WHERE email=?').bind(row.email).first();
  const transfer=owner&&owner.user_id!==row.user_id?String(owner.user_id):null;
  if(transfer&&!await emptyEmailAccount(db,transfer))throw Error('Este e-mail pertence a outra conta. Use outro endereço.');
  try{await db.batch([
   ...(transfer?[
    db.prepare("DELETE FROM account_emails WHERE user_id=? AND email=? AND EXISTS(SELECT 1 FROM users u WHERE u.id=? AND u.deleted_at IS NULL AND u.profile_complete=0 AND u.display_name='Nova pessoa' AND u.answers_json='[]' AND NOT EXISTS(SELECT 1 FROM posts WHERE owner_id=u.id) AND NOT EXISTS(SELECT 1 FROM comments WHERE user_id=u.id))").bind(transfer,row.email,transfer),
    db.prepare('DELETE FROM sessions WHERE user_id=?').bind(transfer),
    db.prepare('DELETE FROM email_auth_tokens WHERE user_id=?').bind(transfer),
    db.prepare("UPDATE users SET display_name='Conta excluída',secret_hash='',secret_salt='',deleted_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(now,transfer),
   ]:[]),
   db.prepare('INSERT INTO account_emails(user_id,email,verified_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at').bind(row.user_id,row.email,now),
   db.prepare('DELETE FROM pending_account_emails WHERE user_id=?').bind(row.user_id),
  ]);}catch{throw Error('Não foi possível vincular este e-mail. Solicite outro link.');}
  await db.prepare("INSERT INTO activity_events(user_id,action,entity_type,entity_id) VALUES (?,'email_verified','user',?)").bind(row.user_id,row.user_id).run();
  return {userId:String(row.user_id),linked:true};
 }
 let account=await db.prepare('SELECT user_id FROM account_emails WHERE email=?').bind(row.email).first();
 if(row.user_id&&account?.user_id!==row.user_id)throw Error('O e-mail desta conta foi alterado. Solicite outro link.');
 if(!account)throw Error('Este e-mail ainda não está vinculado a uma conta. Entre com seu usuário e senha ou recupere pelas perguntas secretas. Depois adicione o e-mail em Editar perfil.');
 if(await emptyEmailAccount(db,String(account.user_id)))throw Error('Foi encontrada uma conta vazia criada pelo acesso antigo por e-mail. Entre com o usuário da sua conta original ou recupere pelas perguntas secretas. Depois confirme este e-mail em Editar perfil para vinculá-lo à conta original.');
 return {userId:String(account.user_id),linked:false};
}
