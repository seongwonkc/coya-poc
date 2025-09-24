document.addEventListener('DOMContentLoaded', () => {
  // =========================================================
  //  Choose Your American Adventure — FRONTEND (Total Rewrite)
  //  - Robust JSON parsing for AI responses
  //  - Correct Netlify path: /.netlify/functions/get-ai-response
  //  - Clean state management + UI helpers
  //  - Compatible with existing index.html IDs
  // =========================================================

  // ---------- DOM HOOKS ----------
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
  let character = null;    // current run state

  let isAwaitingInput = false; // blocks multiple clicks while resolving

  // ---------- UTILS: UI ----------
  function clearChoices() {
    choiceContainer.innerHTML = '';
  }

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

  function hideThinking() {
    document.getElementById('thinking')?.remove();
  }

  function displayError(msg) {
    const div = document.createElement('div');
    div.className = 'ai-text event-text error';
    div.innerHTML = `<strong>AI Error:</strong> ${escapeHtml(String(msg))}`;
    storyContainer.appendChild(div);
    storyContainer.scrollTop = storyContainer.scrollHeight;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function renderStats() {
    if (!character) return;
    statAge.textContent = String(character.age);
    statHealth.textContent = String(Math.round(character.health));
    statWealth.textContent = `$${Math.round(character.wealth).toLocaleString()}`;
  }

  function saveState() {
    localStorage.setItem('lifeSimCharacter', JSON.stringify(character));
    localStorage.setItem('lifeSimStory', storyContainer.innerHTML);
  }

  function restoreState() {
    try {
      const saved = localStorage.getItem('lifeSimCharacter');
      const story = localStorage.getItem('lifeSimStory');
      if (saved) {
        character = JSON.parse(saved);
        if (story) storyContainer.innerHTML = story;
        renderStats();
        creationScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        inputArea.style.display = 'block';
        return true;
      }
    } catch {}
    return false;
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

  // ---------- UTILS: AI JSON ROBUSTNESS ----------
  function stripCodeWrappers(text) {
    return text
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .replace(/\u200B/g, '')
      .trim();
  }

  function extractJsonObject(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return text.slice(start, end + 1);
    }
    throw new Error('No JSON object found in AI response.');
  }

  function parseAIJson(rawText) {
    try { return JSON.parse(rawText); } catch {}
    const stripped = stripCodeWrappers(rawText);
    try { return JSON.parse(stripped); } catch {}
    const maybe = extractJsonObject(stripped);
    try { return JSON.parse(maybe); } catch (e) {
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
    // Base stats
    const base = {
      name,
      race,
      age: 0,
      monthsPassed: 0,
      health: 100,
      wealth: 0,
      academicPerformance: 0,
      flags: {},
      multipliers: {},
    };

    // Pull multipliers and background from data.json by race
    const conf = realWorldStats?.races?.[race] || {};
    base.flags.isBelowPovertyLine = !!conf.isBelowPovertyLine;
    base.flags.isFromSingleParentHousehold = !!conf.isFromSingleParentHousehold;

    // copy any multiplier fields if present
    const m = {};
    const knownMultipliers = [
      'hiringBias',
      'justiceSystemDisadvantage',
      'medicalTreatmentModifier',
      'crimeExposure',
      'familySupportChance',
      'schoolFundingLevel',
      'tuitionBurden',
    ];
    knownMultipliers.forEach(k => {
      if (conf.hasOwnProperty(k)) m[k] = conf[k];
    });
    base.multipliers = m;

    return base;
  }

  // ---------- CHILDHOOD SIMULATION (0–17) ----------
  async function runChildhoodSim() {
    // Small intro
    appendNarration(`<strong>Beginning simulation of ${escapeHtml(character.name)}'s childhood...</strong>`);

    for (let age = 0; age <= 17; age++) {
      character.age = age;
      renderStats();

      const promptForYear = buildChildhoodPrompt(character);
      try {
        const data = await callAI(promptForYear);
        // Expected JSON: { storyText: string, statChanges: { health, wealth } }
        appendNarration(`<strong>Age ${age}:</strong> ${data.storyText}`);
        if (data.statChanges) {
          character.health += Number(data.statChanges.health || 0);
          character.wealth += Number(data.statChanges.wealth || 0);
          character.academicPerformance += Number(data.statChanges.academicPerformance || 0);
        }
        saveState();
      } catch (e) {
        displayError(e.message);
        break; // stop sim on error
      }
    }

    // Transition to adulthood
    character.age = 18;
    character.monthsPassed = 0;
    renderStats();
    appendEvent(`<strong>Adulthood begins.</strong> You can now choose actions each turn.`);
    inputArea.style.display = 'block';
    await presentTurnChoices('initial');
  }

  function buildChildhoodPrompt(char) {
    const bio = `Name: ${char.name}\nRace: ${char.race}\nPoverty: ${char.flags.isBelowPovertyLine}\nSingleParent: ${char.flags.isFromSingleParentHousehold}\nSchoolFundingLevel: ${char.multipliers.schoolFundingLevel ?? 'n/a'}`;
    return (
      `You are the narrator of a grounded, realistic life-sim illustrating systemic inequality. ` +
      `Write a short, factual annual vignette for the character's childhood. Avoid fluff; be specific. ` +
      `Return ONLY JSON like { "storyText": "...", "statChanges": { "health": 0, "wealth": 0, "academicPerformance": 0 } }.` +
      `\nBIO:\n${bio}\n` +
      `Constraints: Do NOT include any text outside the JSON.`
    );
  }

  // ---------- ADULT PHASE LOOP (TURN-BASED) ----------
  async function presentTurnChoices(contextTag = '') {
    // Ask AI to propose action IDs based on the current state
    const actionList = Object.keys(gameActions.actions || {});
    const prompt = (
      `You are ONLY a narrator and choice-suggester. Propose 2-4 action_id values from this list: [${actionList.join(', ')}]. ` +
      `Your response MUST be strictly JSON: { "storyText": "...", "statChanges": { "durationMonths": 0, "health": 0, "wealth": 0 }, "choices": ["id1","id2"] }.` +
      `\nPlayer: ${character.name}, Race: ${character.race}, Age: ${character.age}, Wealth: ${character.wealth}, Health: ${character.health}. ` +
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
      if (!choices.length) {
        // Fallback: propose any 2 actions from catalog
        const some = actionList.slice(0, 2);
        renderChoicesByIds(some);
      } else {
        renderChoicesByIds(choices);
      }
      saveState();
    } catch (e) {
      hideThinking();
      displayError(e.message);
    }
  }

  function addMonths(n) {
    character.monthsPassed = (character.monthsPassed || 0) + Number(n || 0);
    while (character.monthsPassed >= 12) {
      character.age += 1;
      character.monthsPassed -= 12;
    }
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

  async function handleActionClick(actionId) {
    if (isAwaitingInput) return;
    isAwaitingInput = true;

    const a = gameActions.actions?.[actionId];
    if (!a) { isAwaitingInput = false; return; }

    // Resolve action locally
    const { success, outcomeText, delta, flagsToSet } = resolveAction(a);

    // Apply outcome
    appendEvent(`<strong>${escapeHtml(a.label || actionId)}:</strong> ${outcomeText}`);
    if (delta?.durationMonths) addMonths(delta.durationMonths);
    applyDeltaStats(delta);
    if (flagsToSet) Object.assign(character.flags, flagsToSet);
    renderStats();
    saveState();

    // Ask AI to narrate the outcome and propose next choices
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
      if (choices.length) renderChoicesByIds(choices);
      else presentTurnChoices('followup');
      saveState();
    } catch (e) {
      hideThinking();
      displayError(e.message);
    } finally {
      isAwaitingInput = false;
    }
  }

  function buildOutcomePrompt(actionId, action, success, delta) {
    const outcome = success ? 'success' : 'failure';
    const text = success ? (action.success?.text || 'It worked.') : (action.failure?.text || 'It failed.');
    const sc = JSON.stringify({
      durationMonths: Number(delta?.durationMonths || 0),
      health: Number(delta?.health || 0),
      wealth: Number(delta?.wealth || 0),
      academicPerformance: Number(delta?.academicPerformance || 0),
    });

    const actionList = Object.keys(gameActions.actions || {});
    return (
      `You are the narrator. The player took action_id="${actionId}" (label: ${action.label || actionId}). Outcome: ${outcome}. ` +
      `Narrate the result succinctly in a grounded, realistic tone. Then propose 2-4 next action_id values from: [${actionList.join(', ')}]. ` +
      `Return ONLY JSON: { "storyText":"...", "statChanges": ${sc}, "choices": ["id1","id2"] }.`
    );
  }

  function resolveAction(action) {
    // Reads fields like: baseChance, cost, success {text, statChanges, set_flag}, failure {...}
    const baseChance = Number(action.baseChance ?? 0.5);

    // Apply simple systemic modifiers based on character.multipliers
    let effectiveChance = baseChance;
    const m = character.multipliers || {};

    if (action.tags?.includes('college')) {
      // tuition burden might reduce success of affording/attending
      effectiveChance *= (1 - (Number(m.tuitionBurden ?? 0) * 0.15));
    }
    if (action.tags?.includes('job')) {
      // hiring bias slightly reduces success
      effectiveChance *= (1 - (Number(m.hiringBias ?? 0) * 0.1));
    }

    // Clamp
    effectiveChance = Math.max(0.01, Math.min(0.99, effectiveChance));

    // Apply up-front costs if any
    if (action.cost?.wealth) {
      character.wealth -= Number(action.cost.wealth);
    }
    if (action.cost?.health) {
      character.health -= Number(action.cost.health);
    }

    const successRoll = Math.random() < effectiveChance;
    const branch = successRoll ? action.success : action.failure;

    const delta = Object.assign(
      { durationMonths: 0, health: 0, wealth: 0, academicPerformance: 0 },
      (branch?.statChanges || {})
    );

    const flagsToSet = branch?.set_flag || null;
    const outcomeText = branch?.text || (successRoll ? 'Succeeded.' : 'Failed.');

    return { success: successRoll, outcomeText, delta, flagsToSet };
  }

  function gameOver() {
    appendEvent(`<strong>Your story has ended at age ${character.age}.</strong><br>Final Wealth: $${Math.round(character.wealth).toLocaleString()}`);
    clearChoices();
    inputArea.style.display = 'none';
    isAwaitingInput = false;
    localStorage.removeItem('lifeSimCharacter');
    localStorage.removeItem('lifeSimStory');
  }

  // ---------- WIRE UP UI ----------
  newGameBtn?.addEventListener('click', () => {
    resetRun();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  newGameBtnInGame?.addEventListener('click', () => {
    if (confirm('Start a new game? Your current progress will be lost.')) {
      resetRun();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  createCharacterBtn?.addEventListener('click', async () => {
    if (!nameInput.value.trim()) {
      alert('Please enter a name.');
      return;
    }
    if (!raceSelect.value) {
      alert('Please select a race.');
      return;
    }

    try {
      await loadGameData();
    } catch (e) {
      displayError('Failed to load data.json or actions.json');
      return;
    }

    character = createCharacter(nameInput.value.trim(), raceSelect.value);
    creationScreen.style.display = 'none';
    gameContainer.style.display = 'block';
    inputArea.style.display = 'none'; // shown after childhood sim
    storyContainer.innerHTML = '';

    renderStats();
    saveState();

    // Kick off childhood sim (await to avoid overlapping calls)
    await runChildhoodSim();
  });

  sendButton?.addEventListener('click', async () => {
    // Let users type custom actions as free text; AI will suggest matching action_ids
    const text = userInput.value.trim();
    if (!text) return;
    userInput.value = '';

    try {
      showThinking();
      const data = await callAI(
        `User typed a custom intent: "${text}". ` +
        `Map this to 2-4 relevant action_id values from the catalog: [${Object.keys(gameActions.actions || {}).join(', ')}]. ` +
        `Respond ONLY with JSON: { "storyText":"...", "choices":["id1","id2"] }.`
      );
      hideThinking();

      if (data.storyText) appendNarration(`<strong>Narrator:</strong> ${data.storyText}`);
      const choices = Array.isArray(data.choices) ? data.choices : [];
      if (choices.length) renderChoicesByIds(choices);
      else appendEvent('No matching actions found — try again.');
      saveState();
    } catch (e) {
      hideThinking();
      displayError(e.message);
    }
  });

  // ---------- INITIALIZE ----------
  (async function init() {
    // Attempt to restore a previous run; if none, show creation screen
    const has = restoreState();
    if (has) {
      creationScreen.style.display = 'none';
      gameContainer.style.display = 'block';
      inputArea.style.display = 'block';
    } else {
      creationScreen.style.display = 'block';
      gameContainer.style.display = 'none';
      inputArea.style.display = 'none';
    }
  })();
});
