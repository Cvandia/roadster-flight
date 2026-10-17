import assert from 'node:assert/strict';
import {createFlight,simulate,assessLanding} from '../public/play/physics.js';
const rotate=(axis,degrees)=>{const half=degrees*Math.PI/360;return {x:0,y:0,z:0,w:Math.cos(half),[axis]:Math.sin(half)};};
const landed=(q={x:0,y:0,z:0,w:1},extra={})=>({...createFlight(),phase:'end',x:10,y:1.05,vx:20,vy:-5,q,...extra});
assert(assessLanding(landed()).valid);
assert(assessLanding(landed(rotate('x',25))).valid);
assert(!assessLanding(landed(rotate('x',25.1))).valid);
assert(!assessLanding(landed(rotate('x',90))).valid);
assert(!assessLanding(landed(rotate('x',180))).valid);
assert(!assessLanding(landed(rotate('z',40))).valid);
assert(!assessLanding(landed(undefined,{vx:-20})).valid);
assert(!assessLanding(landed(undefined,{vx:0,vz:20})).valid);
assert(assessLanding(landed(rotate('y',180),{vx:-20})).valid,'World-backward travel is valid when the car faces that direction.');
assert(assessLanding(landed(undefined,{vx:0,vy:-20})).valid);
assert(!assessLanding({...landed(),phase:'flight'}).valid);
const x=-10,join=-28*Math.sin(1.35),u=x-join,slope=u/Math.sqrt(28*28-u*u),angle=Math.atan(slope);
assert(assessLanding(landed(rotate('z',angle*180/Math.PI),{x,vx:10*Math.cos(angle),vy:10*Math.sin(angle)})).valid,'Wheels align with the ramp surface.');
for(const [q,expected]of [[rotate('x',180),false],[rotate('z',0),true]]){const f={...createFlight(),phase:'flight',x:10,y:1.06,vx:20,vy:-5,q};simulate(f,{pitch:0,roll:0,boost:0});assert.equal(f.phase,'end');assert.equal(f.landing.valid,expected);}
const controlled=createFlight();while(controlled.phase!=='end'&&controlled.frame<14400){simulate(controlled,{pitch:controlled.phase==='run'?0:Math.max(-1,Math.min(1,(.15-controlled.a)*2-controlled.av*.7)),roll:0,boost:1});}
assert.equal(controlled.phase,'end');assert(assessLanding(controlled).valid);assert(controlled.distance>0);
console.log('Passed: upright/tilt limits, inverted/sideways/reverse rejection, travel-relative heading, ramp surface, first-contact validation, controlled valid flight.');
