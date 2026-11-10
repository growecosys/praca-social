export function registrationFields(p:any){
 if(!p||typeof p!=='object')throw Error('Dados de cadastro inválidos.');
 const displayName=typeof p.displayName==='string'?p.displayName.trim().replace(/\s+/g,' '):'';
 const username=typeof p.username==='string'?p.username.trim().toLowerCase().replace(/^@/,''):'';
 const email=typeof p.email==='string'?p.email.trim().toLowerCase():'';
 const secret=typeof p.secret==='string'?p.secret:'';
 if(displayName.length<2||displayName.length>60)throw Error('Use um nome público de 2 a 60 caracteres.');
 if(!/^[a-z0-9_]{3,24}$/.test(username))throw Error('Use um usuário com 3 a 24 letras sem acento, números ou sublinhado.');
 if(email.length>254||!/^([^\s@<>]+)@([^\s@<>]+)\.([^\s@<>]+)$/.test(email))throw Error('Digite um e-mail válido.');
 if(secret.length<8||secret.length>256)throw Error('Use uma senha de 8 a 256 caracteres.');
 return {displayName,username,email,secret};
}
export async function createPasswordAccount(db:any,p:any,hash:(value:string)=>Promise<{hash:string;salt:string}>,normalize:(value:string)=>string){
 const fields=registrationFields(p),id=crypto.randomUUID();
 const duplicate=await db.prepare('SELECT id FROM users WHERE username=? UNION SELECT user_id AS id FROM profile_aliases WHERE username=? UNION SELECT user_id AS id FROM account_emails WHERE email=? LIMIT 1').bind(fields.username,fields.username,fields.email).first();
 if(duplicate)throw Error('Não foi possível criar com esses dados. Se já tem conta, use Entrar ou Recuperar conta.');
 const secured=await hash(fields.secret);
 const statements=[
  db.prepare('INSERT INTO users(id,username,display_name,secret_hash,secret_salt) VALUES (?,?,?,?,?)').bind(id,fields.username,fields.displayName,secured.hash,secured.salt),
  db.prepare('INSERT INTO pending_account_emails(user_id,email) VALUES (?,?)').bind(id,fields.email),
  db.prepare("INSERT INTO activity_events(user_id,action,entity_type,entity_id) VALUES (?,'account_created','user',?)").bind(id,id),
 ];
 // Legacy clients may still send questions. They are no longer required for onboarding.
 const questions=new Set(['place','teacher','object','book','path','meal']);
 if(p.question1||p.answer1||p.question2||p.answer2){
  const a=normalize(typeof p.answer1==='string'?p.answer1:''),b=normalize(typeof p.answer2==='string'?p.answer2:'');
  if(!questions.has(p.question1)||!questions.has(p.question2)||p.question1===p.question2||a.length<2||b.length<2||a.length>256||b.length>256)throw Error('Confira as perguntas e respostas de recuperação.');
  const s1=await hash(a),s2=await hash(b);
  statements.push(db.prepare('INSERT INTO account_recovery(user_id,question_1,answer_1_hash,answer_1_salt,question_2,answer_2_hash,answer_2_salt) VALUES (?,?,?,?,?,?,?)').bind(id,p.question1,s1.hash,s1.salt,p.question2,s2.hash,s2.salt));
 }
 try{await db.batch(statements);}catch{throw Error('Não foi possível criar com esses dados. Confira o usuário e tente novamente.');}
 return {id,email:fields.email};
}
export async function findPasswordAccount(db:any,value:unknown){
 const identifier=typeof value==='string'?value.trim().toLowerCase().replace(/^@/,''):'';
 if(!identifier||identifier.length>254)return null;
 if(identifier.includes('@'))return db.prepare('SELECT u.* FROM users u JOIN account_emails e ON e.user_id=u.id WHERE e.email=? AND u.deleted_at IS NULL LIMIT 1').bind(identifier).first();
 return db.prepare('SELECT * FROM users WHERE deleted_at IS NULL AND (username=? OR id=(SELECT user_id FROM profile_aliases WHERE username=?)) LIMIT 1').bind(identifier,identifier).first();
}
