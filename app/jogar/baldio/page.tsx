import SiteHeader from '../../../components/site-header';
import AfterHours from '../../../components/after-hours';
import {getPracaUser} from '../../../lib/praca-auth';
import '../game.css';
export const dynamic='force-dynamic';
export const metadata={title:'Depois das Horas — Praça',description:'Explore o Baldio, invente uma embarcação e descubra quem está escutando do outro lado.'};
export default async function Page(){const u=await getPracaUser();return <main className="min-h-screen bg-[#f5f1e8] text-[#173a30]"><SiteHeader active="jogar"/><div id="conteudo-principal" tabIndex={-1}><a href="/jogar" className="mx-auto block max-w-[1180px] px-5 pt-6 text-sm underline">← Jogos da Praça</a><AfterHours user={u?{id:u.id,name:u.displayName,role:u.roleTitle,avatar:`/avatar/${u.id}?v=${u.imageGenerationsUsed}`}:null}/></div></main>}
