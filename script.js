document.addEventListener('DOMContentLoaded', () => {
  // =========================================================
  //  Choose Your American Adventure — FULL FRONTEND REWRITE
  //  • Childhood sim by education phases (Pre‑K, K‑5, 6‑8, 9‑12)
  //  • Robust JSON parsing of AI responses
  //  • Correct Netlify path: /.netlify/functions/get-ai-response
  //  • Clean adult turn loop using actions.json
  //  • State save/restore hooks
  // =========================================================

  // ---------- DOM ----------
  const creationScreen = document.getElementById('character-creation');
  const gameContainer = document.getElementById('game-container');
  const storyContainer = document.getElementById('story-container');
  const choiceContainer = document.getElementById('choice-container');

  const newGameBtn = document.getElementById('new-game-btn');
  const newGameBtnInGame = document.getElementById('new-game-btn-ingame');
  const createCharacterBtn = document.getElementById('create-character-btn');

  const nameInput = document.getElementById('name-input');
  const raceSelect = document.getElementById('race-select');

  const statAge = document.getElementById('stat-age');
  const statHealth = document.getElementById('stat-health');
  const statWealth = document.getElementById('stat-wealth');

  const inputArea = document.getElementById('input-area');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');

  // ---------- GLOBAL STATE ----------
  let realWorldStats = {}; // from data.json
  let gameActions = {};    // from actions.json
  let character = null;    // active run
  let isAwaitingInput = false;

  // ---------- UI HELPERS ----------
  function clearChoices() { choiceContainer.innerHTML = ''; }

  function appendNarration(html) {
    const p = document.createElement('p');
    p.className = 'ai-text';
    p.innerHTML = html;
    storyContainer.appendChild(p);
    storyContainer.scrollTop = storyContainer.scrollHeight;
  }

  function appendEvent(html) {
    const div = document.createElement('div');
    div.className = 'ai-text event-text';
    div.innerHTML = html;
    storyContainer.appendChild(div);
    storyContainer.scrollTop = storyContainer.scrollHeight;
  }

  function showThinking(text = 'Thinking…') {
    const div = document.createElement('div');
    div.id = 'thinking';
    div.className = 'ai-text event-text';
    div.textContent = text;
    storyContainer.appendChild(div);
    storyContainer.scrollTop = storyContainer.scrollHeight;
  }
  function hideThinking() { document.getElementById('thinking')?.remove(); }

  function displayError(msg) {
    const div = document.createElement('div');
    div.className = 'ai-text event-text error';
    div.innerHTML = `<strong>AI Error:</strong> ${escapeHtml(String(msg))}`;
    storyContainer.appendChild(div);
    storyContainer.scrollTop = storyContainer.scrollHeight;
  }

  function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

  function renderStats() {
    if (!character) return;
    statAge.textContent = String(character.age);
    statHealth.textContent = String(Math.round(character.health));
    statWealth.textContent = `$${Math.round(character.wealth).toLocaleString()}`;
  }

  function saveState() {
    try {
      localStorage.setItem('lifeSimCharacter', JSON.stringify(character));
      localStorage.setItem('lifeSimStory', storyContainer.innerHTML);
    } catch {}
  }
  function restoreState() {
    try {
      const c = localStorage.getItem('lifeSimCharacter');
      const s = localStorage.getItem('lifeSimStory');
      if (!c) return false;
      character = JSON.parse(c);
      if (s) storyContainer.innerHTML = s;
      renderStats();
      creationScreen.style.display = 'none';
      gameContainer.style.display = 'block';
      inputArea.style.display = 'block';
      return true;
    } catch { return false; }
  }

  function resetRun() {
    localStorage.removeItem('lifeSimCharacter');
    localStorage.removeItem('lifeSimStory');
    character = null;
    storyContainer.innerHTML = '';
    clearChoices();
    inputArea.style.display = 'none';
    creationScreen.style.display = 'block';
    gameContainer.style.display = 'none';
  }

  // ---------- ROBUST AI JSON ----------
  function stripCodeWrappers(text) {
    return text.replace(/```(?:json)?/gi, '').replace(/```/g, '').replace(/​/g, '').trim();
  }
  function extractJsonObject(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1);
    throw new Error('No JSON object found in AI response.');
  }
  function parseAIJson(rawText) {
    try { return JSON.parse(rawText); } catch {}
    const stripped = stripCodeWrappers(rawText);
    try { return JSON.parse(stripped); } catch {}
    const maybe = extractJsonObject(stripped);
    try { return JSON.parse(maybe); } catch {
      console.error('AI raw text (unparsed):', rawText);
      throw new Error('AI did not return valid JSON.');
    }
  }
  async function callAI(userInput) {
    const res = await fetch('/.netlify/functions/get-ai-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput })
    });
    if (!res.ok) {
      let err = `API error: ${res.status} ${res.statusText}`;
      try { err += ' – ' + (await res.text()); } catch {}
      throw new Error(err);
    }
    const text = await res.text();
    return parseAIJson(text);
  }

  // ---------- DATA LOADING ----------
  async function loadGameData() {
    const [stats, actions] = await Promise.all([
      fetch('data.json').then(r => r.json()),
      fetch('actions.json').then(r => r.json()),
    ]);
    realWorldStats = stats;
    gameActions = actions;
  }

  // ---------- CHARACTER CREATION ----------
  function createCharacter(name, race) {
    const base = {
      name, race,
      age: 0, monthsPassed: 0,
      health: 100, wealth: 0,
      academicPerformance: 0,
      flags: {}, multipliers: {}
    };
    const conf = realWorldStats?.races?.[race] || {};
    base.flags.isBelowPovertyLine = !!conf.isBelowPovertyLine;
    base.flags.isFromSingleParentHousehold = !!conf.isFromSingleParentHousehold;
    // copy common multipliers if present
    [
      'hiringBias','justiceSystemDisadvantage','medicalTreatmentModifier',
      'crimeExposure','familySupportChance','schoolFundingLevel','tuitionBurden'
    ].forEach(k => { if (conf.hasOwnProperty(k)) base.multipliers[k] = conf[k]; });
    return base;
  }

  // ---------- CHILDHOOD (PHASED) ----------
  function buildBracketPrompt(char, bracket) {
    const bio = `Name: ${char.name}
Race: ${char.race}
BelowPovertyLine: ${char.flags.isBelowPovertyLine}
SingleParent: ${char.flags.isFromSingleParentHousehold}
SchoolFundingLevel: ${char.multipliers.schoolFundingLevel ?? 'n/a'}
HiringBias: ${char.multipliers.hiringBias ?? 'n/a'}
CrimeExposure: ${char.multipliers.crimeExposure ?? 'n/a'}
FamilySupportChance: ${char.multipliers.familySupportChance ?? 'n/a'}
MedicalTreatmentModifier: ${char.multipliers.medicalTreatmentModifier ?? 'n/a'}`;

    const phaseHint = {
      'PreK': 'pre‑K (ages 0–4): home environment, childcare access, healthcare, nutrition, neighborhood safety, early literacy.',
      'Elementary': 'elementary (K–5, ages 5–10): class sizes, teacher quality, funding, after‑school care, enrichment, early tracking, standardized tests.',
      'Middle': 'middle school (6–8, ages 11–13): peer effects, discipline climate, counseling, course placement, extracurricular barriers, family duties.',
      'High': 'high school (9–12, ages 14–17): AP/IB access, part‑time work, policing, guidance counseling, test prep, internships, networks.'
    }[bracket.label];

    return (
      `You are a grounded, realistic narrator for an educational life‑sim about systemic (dis)advantage. ` +
      `Write one cohesive paragraph (8–12 sentences, concrete details) narrating ${char.name}'s ${phaseHint} ` +
      `Explicitly reflect the BIO and multipliers in how opportunities/risks show. Avoid cliches and repetition. Do not time‑jump outside ${bracket.startAge}–${bracket.endAge}. ` +
      `Your ENTIRE response must be STRICT JSON with this shape only: ` +
      `{ "storyText": "<8–12 sentence paragraph>", "statChanges": { "health": <int>, "wealth": <int>, "academicPerformance": <int> } }` +
      `
BIO:
${bio}
` +
      `Constraints: No text outside JSON. Factual, unsentimental tone.`
    );
  }

  async function runChildhoodSimBrackets() {
    appendNarration(`<strong>Beginning simulation of ${escapeHtml(character.name)}'s childhood by phases...</strong>`);

    const brackets = [
      { label: 'PreK',       startAge: 0,  endAge: 4,  setAgeAfter: 5  },
      { label: 'Elementary', startAge: 5,  endAge: 10, setAgeAfter: 11 },
      { label: 'Middle',     startAge: 11, endAge: 13, setAgeAfter: 14 },
      { label: 'High',       startAge: 14, endAge: 17, setAgeAfter: 18 },
    ];

    for (const br of brackets) {
      character.age = br.startAge; // anchor visible age for this phase
      renderStats();

      const prompt = buildBracketPrompt(character, br);
      try {
        const data = await callAI(prompt);
        appendNarration(`<strong>${br.label} (${br.startAge}–${br.endAge}):</strong> ${data.storyText}`);
        if (data.statChanges) {
          character.health += Number(data.statChanges.health || 0);
          character.wealth += Number(data.statChanges.wealth || 0);
          character.academicPerformance += Number(data.statChanges.academicPerformance || 0);
        }
        // Move cleanly to the next phase start
        character.age = br.setAgeAfter;
        character.monthsPassed = 0;
        renderStats();
        saveState();
      } catch (e) {
        displayError(e.message);
        break;
      }
    }

    appendEvent(`<strong>Adulthood begins.</strong> You can now choose actions each turn.`);
    inputArea.style.display = 'block';
    await presentTurnChoices('initial');
  }

  // ---------- ADULT PHASE ----------
  function addMonths(n) {
    character.monthsPassed = (character.monthsPassed || 0) + Number(n || 0);
    while (character.monthsPassed >= 12) { character.age += 1; character.monthsPassed -= 12; }
  }
  function applyDeltaStats(delta = {}) {
    const { health = 0, wealth = 0, academicPerformance = 0 } = delta;
    character.health += Number(health);
    character.wealth += Number(wealth);
    character.academicPerformance += Number(academicPerformance);
  }
  function renderChoicesByIds(ids) {
    clearChoices();
    ids.forEach(id => {
      const a = gameActions.actions?.[id];
      if (!a) return;
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = a.label || id;
      btn.addEventListener('click', () => handleActionClick(id));
      choiceContainer.appendChild(btn);
    });
  }
  function resolveAction(action) {
    const baseChance = Number(action.baseChance ?? 0.5);
    let effective = baseChance;
    const m = character.multipliers || {};
    if (action.tags?.includes('college')) effective *= (1 - (Number(m.tuitionBurden ?? 0) * 0.15));
    if (action.tags?.includes('job'))     effective *= (1 - (Number(m.hiringBias   ?? 0) * 0.10));
    effective = Math.max(0.01, Math.min(0.99, effective));

    // upfront costs
    if (action.cost?.wealth) character.wealth -= Number(action.cost.wealth);
    if (action.cost?.health) character.health -= Number(action.cost.health);

    const success = Math.random() < effective;
    const branch = success ? action.success : action.failure;
    const delta = Object.assign({ durationMonths: 0, health: 0, wealth: 0, academicPerformance: 0 }, branch?.statChanges || {});
    const flagsToSet = branch?.set_flag || null;
    const text = branch?.text || (success ? 'Succeeded.' : 'Failed.');
    return { success, outcomeText: text, delta, flagsToSet };
  }
  function buildOutcomePrompt(actionId, action, success, delta) {
    const outcome = success ? 'success' : 'failure';
    const sc = JSON.stringify({
      durationMonths: Number(delta?.durationMonths || 0),
      health: Number(delta?.health || 0),
      wealth: Number(delta?.wealth || 0),
      academicPerformance: Number(delta?.academicPerformance || 0),
    });
    const actionList = Object.keys(gameActions.actions || {});
    return (
      `You are the narrator. The player took action_id="${actionId}" (label: ${action.label || actionId}). Outcome: ${outcome}. ` +
      `Narrate the result succinctly in a grounded, realistic tone. Then propose 2–4 next action_id values from: [${actionList.join(', ')}]. ` +
      `Return ONLY JSON: { "storyText":"...", "statChanges": ${sc}, "choices": ["id1","id2"] }.`
    );
  }
  async function presentTurnChoices(contextTag = '') {
    const actionList = Object.keys(gameActions.actions || {});
    const prompt = (
      `You are ONLY a narrator and choice‑suggester. Propose 2–4 action_id values from this list: [${actionList.join(', ')}]. ` +
      `Your response MUST be strictly JSON: { "storyText": "...", "statChanges": { "durationMonths": 0, "health": 0, "wealth": 0 }, "choices": ["id1","id2"] }.` +
      ` Player: ${character.name}, Race: ${character.race}, Age: ${character.age}, Wealth: ${character.wealth}, Health: ${character.health}. ` +
      `Grounded tone. No extra text outside JSON.`
    );

    try {
      showThinking();
      const data = await callAI(prompt);
      hideThinking();

      if (data.storyText) appendNarration(`<strong>Narrator:</strong> ${data.storyText}`);
      if (data.statChanges?.durationMonths) addMonths(data.statChanges.durationMonths);
      if (data.statChanges) applyDeltaStats(data.statChanges);
      renderStats();

      const choices = Array.isArray(data.choices) ? data.choices : [];
      renderChoicesByIds(choices.length ? choices : actionList.slice(0, 3));
      saveState();
    } catch (e) {
      hideThinking();
      displayError(e.message);
    }
  }
  async function handleActionClick(actionId) {
    if (isAwaitingInput) return;
    isAwaitingInput = true;

    const a = gameActions.actions?.[actionId];
    if (!a) { isAwaitingInput = false; return; }

    const { success, outcomeText, delta, flagsToSet } = resolveAction(a);
    appendEvent(`<strong>${escapeHtml(a.label || actionId)}:</strong> ${outcomeText}`);
    if (delta?.durationMonths) addMonths(delta.durationMonths);
    applyDeltaStats(delta);
    if (flagsToSet) Object.assign(character.flags, flagsToSet);
    renderStats();
    saveState();

    const prompt = buildOutcomePrompt(actionId, a, success, delta);
    try {
      showThinking();
      const data = await callAI(prompt);
      hideThinking();

      if (data.storyText) appendNarration(`<strong>Narrator:</strong> ${data.storyText}`);
      if (data.statChanges?.durationMonths) addMonths(data.statChanges.durationMonths);
      if (data.statChanges) applyDeltaStats(data.statChanges);
      renderStats();

      const choices = Array.isArray(data.choices) ? data.choices : [];
      if (choices.length) renderChoicesByIds(choices); else presentTurnChoices('followup');
      saveState();
    } catch (e) {
      hideThinking();
      displayError(e.message);
    } finally {
      isAwaitingInput = false;
    }
  }

  // ---------- FREE‑TEXT INPUT (optional mapping to actions) ----------
  sendButton?.addEventListener('click', async () => {
    const text = userInput.value.trim();
    if (!text) return;
    userInput.value = '';

    const catalog = Object.keys(gameActions.actions || {});
    const prompt = (
      `User typed a custom intent: "${text}". Map this to 2–4 relevant action_id values from: [${catalog.join(', ')}]. ` +
      `Respond ONLY with JSON: { "storyText":"...", "choices":["id1","id2"] }.`
    );

    try {
      showThinking();
      const data = await callAI(prompt);
      hideThinking();

      if (data.storyText) appendNarration(`<strong>Narrator:</strong> ${data.storyText}`);
      const choices = Array.isArray(data.choices) ? data.choices : [];
      if (choices.length) renderChoicesByIds(choices); else appendEvent('No matching actions found — try again.');
      saveState();
    } catch (e) {
      hideThinking();
      displayError(e.message);
    }
  });

  // ---------- WIRES ----------
  newGameBtn?.addEventListener('click', () => { resetRun(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  newGameBtnInGame?.addEventListener('click', () => {
    if (confirm('Start a new game? Your current progress will be lost.')) {
      resetRun(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  createCharacterBtn?.addEventListener('click', async () => {
    const nm = nameInput.value.trim();
    const race = raceSelect.value;
    if (!nm || !race) { alert('Please enter a name and select a race.'); return; }

    try { await loadGameData(); }
    catch { displayError('Failed to load data.json or actions.json'); return; }

    character = createCharacter(nm, race);
    creationScreen.style.display = 'none';
    gameContainer.style.display = 'block';
    inputArea.style.display = 'none'; // appears after childhood
    storyContainer.innerHTML = '';

    renderStats(); saveState();
    await runChildhoodSimBrackets();
  });

  // ---------- INIT ----------
  (function init() {
    const restored = restoreState();
    if (!restored) {
      creationScreen.style.display = 'block';
      gameContainer.style.display = 'none';
      inputArea.style.display = 'none';
    }
  })();
});
