import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { transformWithEsbuild } from "vite";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
async function module(file,replace=s=>s,suffix="") {
 const source=replace(await readFile(new URL("../"+file,import.meta.url),"utf8"));
 const {code}=await transformWithEsbuild(source,file,{loader:"ts",target:"esnext"});
 return import("data:text/javascript;base64,"+Buffer.from(code+"\n//"+suffix).toString("base64"));
}
test("legacy reciprocal recovery is bounded, idempotent and preserves audit history",async()=>{
 const d=new DatabaseSync(":memory:");
 d.exec("CREATE TABLE pokes(id INTEGER PRIMARY KEY,sender_id TEXT,recipient_id TEXT,kind TEXT,status TEXT,created_at TEXT,resolved_at TEXT);CREATE TABLE connections(id INTEGER PRIMARY KEY,user_a TEXT,user_b TEXT,created_at TEXT,UNIQUE(user_a,user_b));CREATE TABLE activity_events(user_id TEXT,action TEXT,entity_type TEXT,entity_id TEXT,metadata_json TEXT);CREATE TABLE notifications(dedupe_key TEXT,read_at TEXT)");
 const insert=d.prepare("INSERT INTO pokes VALUES (?,?,?,'mystery',?,'2026-10-29 10:00:00',NULL)");
 for(const row of [[1,"a","b","seen"],[2,"b","a","archived"],[3,"a","c","seen"],[4,"a","d","seen"],[5,"d","a","declined"],[46,"a","e","seen"],[47,"e","a","seen"]])insert.run(...row);
 d.exec("INSERT INTO notifications VALUES ('connection:1',NULL),('connection:3',NULL)");
 const dialect=new SQLiteSyncDialect();
 globalThis.__connectionRecoveryDb={run:query=>query,async batch(queries){d.exec("BEGIN");try {for(const query of queries)d.exec(dialect.sqlToQuery(query).sql);d.exec("COMMIT");}catch(e){d.exec("ROLLBACK");throw e;}}};
 const replace=s=>s.replace('from "drizzle-orm"',`from "${import.meta.resolve("drizzle-orm")}"`).replace('import { getDb } from "../db";',"const getDb=()=>globalThis.__connectionRecoveryDb;");
 await (await module("lib/legacy-connections.ts",replace,"first")).recoverLegacyConnections();
 await (await module("lib/legacy-connections.ts",replace,"second-isolate")).recoverLegacyConnections();
 assert.deepEqual(d.prepare("SELECT user_a,user_b FROM connections").all().map(x=>({...x})),[{user_a:"a",user_b:"b"}]);
 assert.equal(d.prepare("SELECT count(*) n FROM activity_events").get().n,1);
 assert.equal(d.prepare("SELECT status FROM pokes WHERE id=1").get().status,"archived");
 assert.equal(d.prepare("SELECT status FROM pokes WHERE id=3").get().status,"seen");
 assert.equal(d.prepare("SELECT count(*) n FROM pokes").get().n,7);
 assert.ok(d.prepare("SELECT read_at FROM notifications WHERE dedupe_key='connection:1'").get().read_at);
 assert.equal(d.prepare("SELECT read_at FROM notifications WHERE dedupe_key='connection:3'").get().read_at,null);
 delete globalThis.__connectionRecoveryDb;d.close();
});
test("connection strength counts attended days, never repeated pokes or manual archives",async()=>{
 const {connectionEdges}=await module("lib/connection-strength.ts");
 const pair=[{userA:"a",userB:"b"}];
 const interaction=(id,status,day,kind="thread")=>({id,senderId:"a",recipientId:"b",status,kind,createdAt:`2026-10-${day} 10:00:00`});
 const items=[interaction(1,"completed","01"),interaction(2,"completed","01"),interaction(3,"archived","02"),interaction(4,"pending","03"),interaction(5,"attended","04","mystery")];
 assert.equal(connectionEdges(pair,items,[])[0].level,1);
 const response=[{entityId:"3",metadataJson:'{"userAction":"attend"}'}];
 assert.deepEqual(connectionEdges(pair,items,response)[0],{a:"a",b:"b",days:2,level:2});
 assert.equal(connectionEdges(pair,[...items,...["05","06","07"].map((day,i)=>interaction(6+i,"completed",day))],response)[0].level,3);
 assert.equal(connectionEdges(pair,[],[])[0].level,1);
});
