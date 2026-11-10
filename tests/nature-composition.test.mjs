import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {transformWithEsbuild} from "vite";
test("compound specimens stay out of tiny ledges and honor composition and approved places",async()=>{
 const source=await readFile(new URL("../lib/nature-composition.ts",import.meta.url),"utf8");
 const {code}=await transformWithEsbuild(source,"nature-composition.ts",{loader:"ts",target:"esnext"});
 const {fitsNatureComposition:fits,natureDimensions:dimensions}=await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
 const asset=(id,spots,size="small")=>({id,placement:{support:"perch",spots,size,motion:"still",baseline:0}});
 assert.equal(fits(asset("tucano-caju",["header","title"]),"header","",[]),false);
 assert.equal(fits(asset("tucano-caju",["title"]),"title","companion",["tucano-caju"]),true);
 assert.equal(fits(asset("tucano-caju",["title"]),"card","companion",["tucano-caju"]),false);
 assert.equal(fits(asset("tucano-caju",["title"]),"title","branch",["ipe-amarelo"]),false);
 assert.equal(fits(asset("lobo-guara",["header","card"]),"header","",[]),true);
 assert.equal(fits(asset("lobo-guara",["card"]),"card","hero",[]),false);
 assert.ok(dimensions("lobo-guara","small","").height>=80);
 assert.ok(dimensions("tucano-caju","small","companion").height>dimensions("mico-leao-dourado","small","companion").height);
 assert.ok(dimensions("vitoria-regia-jacana","small","waterline").width>dimensions("borboleta-bromelia","small","waterline").width);
 assert.equal(fits(asset("new-plant",["card"]),"card","hero",[]),true);
});

test('fixed plants stay stable and the home and headers never receive visitors',async()=>{
 const {code}=await transformWithEsbuild(await readFile(new URL('../lib/nature-composition.ts',import.meta.url),'utf8'),'nature-composition.ts',{loader:'ts',target:'esnext'});
 const {chooseFixedFlora,allowNatureVisitor}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const pool=[{id:'lobo-guara'},{id:'beija-flor-heliconia'},{id:'ipe-amarelo'},{id:'acervo-bromelia'}];
 assert.equal(chooseFixedFlora(pool,['lobo-guara','ipe-amarelo']).id,'ipe-amarelo');
 assert.equal(chooseFixedFlora(pool,['beija-flor-heliconia']),undefined);
 assert.equal(chooseFixedFlora(pool,['acervo-bromelia']).id,'acervo-bromelia');
 assert.equal(allowNatureVisitor('/','map',0),false);
 assert.equal(allowNatureVisitor('/mural','map',0),false);
 assert.equal(allowNatureVisitor('/perfil','header',0),false);
 assert.equal(allowNatureVisitor('/conexoes','map',0.1),true);
 assert.equal(allowNatureVisitor('/conexoes','map',0.5),false);
});

test('ordinary routes retain a stable plant without relying on visitor probability or explicit anchors',async()=>{
 const {code}=await transformWithEsbuild(await readFile(new URL('../lib/nature-composition.ts',import.meta.url),'utf8'),'nature-composition.ts',{loader:'ts',target:'esnext'});
 const {choosePageFlora}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const plants=[{id:'jabuticaba'},{id:'acervo-bromelia'},{id:'acervo-heliconia'},{id:'lobo-guara'}];
 for(const route of ['/perfil','/u/test','/escrever','/editar/test','/placar','/conexoes','/circulos/novo','/entrar','/recuperar','/p/test','/espaco-comum']){
  const first=choosePageFlora(plants,route);assert.ok(first);assert.notEqual(first.id,'lobo-guara');assert.equal(choosePageFlora([...plants].reverse(),route).id,first.id);
  assert.ok(choosePageFlora(plants.filter(p=>p.id!==first.id),route));
 }
 assert.equal(choosePageFlora([{id:'lobo-guara'}],'/perfil'),undefined);
});
