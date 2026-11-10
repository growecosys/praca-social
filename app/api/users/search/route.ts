import {env} from 'cloudflare:workers';
import {getPracaUser} from '../../../../lib/praca-auth';
export async function GET(request:Request){
 if(!await getPracaUser())return Response.json({error:'Entre para mencionar alguém.'},{status:401});
 const q=(new URL(request.url).searchParams.get('q')||'').trim().replace(/^@/,'').slice(0,60).replace(/[\\%_]/g,'\\$&');
 const rows=await env.DB.prepare("SELECT id,username,display_name FROM users WHERE deleted_at IS NULL AND profile_complete=1 AND (username LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\') ORDER BY username LIMIT 8").bind(q+'%','%'+q+'%').all();
 return Response.json({people:rows.results.map((u:any)=>({username:u.username,displayName:u.display_name,avatarUrl:'/avatar/'+u.id}))},{headers:{'cache-control':'no-store'}});
}
