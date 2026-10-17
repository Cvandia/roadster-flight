export const VERSION='u3d-joystick-v3';
export const LANDING_RULESET='upright-forward-v1';
export const LANDING_MAX_TILT=25,LANDING_MAX_HEADING=60;
export function createFlight(){return {x:-90,y:1.05,z:0,vx:0,vy:0,vz:0,a:0,av:0,rv:0,rollTotal:0,q:{x:0,y:0,z:0,w:1},s:0,runSpeed:0,fuel:100,t:0,distance:0,phase:'run',frame:0};}
export function qm(a,b){return {x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z};}
export function qv(q,v){const t=qm(q,{...v,w:0});return qm(t,{x:-q.x,y:-q.y,z:-q.z,w:q.w});}
export function terrainHeight(x,z){if(Math.abs(z)>5)return 0;const join=-28*Math.sin(1.35);let u;if(x>=join&&x<=0)u=x-join;else if(x<=-100&&x>=-100+join)u=-100-x;else return 0;return 28-Math.sqrt(Math.max(0,28*28-u*u));}
export function assessLanding(f){
 if(f.phase!=='end')return {valid:false,reason:'尚未着陆'};
 const up=qv(f.q,{x:0,y:1,z:0}),forward=qv(f.q,{x:1,y:0,z:0});let slope=0;
 if(Math.abs(f.z)<5){const join=-28*Math.sin(1.35);let u=0,sign=1;if(f.x>=join&&f.x<=0)u=f.x-join;else if(f.x<=-100&&f.x>=-100+join){u=-100-f.x;sign=-1;}slope=sign*u/Math.sqrt(Math.max(.0001,28*28-u*u));}
 const length=Math.hypot(slope,1),normal={x:-slope/length,y:1/length,z:0};
 const tilt=Math.acos(Math.max(-1,Math.min(1,up.x*normal.x+up.y*normal.y+up.z*normal.z)))*180/Math.PI;
 if(!Number.isFinite(tilt)||tilt>LANDING_MAX_TILT+1e-8)return {valid:false,reason:'车身未回正，请车轮朝下着陆',tilt};
 const project=v=>{const d=v.x*normal.x+v.y*normal.y+v.z*normal.z;return {x:v.x-d*normal.x,y:v.y-d*normal.y,z:v.z-d*normal.z};};
 const heading=project(forward),velocity=project({x:f.vx,y:f.vy,z:f.vz}),speed=Math.hypot(velocity.x,velocity.y,velocity.z),headingLength=Math.hypot(heading.x,heading.y,heading.z);
 if(speed>=2){const alignment=(heading.x*velocity.x+heading.y*velocity.y+heading.z*velocity.z)/(headingLength*speed);if(!Number.isFinite(alignment)||alignment<Math.cos(LANDING_MAX_HEADING*Math.PI/180)-1e-8)return {valid:false,reason:'车头未顺着行进方向着陆',tilt};}
 return {valid:true,reason:'正向着陆',tilt};
}
export function simulate(f,input,dt=1/120){if(f.phase==='end')return;f.frame++;f.t+=dt;
if(f.phase==='run'){f.runSpeed=Math.min(43,f.runSpeed+23*dt);f.s+=f.runSpeed*dt;const flat=90-28*Math.sin(1.35);const theta=Math.max(0,Math.min(1.35,(f.s-flat)/28));f.x=f.s<flat?-90+f.s:-28*Math.sin(1.35)+28*Math.sin(theta);f.y=1.05+28*(1-Math.cos(theta));f.a=theta;f.q={x:0,y:0,z:Math.sin(theta/2),w:Math.cos(theta/2)};f.vx=f.runSpeed*Math.cos(theta);f.vy=f.runSpeed*Math.sin(theta);if(f.s>=flat+28*1.35){f.x=0;f.phase='flight';}return;}
const pitch=input.pitch||0,roll=input.roll||0;f.av+=(pitch*5.5-f.av*3.5)*dt;f.rv+=(roll*9-f.rv*3)*dt;f.rollTotal+=f.rv*dt;
const contactStartQ={...f.q};const da=f.av*dt,dr=f.rv*dt;f.q=qm(qm(f.q,{x:Math.sin(dr/2),y:0,z:0,w:Math.cos(dr/2)}),{x:0,y:0,z:Math.sin(da/2),w:Math.cos(da/2)});const norm=Math.hypot(f.q.x,f.q.y,f.q.z,f.q.w);for(const k of ['x','y','z','w'])f.q[k]/=norm;
const forward=qv(f.q,{x:1,y:0,z:0}),up=qv(f.q,{x:0,y:1,z:0}),side=qv(f.q,{x:0,y:0,z:1});const speed=Math.hypot(f.vx,f.vy,f.vz),dotUp=(up.x*f.vx+up.y*f.vy+up.z*f.vz)/Math.max(1,speed),dotSide=(side.x*f.vx+side.y*f.vy+side.z*f.vz)/Math.max(1,speed);const lift=Math.max(-7,Math.min(12,-speed*speed*.016*dotUp)),drag=.0009*speed*(1+6*dotUp*dotUp+3*dotSide*dotSide);let thrust=0;if(input.boost&&f.fuel>0){const used=Math.min(f.fuel,100/6*dt*input.boost);thrust=used/(100/6*dt)*19;f.fuel=Math.max(0,f.fuel-used);}
const old={x:f.x,y:f.y,z:f.z};f.vx+=(thrust*(forward.x+.55*up.x)+lift*up.x-drag*f.vx)*dt;f.vy+=(thrust*(forward.y+.55*up.y)+lift*up.y-drag*f.vy-9.81)*dt;f.vz+=(thrust*(forward.z+.55*up.z)+lift*up.z-drag*f.vz)*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;f.distance=Math.hypot(f.x,f.z);f.a=Math.atan2(forward.y,Math.hypot(forward.x,forward.z));
if(f.y<=terrainHeight(f.x,f.z)+1.05){let lo=0,hi=1;for(let i=0;i<18;i++){const mid=(lo+hi)/2,x=old.x+(f.x-old.x)*mid,z=old.z+(f.z-old.z)*mid,y=old.y+(f.y-old.y)*mid;if(y>terrainHeight(x,z)+1.05)lo=mid;else hi=mid;}const t=hi;f.x=old.x+(f.x-old.x)*t;f.z=old.z+(f.z-old.z)*t;f.y=terrainHeight(f.x,f.z)+1.05;f.distance=Math.hypot(f.x,f.z);const sign=contactStartQ.x*f.q.x+contactStartQ.y*f.q.y+contactStartQ.z*f.q.z+contactStartQ.w*f.q.w<0?-1:1;let qLength=0;for(const key of ['x','y','z','w']){f.q[key]=contactStartQ[key]+(f.q[key]*sign-contactStartQ[key])*t;qLength+=f.q[key]*f.q[key];}for(const key in f.q)f.q[key]/=Math.sqrt(qLength);f.phase='end';f.landing=assessLanding(f);}}
