import { and, eq, sql, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { circles, circleMembers, circleEntries, activityEvents,users } from "../../../db/schema";
import { requirePracaUser } from "../../../lib/praca-auth";
import { connect, connectedPeople } from "../../../lib/connections";
import { notify } from "../../../lib/notifications";
export async function POST(request: Request) {
 if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"Origem inválida."},{status:403});
 const auth=await requirePracaUser(); if(auth.error)return auth.error;
 const user=auth.user!; const db=getDb();
 const p=await request.json().catch(()=>null); if(!p)return Response.json({error:"Dados inválidos."},{status:400});
 const fail=(error:string,status=400)=>Response.json({error},{status});
 const text=(v:unknown,max=2000)=>typeof v==="string"?v.trim().slice(0,max):"";
 if(p.action==="create") {
  const name=text(p.name,100),mission=text(p.mission),success=text(p.success);
  if(!name||!mission||!success||!["help","solve","make"].includes(p.kind))return fail("Preencha nome, missão e condição de sucesso.");
  const [circle]=await db.insert(circles).values({ownerId:user.id,name,mission,success,kind:p.kind,emblem:text(p.emblem,12)||"🌱",visibility:p.visibility==="private"?"private":"public"}).returning();
  await db.insert(circleMembers).values({circleId:circle.id,userId:user.id,status:"active"});
  const eligible=await connectedPeople(user.id);
  for(const person of eligible.filter(x=>Array.isArray(p.invites)&&p.invites.includes(x.id))) {
   await db.insert(circleMembers).values({circleId:circle.id,userId:person.id});
   await notify({recipientId:person.id,actorId:user.id,type:"circle",title:`Convite: ${name}`,body:mission,href:`/circulos/${circle.id}`,dedupeKey:`circle-invite:${circle.id}:${person.id}`});
  }
  await db.insert(activityEvents).values({userId:user.id,action:"circle_created",entityType:"circle",entityId:String(circle.id)});
  return Response.json({href:`/circulos/${circle.id}`});
 }
 const id=Number(p.circleId); const circle=(await db.select().from(circles).where(eq(circles.id,id)))[0];if(!circle)return fail("Círculo não encontrado.",404);
 if(circle.deletedAt){if(p.action!=="restore"||circle.ownerId!==user.id)return fail("Círculo excluído.",404);await db.update(circles).set({deletedAt:null}).where(eq(circles.id,id));await db.insert(activityEvents).values({userId:user.id,action:"circle_restored",entityType:"circle",entityId:String(id)});return Response.json({ok:true,href:`/circulos/${id}`});}
 const member=(await db.select().from(circleMembers).where(and(eq(circleMembers.circleId,id),eq(circleMembers.userId,user.id))))[0];
 const owner=circle.ownerId===user.id,active=member?.status==="active";
 const membership=(uid:string)=>and(eq(circleMembers.circleId,id),eq(circleMembers.userId,uid));
 if(p.action==="delete"){if(!owner)return fail("Somente o responsável pode excluir.",403);await db.update(circles).set({deletedAt:sql`CURRENT_TIMESTAMP`}).where(eq(circles.id,id));await db.insert(activityEvents).values({userId:user.id,action:"circle_deleted",entityType:"circle",entityId:String(id)});return Response.json({ok:true,href:"/conexoes?view=circles"});}
 if(p.action==="chat"){if(!owner||!active)return fail("Somente o responsável pode abrir a conversa.",403);await db.update(circles).set({chatEnabled:p.enabled===true}).where(eq(circles.id,id));}
 else if(p.action==="request") {if(member&&["active","invited","requested"].includes(member.status))return fail("Você já participa ou tem um convite ou pedido em aberto.");if(circle.visibility!=="public")return fail("Círculo reservado.",403);await db.insert(circleMembers).values({circleId:id,userId:user.id,status:"requested"}).onConflictDoUpdate({target:[circleMembers.circleId,circleMembers.userId],set:{status:"requested"}});}
 else if(p.action==="accept"||p.action==="decline") {
  if(member?.status!=="invited")return fail("Convite indisponível.");
  await db.update(circleMembers).set({status:p.action==="accept"?"active":"declined"}).where(membership(user.id));
  if(p.action==="accept") {const others=await db.select().from(circleMembers).where(and(eq(circleMembers.circleId,id),eq(circleMembers.status,"active")));for(const other of others)await connect(user.id,other.userId);}
 }
 else if(p.action==="leave") {if(owner)return fail("Transfira a responsabilidade antes de sair.");await db.update(circleMembers).set({status:"left"}).where(membership(user.id));}
 else if(p.action==="invite") {
  if(!owner)return fail("Somente o responsável pode convidar.",403);
  if(!(await connectedPeople(user.id)).some(x=>x.id===p.userId))return fail("Convide uma pessoa conectada.");
  if((await db.select().from(circleMembers).where(membership(p.userId)))[0]?.status==="active")return fail("Esta pessoa já participa.");
  await db.insert(circleMembers).values({circleId:id,userId:p.userId,status:"invited"}).onConflictDoUpdate({target:[circleMembers.circleId,circleMembers.userId],set:{status:"invited"}});
  await notify({recipientId:p.userId,actorId:user.id,type:"circle",title:`Convite: ${circle.name}`,href:`/circulos/${id}`,dedupeKey:`circle-invite:${id}:${p.userId}`});
 }
 else if(p.action==="approve"||p.action==="remove"||p.action==="transfer") {
  if(!owner||p.userId===user.id)return fail("Ação não permitida.",403);
  const target=(await db.select().from(circleMembers).where(membership(p.userId)))[0];if(!target)return fail("Participante não encontrado.");
  if(p.action==="approve"&&target.status!=="requested")return fail("Pedido indisponível.");
  if(!(await db.select().from(users).where(and(eq(users.id,p.userId),isNull(users.deletedAt)))).length)return fail("Conta indisponível.");
  if(p.action==="transfer") {if(target.status!=="active")return fail("Escolha um participante ativo.");await db.update(circles).set({ownerId:p.userId}).where(eq(circles.id,id));}
  else {await db.update(circleMembers).set({status:p.action==="approve"?"active":"removed"}).where(membership(p.userId));if(p.action==="approve")await connect(user.id,p.userId);}
 }
 else if(p.action==="edit") {
  if(!owner)return fail("Somente o responsável pode editar.",403);
  const name=text(p.name,100),mission=text(p.mission),success=text(p.success);if(!name||!mission||!success)return fail("Preencha a missão completa.");
  await db.update(circles).set({name,mission,success,emblem:text(p.emblem,12)||"🌱"}).where(eq(circles.id,id));
 }
 else if(p.action==="status") {if(!owner||!["gathering","active","completed","interrupted","archived"].includes(p.status))return fail("Ação não permitida.",403);if(p.status==="completed"&&!text(p.body))return fail("Registre o resultado antes de concluir.");await db.update(circles).set({status:p.status}).where(eq(circles.id,id));if(text(p.body))await db.insert(circleEntries).values({circleId:id,authorId:user.id,kind:"result",body:text(p.body)});}
 else if(p.action==="entry") {if(!active||["archived","completed","interrupted"].includes(circle.status))return fail("Círculo encerrado ou participação necessária.",403);if(!text(p.body)||!["task","update","result"].includes(p.kind))return fail("Escreva a contribuição.");await db.insert(circleEntries).values({circleId:id,authorId:user.id,kind:p.kind,body:text(p.body)});}
 else if(p.action==="task") {
  if(!active||["archived","completed","interrupted"].includes(circle.status))return fail("Círculo encerrado ou participação necessária.",403);const entry=(await db.select().from(circleEntries).where(and(eq(circleEntries.id,Number(p.entryId)),eq(circleEntries.circleId,id))))[0];
  if(!entry||entry.kind!=="task")return fail("Tarefa não encontrada.");if(entry.assigneeId&&entry.assigneeId!==user.id&&!owner)return fail("A tarefa está com outra pessoa.");
  if(!["claim","release","done"].includes(p.operation))return fail("Ação inválida.");await db.update(circleEntries).set({assigneeId:p.operation==="release"?null:user.id,status:p.operation==="done"?"done":p.operation==="release"?"available":"progress"}).where(eq(circleEntries.id,entry.id));
 }else return fail("Ação inválida.");
 await db.insert(activityEvents).values({userId:user.id,action:`circle_${p.action}`,entityType:"circle",entityId:String(id),metadataJson:JSON.stringify({request:p,previous:circle})});
 return Response.json({ok:true});
}
