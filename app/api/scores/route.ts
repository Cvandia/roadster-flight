import {env} from 'cloudflare:workers';
import {json as responseJSON,preflight} from '../http';
// Browser and server use the identical fixed-step simulation.
// @ts-ignore Shared plain JavaScript game module.
import {createFlight,simulate,VERSION} from '../../../public/play/physics.js';
export const dynamic='force-dynamic';
export const OPTIONS=preflight;
export async function GET(request:Request){
 const json=(body:unknown,status=200)=>responseJSON(request,body,status);
 try{
  if(!env.DB)return json({error:'全球排行榜暂不可用'},503);
  const result=await env.DB.prepare(`SELECT name,distance,dx,dz,created_at FROM (SELECT name,distance,dx,dz,created_at,ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY distance DESC,created_at ASC) AS rn FROM flight_scores) WHERE rn=1 ORDER BY distance DESC,created_at ASC LIMIT 50`).all();
  return json({scores:result.results,updatedAt:Date.now()});
 }catch{return json({error:'全球排行榜暂不可用'},503);}
}
export async function POST(request:Request){
 const json=(body:unknown,status=200)=>responseJSON(request,body,status);
 try{
  if(!env.DB)return json({error:'全球排行榜暂不可用'},503);
  const raw=await request.text();if(raw.length>160000)return json({error:'请求过大'},413);
  const {runId,name,playerId,events,frames,version}=JSON.parse(raw);
  if(version!==VERSION)return json({error:'游戏已更新，请刷新页面'},409);
  if(typeof name!=='string'||name.trim().length<1||name.trim().length>16||/[\u0000-\u001f<>]/.test(name))return json({error:'名称须为 1–16 个字，请勿输入特殊符号'},400);
  if(typeof runId!=='string'||!Number.isInteger(frames)||frames<1||frames>14400||!Array.isArray(events)||events.length>4096)return json({error:'无效飞行记录'},400);
  const prior=await env.DB.prepare('SELECT distance,dx,dz FROM flight_scores WHERE id=?').bind(runId).first();if(prior)return json({score:prior});
  const run=await env.DB.prepare('SELECT player_id,created_at,claimed FROM flight_runs WHERE id=?').bind(runId).first<{player_id:string;created_at:number;claimed:number}>();
  if(!run||run.player_id!==playerId||run.claimed||Date.now()-run.created_at>3600000)return json({error:'本局记录已失效，请重新开始'},400);
  let previous=-1;for(const e of events){if(!Array.isArray(e)||e.length!==4||e.some((v:unknown)=>!Number.isInteger(v))||e[0]<=previous||e[0]<0||e[0]>=frames||Math.abs(e[1])>100||Math.abs(e[2])>100||e[3]<0||e[3]>100)return json({error:'无效操控记录'},400);previous=e[0];}
  const f=createFlight();let cursor=0,input={pitch:0,roll:0,boost:0};for(let i=0;i<frames;i++){if(events[cursor]?.[0]===i){const e=events[cursor++];input={pitch:e[1]/100,roll:e[2]/100,boost:e[3]/100};}simulate(f,input);if(f.phase==='end'&&i<frames-1)return json({error:'飞行记录校验失败'},400);}
  if(f.phase!=='end'||!Number.isFinite(f.distance)||f.distance>20000)return json({error:'请完成本次飞行后再提交'},400);
  const distance=Math.round(f.distance*10)/10;const written=await env.DB.batch([env.DB.prepare('INSERT INTO flight_scores (id,player_id,name,distance,dx,dz,frames,created_at) SELECT ?,?,?,?,?,?,?,? FROM flight_runs WHERE id=? AND claimed=0').bind(runId,playerId,name.trim(),distance,f.x,f.z,frames,Date.now(),runId),env.DB.prepare('UPDATE flight_runs SET claimed=1 WHERE id=? AND claimed=0').bind(runId)]);if(!written[0].meta.changes)return json({error:'本局已提交'},409);
  return json({score:{distance,dx:f.x,dz:f.z}});
 }catch{return json({error:'成绩暂未上传，请重试'},503);}
}
