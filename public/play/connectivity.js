const host=globalThis.location?.hostname||'localhost';
export const API_BASE=host.endsWith('.github.io')?'https://roadster-flight-cj.arcane-krill-2332.chatgpt.site':'';

export async function requestJSON(path,body,{fetcher=globalThis.fetch,base=API_BASE,timeout=3000}={}){
 const controller=new AbortController();let timer;
 try{
  return await Promise.race([
   (async()=>{const response=await fetcher(base+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',signal:controller.signal});const result=await response.json();if(!response.ok){const error=new Error(result.error||'连接失败，请稍后重试');error.status=response.status;throw error;}return result;})(),
   new Promise((resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('全球排行榜连接超时'));},timeout);})
  ]);
 }finally{clearTimeout(timer);}
}

// Pending replays survive page reloads. Only a server-verified result removes one.
export function createScoreQueue({storage,api=requestJSON,key='roadster-pending-replays-v1',onAccepted=()=>{}}={}){
 let records=[],persisted=true,draining=null;
 try{const saved=JSON.parse(storage?.getItem(key)||'[]');if(Array.isArray(saved))records=saved.filter(r=>r&&typeof r.id==='string'&&r.payload&&Array.isArray(r.payload.events));}catch{persisted=false;}
 function save(){try{if(!storage){persisted=false;return;}storage.setItem(key,JSON.stringify(records));persisted=true;}catch{persisted=false;}}
 async function drain(){let synced=0;for(const record of [...records]){
  try{
   if(!record.payload.runId){const result=await api('/api/runs',{playerId:record.payload.playerId});record.payload.runId=result.runId;save();}
   let result;
   try{result=await api('/api/scores',record.payload);}catch(error){if(error.status===400&&error.message.includes('失效')){const fresh=await api('/api/runs',{playerId:record.payload.playerId});record.payload.runId=fresh.runId;save();result=await api('/api/scores',record.payload);}else throw error;}
   records=records.filter(r=>r.id!==record.id);save();synced++;onAccepted(record,result);
  }catch(error){return {synced,pending:records.length,error};}
 }return {synced,pending:records.length};}
 return {add(record){if(!records.some(r=>r.id===record.id)){records.push(record);save();}},has(id){return records.some(r=>r.id===id);},get length(){return records.length;},get persisted(){return persisted;},flush(){if(!draining)draining=drain().finally(()=>{draining=null;});return draining;}};
}
