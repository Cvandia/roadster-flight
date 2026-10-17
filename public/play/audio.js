export function createAudio(){
 let context,master,motorGain,harmonicGain,jetGain,windGain,motor,harmonic,jetFilter,muted=false;
 function init(){
  if(context){context.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  context=new AC();master=context.createGain();master.gain.value=muted?0:.65;
  const limiter=context.createDynamicsCompressor();limiter.threshold.value=-14;limiter.ratio.value=5;master.connect(limiter);limiter.connect(context.destination);
  motor=context.createOscillator();motor.type='sine';motor.frequency.value=85;motorGain=context.createGain();motorGain.gain.value=0;motor.connect(motorGain).connect(master);motor.start();
  harmonic=context.createOscillator();harmonic.type='triangle';harmonic.frequency.value=170;harmonicGain=context.createGain();harmonicGain.gain.value=0;const motorFilter=context.createBiquadFilter();motorFilter.type='lowpass';motorFilter.frequency.value=1200;harmonic.connect(motorFilter).connect(harmonicGain).connect(master);harmonic.start();
  const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;
  jetFilter=context.createBiquadFilter();jetFilter.type='bandpass';jetFilter.frequency.value=2400;jetFilter.Q.value=.55;jetGain=context.createGain();jetGain.gain.value=0;noise.connect(jetFilter).connect(jetGain).connect(master);
  const windFilter=context.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=450;windGain=context.createGain();windGain.gain.value=0;noise.connect(windFilter).connect(windGain).connect(master);noise.start();
 }
 function update(f,state,throttle,paused){if(!context)return;const t=context.currentTime,active=!paused&&['run','flight'].includes(state),speed=Math.hypot(f.vx,f.vy,f.vz||0);const road=state==='run';motor.frequency.setTargetAtTime(75+Math.min(speed,150)*6,t,.08);harmonic.frequency.setTargetAtTime(150+Math.min(speed,150)*12,t,.08);motorGain.gain.setTargetAtTime(active?(road?.035+speed*.0003:.007):0,t,.1);harmonicGain.gain.setTargetAtTime(active?(road?.014+speed*.0001:.002):0,t,.1);jetGain.gain.setTargetAtTime(active&&state==='flight'&&f.fuel>0?throttle*.23:0,t,.035);jetFilter.frequency.setTargetAtTime(1600+throttle*2300,t,.06);windGain.gain.setTargetAtTime(active?Math.min(.075,speed*.0005):0,t,.2);}
 return {unlock:init,update,toggle(){muted=!muted;if(context)master.gain.setTargetAtTime(muted?0:.65,context.currentTime,.04);return muted;}};
}
