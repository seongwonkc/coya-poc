// script.js — engine update: crime & substance systems, justice bias, new stats
// Deterministic, offline. Works with updated data.js.

document.addEventListener('DOMContentLoaded', () => {
  const creationScreen = document.getElementById('character-creation');
  const gameContainer = document.getElementById('game-container');
  const storyContainer = document.getElementById('story-container');
  const choiceContainer = document.getElementById('choice-container');
  const newGameBtn = document.getElementById('new-game-btn');
  const exportBtn = document.getElementById('export-btn');

  const createCharacterBtn = document.getElementById('create-character-btn');
  const nameInput = document.getElementById('name-input');
  const raceSelect = document.getElementById('race-select');

  const statAge = document.getElementById('stat-age');
  const statHealth = document.getElementById('stat-health');
  const statWealth = document.getElementById('stat-wealth');

  const inputArea = document.getElementById('input-area');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');

  const actions = GAME_DATA.actions;
  const races = GAME_DATA.races;
  const templates = GAME_DATA.templates || { childhood: {} };

  // RNG
  function mulberry32(a){return function(){var t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  let rng = Math.random; function roll(){return rng();}

  let character = null;

  function append(html, cls='ai-text'){const p=document.createElement('div');p.className=cls;p.innerHTML=html;storyContainer.appendChild(p);storyContainer.scrollTop=storyContainer.scrollHeight;}
  function clearChoices(){choiceContainer.innerHTML='';}
  function renderStats(){if(!character)return; statAge.textContent=character.age; statHealth.textContent=Math.round(character.health); statWealth.textContent=`$${Math.round(character.wealth).toLocaleString()}`;}
  function save(){try{localStorage.setItem('lifeSimCharacter',JSON.stringify(character));localStorage.setItem('lifeSimStory',storyContainer.innerHTML);}catch(e){}}
  function load(){try{const s=localStorage.getItem('lifeSimCharacter');if(!s)return false;character=JSON.parse(s);storyContainer.innerHTML=localStorage.getItem('lifeSimStory')||'';rng=mulberry32((Date.parse(character.id)&0xffffffff)^(character.multipliers?.seedOffset||0));renderStats();creationScreen.classList.add('hidden');gameContainer.classList.remove('hidden');return true;}catch(e){return false}}

  function createBaseCharacter(name,raceKey){const r=races[raceKey]||races.white;const seed=(Date.now()&0xffffffff)^(r.seedOffset||0);rng=mulberry32(seed);return{ id:`char_${Date.now()}`, name, race:raceKey, age:18, monthsPassed:0, health:100, wealth:500, academicPerformance:0, addiction:0, flags:{}, multipliers:{...r}, memory:{ household:{ guardians:'two-parent', employment: r.incomeBracket==='low'?'min_wage':'salaried', income_bracket:r.incomeBracket||'middle', housing: r.incomeBracket==='low'?'rental':'owned'}, schooling:{ elem_funding:r.schoolFundingLevel, middle_funding:r.schoolFundingLevel, high_funding:r.schoolFundingLevel, ap_access:r.schoolFundingLevel==='high', tracking:'standard' }, health:{ coverage: r.incomeBracket==='low'?'medicaid':'employer', chronic_conditions:[] }, neighborhood:{ crime:r.crimeExposure||'mid', policing_pressure: r.crimeExposure==='high'?'high':'mid' }, social:{ enrichment_access:r.schoolFundingLevel==='high'?'rich':'limited', networks:[] }, timeline:[] } } }

  // Childhood (same as earlier deterministic templates)
  const phases=[{label:'PreK',start:0,end:4},{label:'Elementary',start:5,end:10},{label:'Middle',start:11,end:13},{label:'High',start:14,end:17}];
  function renderTemplate(str,ctx){return (str||'').replace(/\{\{(\w+)\}\}/g,(m,k)=>ctx[k]??'');}
  function buildPhaseCtx(){const m=character.multipliers,mem=character.memory;const schoolQ=m.schoolFundingLevel==='high'?'well‑resourced':(m.schoolFundingLevel==='mid'?'moderately resourced':'under‑resourced');return{ name:character.name, early_quality:m.schoolFundingLevel==='high'?'a rich early learning environment':(m.schoolFundingLevel==='mid'?'a modest early environment':'limited early exposure'), household_desc:`${mem.household.employment} guardians in a ${mem.household.income_bracket}-income household`, health_desc: mem.health.coverage==='medicaid'?'Medicaid coverage with delays':'employer/private coverage', literacy: (roll()<0.6)?'showed early interest in books':'had uneven practice', nutrition: m.schoolFundingLevel==='low'?'often budget-constrained':'adequate overall', neighborhood: mem.neighborhood.crime==='low'?'a relatively safe neighborhood':'a neighborhood with safety concerns', overall: (m.schoolFundingLevel==='high'||mem.household.income_bracket==='middle')?'progressed well':'faced constraints', class_size: m.schoolFundingLevel==='high'?'small (≈18)':(m.schoolFundingLevel==='mid'?'medium (22–26)':'large (28+)'), teacher_quality: roll()<0.6?'strong mentoring from a teacher':'limited individual attention', extras: mem.social.enrichment_access==='rich'?'clubs and private lessons':'few affordable options', tracking:'standard', tests:'standardized tests shaped priorities', school_quality: schoolQ, middle_quality: schoolQ, peers: roll()<0.7?'supportive peers':'mixed peer climate', counsel: roll()<0.5?'counseling helped at times':'limited counseling', timepress:'some family obligations plus homework', high_quality: schoolQ, ap: mem.schooling.ap_access?'AP/honors available':'limited AP access', work: roll()<0.4?'part‑time work during school':'no steady job during school', guidance: roll()<0.6?'useful guidance counseling':'under‑resourced guidance', internship: roll()<0.15?'a brief internship/job‑shadow':'no internship access', policing: mem.neighborhood.policing_pressure==='high'?'heightened police presence':'typical policing' } }
  function runChildhoodPhases(){append(`<strong>Beginning childhood simulation for ${character.name}...</strong>`, 'ai-text event-text');for(const ph of phases){character.age=ph.start;renderStats();const ctx=buildPhaseCtx();const t=(templates.childhood||{})[ph.label]||'';const para=renderTemplate(t,ctx);let healthDelta=0,wealthDelta=0,acadDelta=0;const fund=character.multipliers.schoolFundingLevel;if(fund==='low'){acadDelta-=2;healthDelta-=1}else if(fund==='high'){acadDelta+=2;wealthDelta+=200} if(character.memory.household.income_bracket==='low'){wealthDelta-=400;acadDelta-=1} if(roll()< (0.12+(fund==='low'?0.08:0))){character.memory.timeline.push({phase:ph.label,event:'hardship',desc:'Family financial shock.'});wealthDelta-=800;acadDelta-=1} character.health+=healthDelta;character.wealth+=wealthDelta;character.academicPerformance+=acadDelta;append(`<strong>${ph.label} (${ph.start}–${ph.end}):</strong> ${para}`,'ai-text');character.memory.timeline.push({phase:ph.label,age_range:`${ph.start}-${ph.end}`,summary:para.slice(0,140)});character.age=ph.end+1; save();} append('<strong>Childhood complete — adulthood begins.</strong>','ai-text event-text'); inputArea.style.display='block'; presentTurnChoices(); }

  // ===== ACTION ENGINE with justice & substance effects =====
  function flag(key){return !!character.flags[key];}
  function setFlags(obj){ if(!obj) return; for(const k of Object.keys(obj)){ character.flags[k]=obj[k]; } }
  function flagKeyVal(spec){ const [k,v]=spec.split(':'); return [k, v==="true"?true:(v==="false"?false:v)]; }
  function satisfiesRequires(req={}){
    if(req.age_min!==undefined && character.age<req.age_min) return false;
    if(req.age_max!==undefined && character.age>req.age_max) return false;
    if(req.wealth_min!==undefined && character.wealth<req.wealth_min) return false;
    if(req.flags_all){ for(const spec of req.flags_all){ const [k,v]=flagKeyVal(spec); if((character.flags[k]??null)!==v) return false; } }
    if(req.flags_any){ let ok=false; for(const spec of req.flags_any){ const [k,v]=flagKeyVal(spec); if((character.flags[k]??null)===v || ((v===undefined)&&flag(k))) { ok=true; break; } } if(!ok) return false; }
    if(req.flags_not){ for(const spec of req.flags_not){ const [k,v]=flagKeyVal(spec); if((character.flags[k]??null)===v) return false; } }
    return true;
  }

  function systemicChanceMods(a, base){
    let p=base;
    // Hiring bias lowers job chances
    if(a.tags?.includes('job')) p*= (1 - (character.multipliers.hiringBias||0));
    // Justice disadvantage: make negative justice outcomes more likely
    if(a.tags?.includes('justice')) p+= (character.multipliers.justiceSystemDisadvantage||0)*-0.05; // baseline nudge
    // Substance use makes many actions harder
    if(character.addiction>=30 && (a.tags?.includes('job')||a.tags?.includes('college'))) p-=0.05;
    if(character.addiction>=60 && (a.tags?.includes('job')||a.tags?.includes('college'))) p-=0.1;

    // Custom mods from data
    if(a.mods){
      const mods=a.mods;
      if(mods.schoolFundingLevel){ const lvl=character.multipliers.schoolFundingLevel; const delta=mods.schoolFundingLevel; if(lvl==='high') p+=0.05*delta; else if(lvl==='mid') p+=0.02*delta; else p+=-0.03*delta; }
      if(mods.familySupportChance){ p+= 0.1*mods.familySupportChance*(character.multipliers.familySupportChance||0); }
      if(mods.hiringBias){ p+= (-(character.multipliers.hiringBias||0))*Math.abs(mods.hiringBias); }
      if(mods.crimeExposure){ p+= (character.multipliers.crimeExposure==='high'?0.05:0.0)*mods.crimeExposure; }
      if(mods.medicalTreatmentModifier){ p+= (character.multipliers.medicalTreatmentModifier||0)*mods.medicalTreatmentModifier; }
      if(mods.academicPerformance){ p+= (character.academicPerformance/20)*mods.academicPerformance; }
    }
    return Math.max(0.05, Math.min(0.95, p));
  }

  function weightedPick(outcomes){ let r=roll(); let cum=0; for(const o of outcomes){ cum+=o.chance; if(r<=cum) return o; } return outcomes[outcomes.length-1]; }

  // Post-turn systemic drips (addiction drain, policing exposure, relapse/overdose risk)
  function postTurnRisks(){
    let notes=[];
    // Addiction passive effects
    if(character.addiction>=20){ const drain = character.addiction>=60? -4 : (character.addiction>=40? -2 : -1); character.health+=drain; if(drain<0) notes.push(`Health ${drain}`); character.wealth += (character.addiction>=40? -50 : -20); }
    // Overdose emergency (rare; higher with high addiction & medical access)
    const odBase = (character.addiction>=70)? 0.06 : (character.addiction>=50? 0.02 : 0.0);
    if(roll()<odBase){ character.health -= 12; character.wealth -= 400; character.memory.timeline.push({phase:'Adult', event:'overdose_emergency'}); append(`<strong>Emergency:</strong> Overdose scare leads to hospital bills and recovery time.`,'ai-text event-text'); }
    // Random police contact if record or high crime exposure
    const policeP = (character.flags.record?0.06:0.02) + (character.multipliers.crimeExposure==='high'?0.03:0);
    if(roll()<policeP){ append(`<strong>Encounter:</strong> A police stop adds stress and time lost.`,'ai-text event-text'); character.health -= 1; }
    if(notes.length){ append(`<small>Ongoing effects: ${notes.join(', ')}</small>`,'ai-text'); }
  }

  function presentTurnChoices(){
    clearChoices();
    const elig = Object.entries(actions).filter(([id,a])=>satisfiesRequires(a.requires||{}));
    if(elig.length===0){ append('No eligible actions right now. Try working to build resources.','ai-text event-text'); return; }
    append('<em>Choose an action:</em>','ai-text event-text');
    // Prioritize diversity of tags, but bias toward support if addiction/record present
    const prioritized = [];
    const wantSupport = (character.addiction>=30)||character.flags.record;
    const tagOrder = wantSupport ? ['substance','justice','job','college','finance','health','housing','network','trade','school'] : ['job','college','finance','school','network','health','housing','justice','substance','trade'];
    for(const tag of tagOrder){
      const found = elig.find(([id,a])=>a.tags?.includes(tag));
      if(found && !prioritized.some(x=>x[0]===found[0])) prioritized.push(found);
      if(prioritized.length>=6) break;
    }
    for(const [id,a] of prioritized){ const btn=document.createElement('button'); btn.className='choice-btn'; btn.textContent=a.label; btn.onclick=()=>resolveAction(id); choiceContainer.appendChild(btn); }
  }

  function resolveAction(actionId){
    const a=actions[actionId]; if(!a) return;
    // upfront costs
    if(a.cost){ character.wealth+=(a.cost.wealth||0)*-1; character.health+=(a.cost.health||0)*-1; }

    // Compute baseline (used for display only; outcomes themselves are weightedPick)
    const p = systemicChanceMods(a, a.baseChance||0.5);

    // Pick weighted outcome
    const out = weightedPick(a.outcomes||[{id:'neutral',chance:1,text:'Nothing much happens.',effects:{}}]);

    // Apply effects (including addiction delta if present)
    const fx = out.effects||{};
    if(fx.durationMonths){ character.monthsPassed+=fx.durationMonths; while(character.monthsPassed>=12){ character.age++; character.monthsPassed-=12; } }
    if(typeof fx.health==='number') character.health += fx.health;
    if(typeof fx.wealth==='number') character.wealth += fx.wealth;
    if(typeof fx.academicPerformance==='number') character.academicPerformance += fx.academicPerformance;
    if(typeof fx.addiction==='number') character.addiction = Math.max(0, Math.min(100, character.addiction + fx.addiction));

    if(out.flags_set) setFlags(out.flags_set);

    // Record + narrate
    append(`<strong>Action — ${a.label}:</strong> ${out.text} <br><small>Baseline chance: ${(p*100).toFixed(0)}%</small>`, 'ai-text event-text');
    character.memory.timeline.push({ phase:'Adult', age:character.age, action:actionId, outcome:out.id, text:out.text, addiction:character.addiction, flags:{...character.flags} });

    renderStats();
    postTurnRisks();
    save();
    presentTurnChoices();
  }

  // Export / New game / Create
  exportBtn?.addEventListener('click',()=>{ if(!character) return; const obj={ name:character.name,race:character.race,age:character.age,health:character.health,wealth:character.wealth,acad:character.academicPerformance,addiction:character.addiction,flags:character.flags,timeline:character.memory.timeline }; const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${character.name}_summary.json`; a.click(); URL.revokeObjectURL(url); });
  newGameBtn?.addEventListener('click',()=>{ if(confirm('Start a new game?')){ localStorage.clear(); location.reload(); }});

  createCharacterBtn?.addEventListener('click',()=>{
    const nm=(nameInput.value||'Frank').trim(); const race=raceSelect.value||'black';
    character=createBaseCharacter(nm,race);
    rng=mulberry32((Date.now()&0xffffffff)^(character.multipliers.seedOffset||0));
    creationScreen.classList.add('hidden'); gameContainer.classList.remove('hidden'); storyContainer.innerHTML=''; renderStats(); save();
    runChildhoodPhases();
  });

  if(!load()) { creationScreen.classList.remove('hidden'); gameContainer.classList.add('hidden'); } else { inputArea.style.display='block'; presentTurnChoices(); }

  sendButton?.addEventListener('click',()=>{ const txt=(userInput.value||'').toLowerCase(); userInput.value=''; const map={ 'college':'apply_state_university', 'community':'apply_community_college', 'job':'take_entry_job', 'apprentice':'join_union_apprentice', 'loan':'take_student_loan', 'mentor':'seek_mentor', 'police':'stop_and_frisk', 'health':'health_crisis', 'housing':'face_housing_shock', 'invest':'save_and_invest', 'rehab':'seek_rehab', 'diversion':'diversion_program', 'expunge':'record_expungement', 'probation':'probation_checkin', 'substance':'experiment_substance', 'theft':'petty_offense_steal'}; const key=Object.keys(map).find(k=>txt.includes(k)); if(key){ resolveAction(map[key]); } else { append('Try: college, community, job, apprentice, loan, mentor, police, health, housing, invest, rehab, diversion, expunge, probation, substance, theft.','ai-text event-text'); } });
});
