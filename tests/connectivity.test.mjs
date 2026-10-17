import assert from 'node:assert/strict';
import {requestJSON,createScoreQueue} from '../public/play/connectivity.js';
const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
let online=false,runCalls=0,scoreCalls=0;
const record={id:'local-flight-1',payload:{name:'测试',playerId:'player-1234567890',events:[[0,0,0,0]],frames:100,version:'test'}};
const api=async(path,body)=>{if(!online)throw new Error('Network blocked');if(path==='/api/runs'){runCalls++;return {runId:'server-token'};}scoreCalls++;assert.equal(body.runId,'server-token');return {score:{distance:42.3}};};
let queue=createScoreQueue({storage,api});queue.add(record);assert.equal(queue.length,1);const offline=await queue.flush();assert(offline.error);assert.equal(queue.length,1);assert.equal(runCalls,0);
queue=createScoreQueue({storage,api});assert.equal(queue.length,1);online=true;const result=await queue.flush();assert.equal(result.synced,1);assert.equal(queue.length,0);assert.equal(runCalls,1);assert.equal(scoreCalls,1);assert.deepEqual(JSON.parse(data.get('roadster-pending-replays-v1')),[]);
let signal;await assert.rejects(requestJSON('/api/scores',null,{timeout:20,fetcher:async(u,o)=>{signal=o.signal;return new Promise(()=>{});}}),/超时/);assert(signal.aborted);
let url;await requestJSON('/api/runs',{playerId:'x'},{base:'https://example.com',fetcher:async(u,o)=>{url=u;assert.equal(o.credentials,'omit');return {ok:true,json:async()=>({runId:'ok'})};}});assert.equal(url,'https://example.com/api/runs');
const failing=createScoreQueue({storage:{getItem(){return null},setItem(){throw new Error('quota')}},api});failing.add(record);assert.equal(failing.persisted,false);assert.equal(failing.length,1);
console.log('Passed: no-network queue, persistence across reload, reconnect synchronization, one-time token reuse, timeout/abort, API origin, and storage failure handling.');

let tokenCalls=0,attempts=0,loseResponse=true;
const retryStorageData=new Map(),retryStorage={getItem:k=>retryStorageData.get(k)||null,setItem:(k,v)=>retryStorageData.set(k,v)};
const retryAPI=async(path,body)=>{if(path==='/api/runs'){tokenCalls++;return {runId:'persistent-token'};}attempts++;assert.equal(body.runId,'persistent-token');if(loseResponse){loseResponse=false;throw new Error('Lost response');}return {score:{distance:42.3}};};
let retryQueue=createScoreQueue({storage:retryStorage,api:retryAPI});retryQueue.add({id:'retry-flight',payload:{...record.payload,runId:undefined}});await retryQueue.flush();assert.equal(retryQueue.length,1);retryQueue=createScoreQueue({storage:retryStorage,api:retryAPI});await retryQueue.flush();assert.equal(tokenCalls,1);assert.equal(attempts,2);assert.equal(retryQueue.length,0);
console.log('Passed: persisted run token reused after an interrupted submission.');
