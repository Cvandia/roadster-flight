import {createWorld} from './world.js';
import {createFlight,simulate,VERSION} from './physics.js';
import {createAudio} from './audio.js';
const $=id=>document.getElementById(id),canvas=$('scene'),audio=createAudio(),world=createWorld(canvas),DT=1/120;
let playerId,playerName='';try{playerId=localStorage.getItem('roadster-player-id');playerName=localStorage.getItem('roadster-player-name')||JSON.parse(localStorage.getItem('roadster-flight-u3d-v2')||'{}').name||'';}catch{}
if(!playerId||!/^[a-zA-Z0-9-]{16,64}$/.test(playerId)){playerId=crypto.randomUUID();try{localStorage.setItem('roadster-player-id',playerId);}catch{}}
$('player').value=playerName;
let flight=null,previous=null,state='ready',paused=false,last=0,accumulator=0,runId=null,events=[],lastControl='',pending=null,scores=[],uploading=false;
const controls={pitch:0,roll:0,boost:0},sticks=[];
async function api(path,body){const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'连接失败，请稍后重试');return result;}
function row(r,i){const e=document.createElement('div');e.className='rankrow';for(const [cls,value]of [['position',String(i+1).padStart(2,'0')],['name',r.name],['value',Number(r.distance).toFixed(1)+' m']]){const cell=document.createElement(cls==='value'?'strong':'span');cell.className=cls;cell.textContent=value;e.append(cell);}return e;}
function displayScores(){for(const [id,list]of [['rankRows',scores.slice(0,5)],['boardContent',scores]]){const container=$(id);container.replaceChildren();if(!list.length){const e=document.createElement('div');e.className='rankempty';e.textContent='还没有成绩，成为第一位飞行者。';container.append(e);}list.forEach((r,i)=>container.append(row(r,i)));}}
async function loadScores(){try{const result=await api('/api/scores');scores=result.scores;displayScores();$('rankStatus').textContent='已同步 · 每位玩家最佳成绩';}catch{$('rankStatus').textContent='连接暂不可用';if(!scores.length){$('rankRows').innerHTML='<div class="rankempty">排行榜连接暂不可用</div>';$('boardContent').innerHTML='<div class="rankempty">暂时无法获取全球成绩，请稍后重试。</div>';}}}
function resetControls(){controls.pitch=controls.roll=controls.boost=0;for(const s of sticks)s.reset();}
function pause(value){if(!flight||state==='end')return;paused=value;resetControls();$('resumeOverlay').hidden=!value;audio.update(flight,state,0,true);}
async function start(){
 playerName=$('player').value.trim();if(!playerName||playerName.length>16||/[\u0000-\u001f<>]/.test(playerName)){$('message').textContent='请输入 1–16 个字的驾驶员名称';return;}
 audio.unlock();$('player').blur();$('startButton').disabled=true;$('message').textContent='正在准备起飞…';
 try{const result=await api('/api/runs',{playerId});runId=result.runId;}catch(e){$('message').textContent=e.message;$('startButton').disabled=false;return;}
 try{localStorage.setItem('roadster-player-name',playerName);}catch{}
 flight=createFlight();previous={...flight,q:{...flight.q}};state='run';paused=false;accumulator=0;events=[];lastControl='';pending=null;resetControls();$('entry').hidden=true;$('resumeOverlay').hidden=true;$('message').textContent='';$('retry').hidden=true;$('uploadStatus').hidden=true;$('startButton').disabled=false;$('hint').hidden=false;
}
async function upload(payload){if(uploading)return;uploading=true;$('retry').hidden=true;$('uploadStatus').hidden=false;$('uploadStatus').textContent='正在核验飞行并上传全球榜…';try{const result=await api('/api/scores',payload);if(runId===payload.runId){$('uploadStatus').textContent='已记入全球排行榜 · '+result.score.distance.toFixed(1)+' m';pending=null;}await loadScores();}catch(e){if(runId===payload.runId){$('uploadStatus').textContent=e.message;$('retry').hidden=false;}}finally{uploading=false;}}
function finish(){state='end';resetControls();$('entry').hidden=false;$('resultTitle').textContent=(Math.round(flight.distance*10)/10).toFixed(1)+' 米';$('resultDetail').textContent='前后 '+flight.x.toFixed(1)+' m · 左右 '+flight.z.toFixed(1)+' m';$('startButton').textContent='再飞一次';$('message').textContent='';pending={runId,playerId,name:playerName,events,frames:flight.frame,version:VERSION};upload(pending);}
function makeStick(id,onMove,thrust=false){const el=$(id),knob=el.querySelector('.knob');let pointer=null;
 function move(e){const r=el.getBoundingClientRect(),radius=r.width*.36,dx=(e.clientX-r.left-r.width/2)/radius,dy=(e.clientY-r.top-r.height/2)/radius;let x=dx,y=dy;if(thrust){x=0;y=Math.max(-1,Math.min(0,dy));}else{const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}}knob.style.transform=`translate(${x*radius}px,${y*radius}px)`;const dead=v=>Math.abs(v)<.08?0:Math.sign(v)*(Math.abs(v)-.08)/.92;onMove(dead(x),dead(y));el.setAttribute('aria-valuenow',String(Math.round((thrust?-y:x)*100)));}
 const reset=()=>{pointer=null;el.classList.remove('active');knob.style.transform='translate(0,0)';el.setAttribute('aria-valuenow','0');onMove(0,0);};
 el.addEventListener('pointerdown',e=>{if(pointer!==null||paused)return;e.preventDefault();audio.unlock();pointer=e.pointerId;el.setPointerCapture(pointer);el.classList.add('active');move(e);});el.addEventListener('pointermove',e=>{if(e.pointerId===pointer){e.preventDefault();move(e);}});
 function release(e){if(e.pointerId!==pointer)return;const latch=thrust&&e.pointerType==='mouse'&&e.type==='pointerup';pointer=null;el.classList.remove('active');if(!latch)reset();}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,release);sticks.push({reset});
}
makeStick('attitudeStick',(x,y)=>{controls.roll=x;controls.pitch=-y;});makeStick('thrustStick',(x,y)=>{controls.boost=-y;},true);
if(matchMedia('(pointer:fine)').matches)$('hint').innerHTML='左杆调整姿态 · 右杆上推喷气<br>鼠标操作时，喷气杆松开后保持推力';
function blend(a,b,t){const f={...b};for(const k of ['x','y','z'])f[k]=a[k]+(b[k]-a[k])*t;const dot=a.q.x*b.q.x+a.q.y*b.q.y+a.q.z*b.q.z+a.q.w*b.q.w,sign=dot<0?-1:1;f.q={};let length=0;for(const k of ['x','y','z','w']){f.q[k]=a.q[k]+(b.q[k]*sign-a.q[k])*t;length+=f.q[k]*f.q[k];}for(const k in f.q)f.q[k]/=Math.sqrt(length);return f;}
const idle={...createFlight(),x:-65,y:1.05,phase:'ready'};
function frame(t){const elapsed=last?Math.min(.05,(t-last)/1000):0;last=t;if(!paused&&flight&&['run','flight'].includes(state)){accumulator+=elapsed;while(accumulator>=DT&&flight.phase!=='end'){
 const values=[Math.round(controls.pitch*100),Math.round(controls.roll*100),Math.round(controls.boost*100)],key=values.join(',');if(key!==lastControl){events.push([flight.frame,...values]);lastControl=key;}previous={...flight,q:{...flight.q}};simulate(flight,{pitch:values[0]/100,roll:values[1]/100,boost:values[2]/100});state=flight.phase;accumulator-=DT;
 }if(flight.phase==='end'){accumulator=0;finish();}}
 const f=flight?(state==='end'?flight:blend(previous,flight,paused?1:Math.min(1,accumulator/DT))):idle;
 world.update(f,state,state==='flight'&&!paused&&controls.boost>0&&f.fuel>0,paused,f.t,elapsed);audio.update(f,state,controls.boost,paused);$('distance').textContent=(f.distance||0).toFixed(1);$('fuelBar').style.width=f.fuel+'%';$('fuelLabel').textContent=Math.ceil(f.fuel)+'%';$('altitude').textContent=state==='ready'?'U 形跳台 · 固定燃料':'高度 '+Math.max(0,f.y-1.05).toFixed(0)+' m';if(flight&&flight.t>10)$('hint').hidden=true;requestAnimationFrame(frame);
}
$('startForm').onsubmit=e=>{e.preventDefault();start();};$('retry').onclick=()=>{if(pending)upload(pending);};$('pause').onclick=()=>pause(true);$('resume').onclick=()=>{audio.unlock();pause(false);};$('sound').onclick=()=>{audio.unlock();const muted=audio.toggle();$('sound').textContent=muted?'∅':'♪';$('sound').setAttribute('aria-label',muted?'开启声音':'关闭声音');};$('openBoard').onclick=()=>{pause(true);loadScores();$('board').showModal();};$('closeBoard').onclick=()=>$('board').close();window.addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);else loadScores();});new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();world.resize(r.width,r.height);}).observe(canvas);loadScores();setInterval(()=>{if(!document.hidden)loadScores();},20000);requestAnimationFrame(frame);
