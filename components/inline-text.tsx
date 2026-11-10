import {parseInline,type InlineNode} from '../lib/inline-text';
export default function InlineText({text=''}:{text?:string}){
 const render=(nodes:InlineNode[]):React.ReactNode=>nodes.map((n,i)=>{const child=n.children?render(n.children):n.text;if(n.kind==='strong')return <strong key={i}>{child}</strong>;if(n.kind==='em')return <em key={i}>{child}</em>;if(n.kind==='del')return <del key={i}>{child}</del>;if(n.kind==='code')return <code key={i} className="rounded bg-black/5 px-1 font-mono text-[.85em]">{child}</code>;if(n.kind==='mention')return <a key={i} href={n.href} className="font-semibold text-[#244e35] underline underline-offset-4" aria-label={'Ver perfil de @'+n.username}>{child}</a>;if(n.kind==='link')return <a key={i} href={n.href} target={n.href?.startsWith('/')?undefined:'_blank'} rel="noopener noreferrer" className="underline decoration-[#7a8f7d] underline-offset-4">{child}</a>;return <span key={i}>{child}</span>;});
 return <>{render(parseInline(text))}</>;
}
