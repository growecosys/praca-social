import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {createSession,clearSession,getPracaUser} from '../../../../lib/praca-auth';
import {normalizeEmail,emailReady,randomEmailToken,requestEmailAccess,redeemEmailAccess,takeEmailLimit} from '../../../../lib/email-access';
const COOKIE='praca_email_request';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','referrer-policy':'no-referrer'}});
export async function GET(){return reply({available:emailReady(env)});}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Origem inválida.'},403);
 const raw=await request.text();if(raw.length>2048)return reply({error:'Pedido inválido.'},400);
 let p:any;try{p=JSON.parse(raw);}catch{return reply({error:'Pedido inválido.'},400);}
 if(!p||!['request','consume'].includes(p.action))return reply({error:'Pedido inválido.'},400);
 const jar=await cookies(),user=await getPracaUser(),db=env.DB,ip=request.headers.get('cf-connecting-ip')||'unknown';
 try{
  if(p.action==='request'){
   if(!emailReady(env))return reply({error:'O acesso por e-mail ainda não está disponível. Entre com usuário e senha.'},503);
   const purpose=p.purpose==='link'?'link':'login';if(purpose==='link'&&!user)return reply({error:'Entre na sua conta para vincular um e-mail.'},401);
   const email=normalizeEmail(p.email),nonce=randomEmailToken();
   const delivery=await requestEmailAccess(db,env,email,purpose,user?.id||null,nonce,ip);
   if(delivery.sent&&purpose==='link')await db.prepare('INSERT INTO pending_account_emails(user_id,email) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email').bind(user!.id,email).run();
   if(delivery.sent)jar.set(COOKIE,nonce,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:15*60});
   return reply({ok:true,message:'Se o pedido puder ser atendido, você receberá um link. Abra neste mesmo navegador. Aguarde alguns minutos antes de pedir outro.'});
  }
  if(!await takeEmailLimit(db,'consume-ip:'+ip,30))return reply({error:'Muitas tentativas. Aguarde alguns minutos.'},429);
  const result=await redeemEmailAccess(db,typeof p.token==='string'?p.token:'',jar.get(COOKIE)?.value||'',user?.id||null,async()=>{throw Error('Crie sua conta pelo formulário de cadastro.');});
  jar.set(COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
  if(result.linked)return reply({ok:true,next:user?.profileComplete?'/perfil/editar':'/perfil/concluir',message:'E-mail confirmado.'});
  await clearSession();await createSession(result.userId);
  const account=await db.prepare('SELECT profile_complete FROM users WHERE id=?').bind(result.userId).first();
  await db.prepare("INSERT INTO activity_events(user_id,action,entity_type,entity_id) VALUES (?,'email_signed_in','user',?)").bind(result.userId,result.userId).run();
  return reply({ok:true,next:account?.profile_complete?'/mural':'/perfil/editar'});
 }catch(e){return reply({error:e instanceof Error?e.message:'Não foi possível concluir o acesso.'},400);}
}
