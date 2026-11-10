// Keep a non-identifying tombstone so community records and their foreign keys remain valid.
export async function deleteAccount(db:any,userId:string,confirmation:string){
 if(confirmation!=='DELETAR CONTA')throw Error('Escreva DELETAR CONTA exatamente como aparece.');
 const user=await db.prepare('SELECT id,username,deleted_at FROM users WHERE id=?').bind(userId).first();if(!user||user.deleted_at)throw Error('Conta indisponível.');
 const now=new Date().toISOString(),closed='excluida_'+crypto.randomUUID().replaceAll('-','');
 await db.batch([
  db.prepare('INSERT INTO profile_aliases(username,user_id) VALUES (?,?) ON CONFLICT(username) DO NOTHING').bind(user.username,userId),
  db.prepare("UPDATE users SET username=?,display_name='Conta excluída',bio='',secret_hash='',secret_salt='',profile_complete=0,answers_json='[]',role_title='',manifesto='',avatar_json='{}',avatar_image_key=NULL,deleted_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL").bind(closed,now,userId),
  db.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId),
  db.prepare('DELETE FROM email_auth_tokens WHERE user_id=? OR email IN (SELECT email FROM account_emails WHERE user_id=? UNION SELECT email FROM pending_account_emails WHERE user_id=?)').bind(userId,userId,userId),
  db.prepare('DELETE FROM account_emails WHERE user_id=?').bind(userId),db.prepare('DELETE FROM pending_account_emails WHERE user_id=?').bind(userId),db.prepare('DELETE FROM account_recovery WHERE user_id=?').bind(userId),
  db.prepare('DELETE FROM role_generations WHERE user_id=?').bind(userId),db.prepare('DELETE FROM avatar_generations WHERE user_id=?').bind(userId),
  db.prepare('DELETE FROM assistant_usage WHERE user_id=?').bind(userId),
  db.prepare("UPDATE posts SET author='Conta excluída' WHERE owner_id=?").bind(userId),db.prepare("UPDATE post_revisions SET author='Conta excluída' WHERE post_id IN (SELECT id FROM posts WHERE owner_id=?)").bind(userId),
  db.prepare("UPDATE comments SET display_name='Conta excluída',anonymous=1 WHERE user_id=?").bind(userId),
  db.prepare('DELETE FROM notifications WHERE recipient_id=?').bind(userId),
  db.prepare("UPDATE notifications SET title='Uma conta excluída interagiu com você',body='' WHERE actor_id=?").bind(userId),
  db.prepare("UPDATE activity_events SET metadata_json='{}' WHERE user_id=?").bind(userId),
  db.prepare("UPDATE pokes SET status='completed',resolved_at=CURRENT_TIMESTAMP WHERE (sender_id=? OR recipient_id=?) AND status IN ('pending','accepted')").bind(userId,userId),
  db.prepare("INSERT INTO activity_events(user_id,action,entity_type,entity_id) VALUES (?,'account_deleted','user',?)").bind(userId,userId),
 ]);
}
