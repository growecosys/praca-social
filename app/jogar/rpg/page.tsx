import SiteHeader from '../../../components/site-header';
import {getPracaUser} from '../../../lib/praca-auth';
import RpgClient from './rpg-client';
import './rpg.css';
export const dynamic='force-dynamic';
export const metadata={title:'RPG da Praça — O coreto perdeu a sombra',description:'Uma aventura com dados, escolhas livres e um mestre de IA.'};
export default async function Page(){const u=await getPracaUser();return <main className="rpg-page"><SiteHeader active="jogar"/><div className="rpg-shell" id="conteudo-principal" tabIndex={-1}><a className="rpg-back" href="/jogar">← Jogos da Praça</a><header className="rpg-heading"><p>CADERNOS DA PRAÇA · CAPÍTULO 01</p><h1>O coreto perdeu<br/><em>a sombra.</em></h1><div>Uma aventura sobre aquilo que um lugar guarda.<br/>Dados, decisões e um mestre que responde às suas ideias.</div><span className="rpg-stamp">RPG EXPERIMENTAL · SOLO</span></header><RpgClient signedIn={!!u} role={u?.roleTitle||'Habitante da Praça'} name={u?.displayName||'Visitante'}/></div></main>}
