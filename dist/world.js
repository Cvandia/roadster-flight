import * as THREE from 'three';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

export function createWorld(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#10131c');scene.fog=new THREE.FogExp2('#10131c',.0028);
 const camera=new THREE.PerspectiveCamera(48,1,.15,3500),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xc7dcff,0x33303c,2));
 const key=new THREE.DirectionalLight(0xffe7dc,4);key.position.set(-15,45,25);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:150});key.shadow.bias=-.0005;scene.add(key,key.target);
 const rim=new THREE.DirectionalLight(0xaacfff,3);rim.position.set(20,15,-25);scene.add(rim);
 const red=new THREE.PointLight(0xff2537,130,65);red.position.set(-10,8,-12);scene.add(red);
 const mat=(color,metalness=0,roughness=.6)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const stageMat=mat('#20222a',.6,.32),dark=mat('#0e1016',.2,.5),metal=mat('#656c7c',.8,.25),neon=new THREE.MeshBasicMaterial({color:'#ff3b42'}),white=new THREE.MeshBasicMaterial({color:'#dce6ff'});
 function box(w,h,d,x,y,z,material=dark,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;}
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(12000,450),stageMat);ground.rotation.x=-Math.PI/2;ground.position.set(4500,-.03,0);ground.receiveShadow=true;scene.add(ground);
 // Each metre of the sloped runway matches the simulation's launch profile.
 const rampGeo=new THREE.BufferGeometry();const vertices=[];const A=[-28,0,-5],B=[-28,0,5],C=[0,10.08,-5],D=[0,10.08,5],E=[0,0,-5],F=[0,0,5];for(const tri of [[A,B,C],[B,D,C],[C,D,E],[D,F,E],[A,C,E],[B,F,D]])for(const p of tri)vertices.push(...p);rampGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));rampGeo.computeVertexNormals();const ramp=new THREE.Mesh(rampGeo,stageMat);ramp.receiveShadow=true;scene.add(ramp);
 for(const z of[-5.1,5.1]){const rail=box(29.75,.12,.12,-14,5.12,z,neon);rail.rotation.z=Math.atan(.36);box(180,.03,.08,-90,.01,z,neon);}
 for(let i=0;i<8;i++){const p=-25+i*3.3;const strip=box(.16,.03,9.8,p,(p+28)*.36+.04,0,metal);strip.rotation.z=Math.atan(.36);}
 const roadGrid=new THREE.GridHelper(12000,240,0x454450,0x292c37);roadGrid.position.set(4500,.005,0);scene.add(roadGrid);
 function textTexture(text,subtitle){const c=document.createElement('canvas');c.width=1536;c.height=512;const x=c.getContext('2d');x.fillStyle='#07090e';x.fillRect(0,0,1536,512);x.textAlign='center';x.fillStyle='#f0f1f7';x.font='500 104px Arial';x.fillText(text,768,245);x.fillStyle='#ff4957';x.font='24px Arial';x.fillText(subtitle,768,320);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
 const screenTexture=textTexture('R O A D S T E R','BEYOND THE ROAD / FLIGHT EXPERIENCE');const screenMat=new THREE.MeshBasicMaterial({map:screenTexture});
 for(let i=0;i<13;i++){const x=-65+i*150;box(145,17,2,x,9,-32,dark);box(85,15,.15,x,12,-30.8,screenMat);box(145,.12,.2,x,.8,-30.5,neon);for(const dx of[-69,69]){box(.35,27,.35,x+dx,13,-28,metal);box(.3,1,.3,x+dx,26,-28,white);}box(140,.3,.4,x,26,-28,metal);}
 // Instanced audience heads and seats keep mobile draw calls low.
 const audience=new THREE.InstancedMesh(new THREE.SphereGeometry(.23,7,5),mat('#3b3e4a'),1800);const dummy=new THREE.Object3D();let index=0;for(let i=0;i<300;i++)for(let row=0;row<3;row++)for(const side of[-1,1]){dummy.position.set(-90+i*6,1.5+row*.8,side*(19+row*2.1));dummy.scale.set(1,1.2,1);dummy.updateMatrix();audience.setMatrixAt(index++,dummy.matrix);}scene.add(audience);
 const seats=new THREE.InstancedMesh(new THREE.BoxGeometry(.65,.9,.65),dark,1800);for(let i=0;i<300;i++)for(let row=0;row<3;row++)for(const side of[-1,1]){dummy.position.set(-90+i*6,.8+row*.8,side*(19+row*2.1));dummy.scale.set(1,1,1);dummy.updateMatrix();seats.setMatrixAt(--index,dummy.matrix);}scene.add(seats);
 // Volumetric light cones, translucent to keep the runway visible.
 const beamMat=new THREE.MeshBasicMaterial({color:0x9eb9ff,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 for(let i=0;i<18;i++){const beam=new THREE.Mesh(new THREE.ConeGeometry(6,26,12,1,true),beamMat);beam.position.set(-80+i*110,13,-12);scene.add(beam);}
 const carPivot=new THREE.Group();scene.add(carPivot);const modelRoot=new THREE.Group();carPivot.add(modelRoot);
 // Reconstructed 2026 launch silhouette: silver wedge, wraparound glass, flat light bars.
 const paint=new THREE.MeshPhysicalMaterial({color:0xbfc4cd,metalness:.82,roughness:.26,clearcoat:1,clearcoatRoughness:.15});
 const glass=new THREE.MeshPhysicalMaterial({color:0x101a24,metalness:.3,roughness:.13,clearcoat:1});const rubber=mat('#0b0c10',.05,.9),rimMat=mat('#9ca4b0',.9,.22),carbon=mat('#10141b',.5,.4);
 function loft(stations,material,parent=modelRoot){const verts=[],idx=[];stations.forEach(([x,w,low,top])=>{for(const [y,z] of [[low,-w*.87],[low+.12,-w],[top-.1,-w],[top,-w*.84],[top,w*.84],[top-.1,w],[low+.12,w],[low,w*.87]])verts.push(x,y,z);});for(let i=0;i<stations.length-1;i++)for(let j=0;j<8;j++){const a=i*8+j,b=i*8+(j+1)%8,c=(i+1)*8+j,d=(i+1)*8+(j+1)%8;idx.push(a,b,c,b,d,c);}for(let j=1;j<7;j++){idx.push(0,j+1,j);const n=(stations.length-1)*8;idx.push(n,n+j,n+j+1);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 loft([[-2.3,.92,.3,.91],[-1.65,1.02,.26,1.02],[-.6,.97,.27,.99],[.65,.96,.26,.91],[1.6,1.01,.26,.86],[2.3,.88,.33,.76]],paint);
 loft([[-2.32,.94,.19,.4],[-1.5,1.01,.16,.42],[.7,.95,.17,.39],[2.31,.89,.2,.44]],carbon);
 // Cabin forms a continuous dark teardrop with silver rails and a descending rear deck.
 loft([[-1.85,.73,.88,.94],[-1.04,.75,.92,1.28],[-.55,.73,.94,1.38],[.25,.68,.9,1.35],[1.08,.77,.85,.91]],glass);
 for(const side of[-1,1]){const rail=new THREE.CatmullRomCurve3([new THREE.Vector3(-1.86,.95,side*.73),new THREE.Vector3(-1.03,1.29,side*.75),new THREE.Vector3(-.54,1.4,side*.73),new THREE.Vector3(.25,1.37,side*.68),new THREE.Vector3(1.08,.93,side*.77)]);const tube=new THREE.Mesh(new THREE.TubeGeometry(rail,28,.025,5,false),paint);modelRoot.add(tube);box(.13,.045,.12,.73,.99,side*.99,carbon,modelRoot);box(.23,.025,.035,-.2,.78,side*.985,metal,modelRoot);}
 // Panel seams run down the door and converge on the rear quarter.
 for(const side of[-1,1]){box(.012,.38,.007,.66,.66,side*.968,carbon,modelRoot);box(.012,.35,.007,-.95,.66,side*.99,carbon,modelRoot);}
 const wheels=[];for(const x of[-1.49,1.49])for(const side of[-1,1]){const group=new THREE.Group();group.position.set(x,.44,side*1.0);modelRoot.add(group);const arch=new THREE.Mesh(new THREE.CylinderGeometry(.49,.49,.06,40),carbon);arch.rotation.x=Math.PI/2;arch.position.z=side*.012;group.add(arch);const tire=new THREE.Mesh(new THREE.CylinderGeometry(.425,.425,.24,40),rubber);tire.rotation.x=Math.PI/2;tire.position.z=side*.055;group.add(tire);const wheel=new THREE.Group();wheel.position.z=side*.185;group.add(wheel);const disc=new THREE.Mesh(new THREE.CylinderGeometry(.315,.315,.018,32),mat('#292f37',.8,.5));disc.rotation.x=Math.PI/2;wheel.add(disc);const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.025,7,40),rimMat);wheel.add(ring);for(let k=0;k<5;k++){const blade=box(.065,.33,.035,0,.19,0,rimMat,new THREE.Group());const spoke=new THREE.Group();spoke.rotation.z=k*Math.PI*2/5+.2;spoke.add(blade);wheel.add(spoke);}const hub=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.035,16),carbon);hub.rotation.x=Math.PI/2;wheel.add(hub);wheels.push(wheel);}
 // Front bumper with a slim light strip, rectangular corner lamps and black air splitter.
 box(.04,.13,1.63,2.305,.51,0,carbon,modelRoot);box(.045,.027,1.56,2.33,.74,0,white,modelRoot);for(const z of[-.74,.74])box(.05,.12,.12,2.33,.7,z,white,modelRoot);
 box(.065,.13,1.84,-2.325,.9,0,carbon,modelRoot);box(.07,.027,1.76,-2.365,.92,0,neon,modelRoot);box(.07,.11,.26,-2.37,.59,0,metal,modelRoot);box(.2,.13,1.5,-2.28,.26,0,carbon,modelRoot);for(const z of[-.67,-.33,0,.33,.67])box(.55,.17,.025,-2.1,.21,z,carbon,modelRoot);
 const nozzles=[];for(const z of[-.65,.65]){const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.1,.14,.19,12),metal);nozzle.rotation.z=Math.PI/2;nozzle.position.set(-2.4,.43,z);modelRoot.add(nozzle);nozzles.push({p:new THREE.Vector3(-2.5,.43,z),d:new THREE.Vector3(-1,0,0)});}for(const x of[-1.4,1.4])for(const z of[-.7,.7]){const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.105,.14,.1,12),metal);nozzle.position.set(x,.17,z);modelRoot.add(nozzle);nozzles.push({p:new THREE.Vector3(x,.1,z),d:new THREE.Vector3(0,-1,0)});}
 const puffCanvas=document.createElement('canvas');puffCanvas.width=puffCanvas.height=64;const pc=puffCanvas.getContext('2d'),gr=pc.createRadialGradient(32,32,1,32,32,32);gr.addColorStop(0,'rgba(240,250,255,.65)');gr.addColorStop(.35,'rgba(216,233,243,.35)');gr.addColorStop(1,'rgba(211,230,245,0)');pc.fillStyle=gr;pc.fillRect(0,0,64,64);const puffTex=new THREE.CanvasTexture(puffCanvas);
 const N=650,positions=new Float32Array(N*3).fill(1e6),colors=new Float32Array(N*3),particles=Array.from({length:N},()=>({life:0,v:new THREE.Vector3(),p:new THREE.Vector3(),max:1}));let cursor=0;
 const puffGeo=new THREE.BufferGeometry();puffGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));puffGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));const puffMat=new THREE.PointsMaterial({map:puffTex,color:0xe8f6ff,size:1.8,transparent:true,opacity:.85,depthWrite:false,vertexColors:true,sizeAttenuation:true});const puffs=new THREE.Points(puffGeo,puffMat);puffs.frustumCulled=false;scene.add(puffs);
 function emit(origin,direction,velocity=null){const q=particles[cursor++%N];q.p.copy(origin);q.v.copy(direction).multiplyScalar(10+Math.random()*8).add(new THREE.Vector3((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2));if(velocity)q.v.add(velocity);q.life=q.max=.5+Math.random()*.65;}
 let prevTime=performance.now(),previousState='ready';const jetAxis=new THREE.Vector3(0,0,1),quat=new THREE.Quaternion();
 let width=900,height=490;const loaded=true,loadError=false;document.getElementById('modelStatus').textContent='3D 已就绪 · 2026 外观参考重建';document.getElementById('startButton').disabled=false;
 const target=new THREE.Vector3(),desired=new THREE.Vector3();let first=true;
 return {get ready(){return loaded&&!loadError;},resize(w,h){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();},update(f,state,boost,paused,time){
 const ready=state==='ready',end=state==='end';carPivot.position.set(f.x,Math.max(.02,f.y-1.05),0);carPivot.rotation.z=ready?0:f.a;
 const close=ready||end;const mobile=width<600;const offset=close?new THREE.Vector3(7,3.7,8):new THREE.Vector3(mobile?-7:-9,5,mobile?14:16);
 desired.copy(carPivot.position).add(offset);if(first){camera.position.copy(desired);first=false;}else camera.position.lerp(desired,close?.045:.09);
 target.copy(carPivot.position).add(new THREE.Vector3(close?0:2,close?.6:1,0));camera.lookAt(target);
 key.position.copy(carPivot.position).add(new THREE.Vector3(-15,45,25));key.target.position.copy(carPivot.position);red.position.set(f.x-8,f.y+5,-12);
 const now=performance.now(),dt=paused?0:Math.min(.05,(now-prevTime)/1000);prevTime=now;quat.setFromAxisAngle(jetAxis,ready?0:f.a);
 if(boost&&dt>0){for(const nozzle of nozzles){const origin=nozzle.p.clone().applyQuaternion(quat).add(carPivot.position),direction=nozzle.d.clone().applyQuaternion(quat);for(let j=0;j<3;j++)emit(origin,direction,new THREE.Vector3(f.vx,f.vy,0));}}
 if(state==='end'&&previousState!=='end'){for(let j=0;j<70;j++)emit(new THREE.Vector3(f.x+(Math.random()-.5)*4,.1,(Math.random()-.5)*2),new THREE.Vector3((Math.random()-.5),.1,(Math.random()-.5)));}previousState=state;
 for(let i=0;i<N;i++){const q=particles[i];if(q.life>0){q.life-=dt;q.p.addScaledVector(q.v,dt);q.v.multiplyScalar(1-dt*.6);if(q.p.y<.1){q.p.y=.1;q.v.y=Math.abs(q.v.y)*.12;q.v.x*=1.02;q.v.z*=1.02;}positions[i*3]=q.p.x;positions[i*3+1]=q.p.y;positions[i*3+2]=q.p.z;const c=Math.max(0,q.life/q.max);colors[i*3]=c;colors[i*3+1]=c;colors[i*3+2]=c;}else positions[i*3+1]=1e6;}puffGeo.attributes.position.needsUpdate=true;puffGeo.attributes.color.needsUpdate=true;
 if(!paused&&state==='run')for(const wheel of wheels)wheel.rotation.z-=f.vx*dt/.425;
 renderer.render(scene,camera);
 }};
}
