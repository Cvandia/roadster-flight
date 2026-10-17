import {env} from 'cloudflare:workers';
import {json as responseJSON,preflight} from '../http';
export const dynamic='force-dynamic';
export const OPTIONS=preflight;
export async function POST(request:Request){
 const json=(body:unknown,status=200)=>responseJSON(request,body,status);
 try{
  if(!env.DB)return json({error:'排行榜服务尚未连接'},503);
  if(Number(request.headers.get('content-length')||0)>2048)return json({error:'请求过大'},413);
  const {playerId}=await request.json() as {playerId:string};
  if(typeof playerId!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(playerId))return json({error:'玩家标识无效'},400);
  const now=Date.now();const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM flight_runs WHERE player_id = ? AND created_at > ?').bind(playerId,now-60000).first<{n:number}>();
  if((count?.n||0)>=8)return json({error:'请稍等片刻再开始'},429);
  const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO flight_runs (id,player_id,created_at,claimed) VALUES (?,?,?,0)').bind(id,playerId,now).run();
  return json({runId:id});
 }catch{return json({error:'暂时无法开始排名挑战，请重试'},503);}
}
