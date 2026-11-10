import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
// The original starter tried to import a Cloudflare Worker into Node and expected
// development-only metadata in production. Exercise the actual client surfaces instead.
const vite=await createServer({appType:'custom',configFile:false,root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true}});
after(()=>vite.close());
test('profile editor renders accessible fields and escapes user content',async()=>{
 const {default:Edit}=await vite.ssrLoadModule('/app/perfil/editar/edit-form.tsx');
 const html=renderToStaticMarkup(React.createElement(Edit,{user:{id:'test',displayName:'<script>alert(1)</script>',username:'ana',bio:'Bio'}}));
 assert.ok(html.includes('Nome público'));assert.ok(html.includes('Identificador'));assert.ok(html.includes('Apresentação pública'));assert.ok(html.includes('Cancelar'));assert.ok(html.includes('Salvar alterações'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert(1)</script>'));
});
test('email access and confirmation require explicit user actions',async()=>{
 const {default:Email}=await vite.ssrLoadModule('/components/email-access-form.tsx');
 const html=renderToStaticMarkup(React.createElement(Email));assert.ok(html.includes('type="email"'));assert.ok(html.includes('Receber acesso por e-mail'));assert.ok(html.includes('disabled'));
 const {default:Confirm}=await vite.ssrLoadModule('/app/acesso-email/confirm.tsx');
 const confirmation=renderToStaticMarkup(React.createElement(Confirm));assert.ok(confirmation.includes('Verificando link'));assert.ok(!confirmation.includes('token='));
});

test('account deletion asks only for the exact phrase and keeps final confirmation disabled initially',async()=>{
 const {default:Delete}=await vite.ssrLoadModule('/components/delete-account-form.tsx');const html=renderToStaticMarkup(React.createElement(Delete));assert.ok(html.includes('DELETAR CONTA'));assert.ok(html.includes('<dialog'));assert.ok(html.includes('Excluir conta definitivamente'));assert.ok(!html.includes('type="password"'));assert.ok(!html.includes('one-time-code'));assert.ok(!html.includes('Enviar código'));assert.match(html,/<button disabled=""[^>]*>Excluir conta definitivamente/);
});
