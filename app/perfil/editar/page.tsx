export const metadata={title:'Editar perfil — Praça',robots:{index:false,follow:false}};
import DeleteAccountForm from "../../../components/delete-account-form";
import ChangePasswordForm from '../../../components/change-password-form';
import {redirect} from 'next/navigation';
import {env} from 'cloudflare:workers';
import {getPracaUser} from '../../../lib/praca-auth';
import SiteHeader from '../../../components/site-header';
import EmailAccessForm from '../../../components/email-access-form';
import EditProfile from './edit-form';
export const dynamic='force-dynamic';
export default async function Page(){
 const user=await getPracaUser();if(!user)redirect('/entrar');
 const email=await env.DB.prepare('SELECT email FROM account_emails WHERE user_id=?').bind(user.id).first();
 const pending=await env.DB.prepare('SELECT email FROM pending_account_emails WHERE user_id=?').bind(user.id).first();
 return <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]"><SiteHeader active="perfil"/><section id="conteudo-principal" tabIndex={-1} className="relative z-10 mx-auto max-w-2xl px-5 py-10 sm:px-8"><a href="/perfil" className="inline-flex min-h-11 items-center text-sm underline">← Voltar ao perfil</a><h1 className="mt-4 font-serif text-4xl">Editar perfil</h1><p className="mb-7 mt-3 text-[#667064]">{user.profileComplete?'Atualize como você aparece na Praça.':'Escolha seu nome e identificador antes de concluir sua identidade.'}</p><div className="bg-[#f5f1e8]/95 p-1"><EditProfile user={{id:user.id,displayName:user.displayName,username:user.username,bio:user.bio||''}}/><div className="mt-10 border-t border-[#c8c0b1] pt-7"><EmailAccessForm purpose="link" pendingEmail={pending?.email as string||null} currentEmail={email?.email as string||null}/></div><ChangePasswordForm/></div></section><DeleteAccountForm/></main>;
}
