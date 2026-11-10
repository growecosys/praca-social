import {env} from 'cloudflare:workers';
import {hashSecret,normalizeRecoveryAnswer,verifySecret,clearSession} from '../../../../lib/praca-auth';
import {RECOVERY_QUESTIONS} from '../../../../lib/recovery-questions';
const invalid='Dados de recuperação inválidos. Confira o usuário, a pergunta e a resposta.';
const headers={'cache-control':'no-store','referrer-policy':'no-referrer'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
// Never reveal which questions an account chose, nor whether it exists.
export async function GET(){return reply({questions:RECOVERY_QUESTIONS});}
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return reply({error:'Origem inválida.'},403);
 const raw=await request.text();if(raw.length>4096)return reply({error:'Pedido inválido.'},400);
 let p:any;try{p=JSON.parse(raw);}catch{return reply({error:'Pedido inválido.'},400);}
 if(!p||typeof p!=='object')return reply({error:'Pedido inválido.'},400);
 const username=typeof p.username==='string'?p.username.trim().toLowerCase().replace(/^@/,''):'';
 const question=typeof p.question==='string'?p.question:'';
 const answer=typeof p.answer==='string'?normalizeRecoveryAnswer(p.answer):'';
 const secret=typeof p.newSecret==='string'?p.newSecret:'';
 if(!/^[a-z0-9_-]{3,24}$/.test(username)||!Object.hasOwn(RECOVERY_QUESTIONS,question)||!answer||answer.length>256)return reply({error:invalid},401);
 if(secret.length<8||secret.length>256||secret!==p.confirmSecret)return reply({error:'Digite e confirme uma nova senha de 8 a 256 caracteres.'},400);
 const db=env.DB,now=new Date().toISOString(),deadline=new Date(Date.now()+30*60*1000).toISOString();
 // Reserve an attempt BEFORE checking secrets. Concurrent requests share the same five-attempt window.
 const reserved=await db.prepare(`UPDATE account_recovery SET attempts=CASE WHEN locked_until>? THEN attempts+1 ELSE 1 END,locked_until=CASE WHEN locked_until>? THEN locked_until ELSE ? END,updated_at=CURRENT_TIMESTAMP WHERE user_id=(SELECT id FROM users WHERE username=?) AND (locked_until IS NULL OR locked_until<=? OR attempts<5) RETURNING user_id`).bind(now,now,deadline,username,now).first();
 if(!reserved){
  // Do equivalent secret work for missing accounts; never echo secrets or question metadata.
  await verifySecret(answer,'recovery-dummy-salt','0'.repeat(64));
  return reply({error:invalid+' Se já tentou várias vezes, aguarde 30 minutos.'},401);
 }
 const recovery=await db.prepare('SELECT question_1,answer_1_hash,answer_1_salt,question_2,answer_2_hash,answer_2_salt FROM account_recovery WHERE user_id=?').bind(reserved.user_id).first();
 const slot=recovery?.question_1===question?1:recovery?.question_2===question?2:0;
 const valid=await verifySecret(answer,slot?String(recovery![`answer_${slot}_salt`]):'recovery-dummy-salt',slot?String(recovery![`answer_${slot}_hash`]):'0'.repeat(64));
 if(!slot||!valid)return reply({error:invalid},401);
 const secured=await hashSecret(secret);
 await db.batch([
  db.prepare('UPDATE users SET secret_hash=?,secret_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(secured.hash,secured.salt,reserved.user_id),
  db.prepare('DELETE FROM sessions WHERE user_id=?').bind(reserved.user_id),
  db.prepare('UPDATE account_recovery SET attempts=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(reserved.user_id),
  db.prepare("INSERT INTO activity_events(user_id,action,entity_type,entity_id) VALUES (?,'access_recovered','user',?)").bind(reserved.user_id,reserved.user_id),
 ]);
 await clearSession();
 return reply({ok:true,next:'/entrar',message:'Senha alterada. As sessões anteriores foram encerradas. Entre com sua nova senha.'});
}
