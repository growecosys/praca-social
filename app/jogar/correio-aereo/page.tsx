import SiteHeader from '../../../components/site-header';
import AirmailGame from '../../../components/airmail-game';
import {getPracaUser} from '../../../lib/praca-auth';
import '../airmail.css';
export const dynamic='force-dynamic';
export const metadata={title:'Correio Aéreo — Jogos da Praça',description:'Pilote entre os telhados, desvie das aves e entregue cartas. Seus recordes e conquistas ficam no perfil da Praça.'};
export default async function Page(){const u=await getPracaUser();return <main className="min-h-screen bg-[#f5f1e8] text-[#193d33]"><SiteHeader active="jogar"/><div id="conteudo-principal" tabIndex={-1}><AirmailGame user={u?{id:u.id,name:u.displayName,username:u.username}:null}/></div></main>}
