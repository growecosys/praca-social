import {env} from 'cloudflare:workers';
import {tickStories} from '../../../../lib/stories-store';
export const dynamic='force-dynamic';
// Public and deterministic: only server time can advance deadlines; no user input or AI calls.
export async function GET(){try{const row=await tickStories(env.DB);return Response.json({ok:true,campaign:row.state.id,phase:row.state.phase,round:row.state.round,nextDeadline:row.state.phase==='enrollment'?row.state.enrollEnd:row.state.phase==='playing'?row.state.roundEnd:row.state.closed!+3600000},{headers:{'cache-control':'no-store'}});}catch{return Response.json({ok:false},{status:503,headers:{'cache-control':'no-store'}});}}
