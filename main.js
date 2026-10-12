(() => {
  const lane=document.querySelector('.lane');
  lane.inert=true;lane.setAttribute('aria-hidden','true');
  const polaroids=[...document.querySelectorAll('.polaroid')];
  const photoKey='mom-memory-lane-photos-v3';
  const soundToggle=document.querySelector('.sound-toggle');
  const memorySong=new Audio('yesSong.mp3');
  memorySong.loop=true;
  memorySong.preload='auto';
  const memoryToggle=document.querySelector('.memory-toggle');
  const petals=document.querySelector('.petal-layer');
  const passwordGate=document.querySelector('#password-gate');
  const passwordForm=document.querySelector('#password-form');
  const passwordInput=document.querySelector('#birthday-password');
  const passwordError=document.querySelector('#password-error');
  const birthdayGate=document.querySelector('#birthday-gate');
  const letsGo=document.querySelector('#lets-go');
  passwordInput.focus({preventScroll:true});
  passwordForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(passwordInput.value!=='1234'){passwordError.hidden=false;passwordInput.setAttribute('aria-invalid','true');passwordInput.select();return;}
    passwordError.hidden=true;passwordInput.removeAttribute('aria-invalid');passwordGate.classList.add('leaving');
    setTimeout(()=>{passwordGate.hidden=true;passwordGate.setAttribute('aria-hidden','true');birthdayGate.classList.add('show');birthdayGate.setAttribute('aria-hidden','false');letsGo.focus({preventScroll:true});},520);
  });
  passwordInput.addEventListener('input',()=>{passwordError.hidden=true;passwordInput.removeAttribute('aria-invalid');});
  letsGo.addEventListener('click',()=>{birthdayGate.classList.remove('show');birthdayGate.setAttribute('aria-hidden','true');document.body.classList.remove('is-locked');lane.hidden=false;lane.inert=false;lane.setAttribute('aria-hidden','false');startMusic();setAutoPaused(true);soundToggle.setAttribute('aria-pressed','true');soundToggle.setAttribute('aria-label','Turn birthday music off');soundToggle.querySelector('.sound-label').textContent='sound on';setTimeout(()=>birthdayGate.hidden=true,700);});
  let audioContext=null,musicGain=null,musicTimer=null,noteIndex=0,musicAllowed=true,fileSongStarted=false;

  // Advance to the next memory every three seconds; pause while Mom explores.
  const imageInterval=3000;
  let autoPaused=true,autoTimer=0,wheelSnapTimer=0,touchSnapTimer=0,wheelStartStop=0,touchStartStop=0;
  function updateMemoryToggle(){
    memoryToggle.setAttribute('aria-pressed',String(!autoPaused));
    memoryToggle.setAttribute('aria-label',autoPaused?'Resume automatic memory lane scroll':'Pause automatic memory lane scroll');
    memoryToggle.querySelector('.memory-toggle-label').textContent=autoPaused?'auto-scroll paused':'auto-scroll on';
    memoryToggle.querySelector('.memory-toggle-icon').textContent=autoPaused?'▶':'Ⅱ';
  }
  function getScrollStops(){
    const end=Math.max(0,lane.scrollWidth-lane.clientWidth);
    return [...lane.querySelectorAll(':scope > .panel, :scope > .polaroid')]
      .map(item=>Math.max(0,Math.min(end,item.offsetLeft+item.offsetWidth/2-lane.clientWidth/2)))
      .filter((stop,index,all)=>index===0||stop-all[index-1]>2);
  }
  function nearestScrollStop(position=lane.scrollLeft){const stops=getScrollStops();return stops.reduce((best,stop)=>Math.abs(stop-position)<Math.abs(best-position)?stop:best,stops[0]??0);}
  function scheduleNextImage(){
    clearTimeout(autoTimer);
    if(autoPaused||document.hidden||document.body.classList.contains('is-locked'))return;
    autoTimer=setTimeout(advanceToNextImage,imageInterval);
  }
  function advanceToNextImage(){
    if(autoPaused||document.hidden)return;
    const stops=getScrollStops();
    const next=stops.find(stop=>stop>lane.scrollLeft+24);
    if(next===undefined){lane.scrollTo({left:0,behavior:'smooth'});scheduleNextImage();return;}
    lane.scrollTo({left:next,behavior:'smooth'});
    scheduleNextImage();
  }
  function setAutoPaused(paused){
    autoPaused=paused;clearTimeout(autoTimer);
    updateMemoryToggle();
    if(!autoPaused)scheduleNextImage();
  }
  memoryToggle.addEventListener('click',()=>{
    if(autoPaused){if(lane.scrollLeft>=lane.scrollWidth-lane.clientWidth-2)lane.scrollLeft=0;setAutoPaused(false);}
    else setAutoPaused(true);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clearTimeout(autoTimer);
    else if(!autoPaused)scheduleNextImage();
  });
  updateMemoryToggle();

  // Route the mouse wheel across the full-screen horizontal memory lane.
  document.addEventListener('wheel',event=>{
    if(document.body.classList.contains('is-locked'))return;
    let delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
    if(event.shiftKey&&event.deltaY)delta=event.deltaY;
    if(!delta)return;
    const unit=event.deltaMode===1?18:event.deltaMode===2?lane.clientWidth*.85:1;
    event.preventDefault();
    if(!wheelSnapTimer)wheelStartStop=nearestScrollStop();
    lane.scrollTo({left:lane.scrollLeft+delta*unit,behavior:'instant'});
    clearTimeout(wheelSnapTimer);
    wheelSnapTimer=setTimeout(()=>{
      const nearest=nearestScrollStop();
      lane.scrollTo({left:nearest,behavior:'smooth'});
      if(Math.abs(nearest-wheelStartStop)>2)setAutoPaused(false);
      wheelSnapTimer=0;
    },180);
  },{passive:false,capture:true});
  lane.addEventListener('touchstart',()=>{touchStartStop=nearestScrollStop();},{passive:true});
  lane.addEventListener('touchend',()=>{clearTimeout(touchSnapTimer);touchSnapTimer=setTimeout(()=>{const nearest=nearestScrollStop();lane.scrollTo({left:nearest,behavior:'smooth'});if(Math.abs(nearest-touchStartStop)>2)setAutoPaused(false);},180);},{passive:true});
  // Background flowers drift very slightly against the scrolling photos.
  lane.addEventListener('scroll',()=>{document.querySelector('.ambient').style.backgroundPosition=`center calc(46% + ${lane.scrollLeft*.025}px)`;if(lane.scrollLeft>5)startFileSong();},{passive:true});
  lane.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const start=nearestScrollStop();lane.scrollBy({left:(event.key==='ArrowRight'?1:-1)*lane.clientWidth*.72,behavior:'smooth'});setTimeout(()=>{const nearest=nearestScrollStop();lane.scrollTo({left:nearest,behavior:'smooth'});if(Math.abs(nearest-start)>2)setAutoPaused(false);},260);}});
  const loadPhotos=()=>{try{return JSON.parse(localStorage.getItem(photoKey)||'{}')}catch{return {}}};
  const savedPhotos=loadPhotos();
  polaroids.forEach(card=>{
    const id=card.dataset.memory;
    const image=card.querySelector('.photo-wrap img');
    const caption=card.querySelector('.photo-caption');
    if(savedPhotos[id]?.src)image.src=savedPhotos[id].src;
    if(savedPhotos[id]?.caption&&savedPhotos[id].caption.trim().toLowerCase()!=='temp'&&!caption.classList.contains('date-main'))caption.textContent=savedPhotos[id].caption;
    caption.addEventListener('input',()=>saveCard(id,card));

  });
  function saveCard(id,card){
    const all=loadPhotos();all[id]={src:card.querySelector('img').src.startsWith('data:')?card.querySelector('img').src:'',caption:card.querySelector('.photo-caption').innerText.trim()};
    try{localStorage.setItem(photoKey,JSON.stringify(all));}catch{}
  }


  // A bright Happy Birthday ringtone leads into the soft looping instrumental.
  const birthdayRingtone=[
    [293.66,1],[293.66,1],[329.63,2],[293.66,2],[392,2],[369.99,4],
    [293.66,1],[293.66,1],[329.63,2],[293.66,2],[440,2],[392,4],
    [293.66,1],[293.66,1],[587.33,2],[493.88,2],[392,2],[369.99,2],[329.63,4],
    [523.25,1],[523.25,1],[493.88,2],[392,2],[440,2],[392,4]
  ];
  let ringtoneIndex=0;
  function startMusic(){if(!musicAllowed||fileSongStarted)return;if(!audioContext){
    const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor)return;
    audioContext=new AudioCtor();musicGain=audioContext.createGain();musicGain.gain.setValueAtTime(.0001,audioContext.currentTime);musicGain.connect(audioContext.destination);audioContext.resume();musicGain.gain.exponentialRampToValueAtTime(.14,audioContext.currentTime+1.1);scheduleBirthdayNote();
  }else{if(audioContext.state==='suspended')audioContext.resume();if(!musicTimer){musicGain.gain.setTargetAtTime(.14,audioContext.currentTime,.35);scheduleNote();}}}
  function startFileSong(){
    if(fileSongStarted||!musicAllowed)return;
    fileSongStarted=true;
    if(musicTimer){clearTimeout(musicTimer);musicTimer=null;}
    if(musicGain&&audioContext)musicGain.gain.setTargetAtTime(.0001,audioContext.currentTime,.18);
    memorySong.volume=.45;
    memorySong.play().catch(()=>{fileSongStarted=false;});
  }
  function scheduleBirthdayNote(){
    if(!audioContext||!musicAllowed)return;
    if(ringtoneIndex>=birthdayRingtone.length){scheduleNote();return;}
    const [frequency,beats]=birthdayRingtone[ringtoneIndex++],now=audioContext.currentTime,duration=beats*.28;
    const osc=audioContext.createOscillator(),tone=audioContext.createBiquadFilter(),gain=audioContext.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(frequency,now);tone.type='lowpass';tone.frequency.value=1800;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.48,now+.035);gain.gain.setTargetAtTime(.0001,now+Math.max(.06,duration-.08),.035);
    osc.connect(tone);tone.connect(gain);gain.connect(musicGain);osc.start(now);osc.stop(now+duration);
    musicTimer=setTimeout(scheduleBirthdayNote,duration*1000);
  }
  const melody=[261.63,392,329.63,392,293.66,440,349.23,392,261.63,329.63,392,329.63,220,293.66,349.23,293.66];
  function scheduleNote(){if(!audioContext||!musicAllowed)return;const now=audioContext.currentTime,frequency=melody[noteIndex%melody.length];noteIndex++;
    const osc=audioContext.createOscillator(),tone=audioContext.createBiquadFilter(),gain=audioContext.createGain();osc.type='triangle';osc.frequency.setValueAtTime(frequency,now);tone.type='lowpass';tone.frequency.value=1500;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.22,now+.035);gain.gain.exponentialRampToValueAtTime(.0001,now+1.05);osc.connect(tone);tone.connect(gain);gain.connect(musicGain);osc.start(now);osc.stop(now+1.1);musicTimer=setTimeout(scheduleNote,620);
  }
  function chime(){if(!audioContext||!musicAllowed)return;const now=audioContext.currentTime;[523.25,659.25,783.99].forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,now+i*.11);g.gain.exponentialRampToValueAtTime(.12,now+i*.11+.025);g.gain.exponentialRampToValueAtTime(.0001,now+i*.11+1.15);o.connect(g);g.connect(audioContext.destination);o.start(now+i*.11);o.stop(now+i*.11+1.2);});}
  soundToggle.addEventListener('click',()=>{
    if(!musicAllowed){musicAllowed=true;if(fileSongStarted)memorySong.play().catch(()=>{});else if(lane.scrollLeft>5)startFileSong();else startMusic();soundToggle.setAttribute('aria-pressed','true');soundToggle.setAttribute('aria-label','Turn birthday music off');soundToggle.querySelector('.sound-label').textContent='sound on';}
    else{musicAllowed=false;if(musicTimer){clearTimeout(musicTimer);musicTimer=null;}if(musicGain&&audioContext)musicGain.gain.setTargetAtTime(.0001,audioContext.currentTime,.2);memorySong.pause();soundToggle.setAttribute('aria-pressed','false');soundToggle.setAttribute('aria-label','Turn birthday music on');soundToggle.querySelector('.sound-label').textContent='sound off';}
  });
  let petalsReleased=false;const candles=[...document.querySelectorAll('.candle')];
  startAmbientPetals();
  candles.forEach(candle=>candle.addEventListener('click',()=>{
    if(petalsReleased)return;
    petalsReleased=true;startMusic();candles.forEach(item=>{item.classList.add('out');item.setAttribute('aria-pressed','true');});
    chime();releasePetals();document.querySelector('.wish-prompt').textContent='Your wish is on its way, Mom. ♥';
  }));
  function startAmbientPetals(){const count=10;for(let i=0;i<count;i++){const petal=document.createElement('i');petal.className='petal ambient-petal';petal.style.left=`${((i+.5)*100/count)+(Math.random()*5-2.5)}vw`;petal.style.setProperty('--drift',`${Math.random()*90-45}px`);petal.style.setProperty('--fall-time',`${18+Math.random()*9}s`);petal.style.setProperty('--delay',`${i*2+Math.random()*2}s`);petals.append(petal);}}
  function releasePetals(){const count=18;for(let i=0;i<count;i++){const petal=document.createElement('i');petal.className='petal';petal.style.left=`${3+i*94/(count-1)+Math.random()*2}vw`;petal.style.setProperty('--drift',`${Math.random()*150-75}px`);petal.style.setProperty('--fall-time',`${7+Math.random()*3}s`);petal.style.setProperty('--delay',`${Math.random()*1.8}s`);petals.append(petal);setTimeout(()=>petal.remove(),12000);}}
})();






