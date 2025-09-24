// ===================================================================================
//  SECTION 1: DOM ELEMENT SELECTION & GLOBAL VARIABLES
// ===================================================================================

const creationScreen = document.getElementById('character-creation');
const gameContainer = document.getElementById('game-container');
const storyContainer = document.getElementById('story-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const raceSelect = document.getElementById('race-select');
const createCharacterBtn = document.getElementById('create-character-btn');
const newGameBtn = document.getElementById('new-game-btn');
const nameInput = document.getElementById('name-input');
const statAge = document.getElementById('stat-age');
const statHealth = document.getElementById('stat-health');
const statWealth = document.getElementById('stat-wealth');
const choiceContainer = document.getElementById('choice-container');

let realWorldStats = {};
let character = {};
let isAwaitingInput = true;

// ===================================================================================
//  SECTION 2: DATA LOADING AND APP INITIALIZATION
// ===================================================================================

createCharacterBtn.disabled = true;
createCharacterBtn.textContent = "Loading Data...";

fetch('data.json')
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    realWorldStats = data;
    console.log("Data loaded successfully.");
    createCharacterBtn.disabled = false;
    createCharacterBtn.textContent = "Begin Life";
    loadSavedGame();
  })
  .catch(error => {
    console.error("Error loading the data file:", error);
    alert("Could not load necessary game data.");
    createCharacterBtn.textContent = "Error Loading Data";
  });


// ===================================================================================
//  SECTION 3: EVENT LISTENERS (The Core Logic)
// ===================================================================================

createCharacterBtn.addEventListener('click', () => {
  const selectedRace = raceSelect.value;
  const stats = realWorldStats.race[selectedRace];
  const characterName = nameInput.value.trim();
  if (!characterName) {
    alert("Please enter a name for your character.");
    return;
  }

  character = {
    name: characterName,
    race: selectedRace,
    age: 0,
    monthsPassed: 0,
    health: 100,
    wealth: stats.medianFamilyNetWorth * 0.05,
    background: {
        isBelowPovertyLine: Math.random() < stats.povertyRate,
        isFromSingleParentHousehold: Math.random() < stats.singleParentHousehold,
        parentsHaveBachelors: Math.random() < stats.parentsHaveBachelors,
    },
    multipliers: {
      schoolFunding: stats.schoolFundingLevel,
      crimeExposure: stats.violentCrimeExposure,
      hiringBias: stats.hiringCallbackMultiplier,
      justiceSystem: stats.justiceSystemDisadvantage,
      medicalBias: stats.medicalTreatmentModifier,
      familySupport: stats.familySupportChance,
    }
  };

  creationScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  runChildhoodSimulation();
});

sendButton.addEventListener('click', () => {
  if (!isAwaitingInput) return;
  const userActionText = userInput.value;
  if (!userActionText) return;
  takeTurn(userActionText);
});

newGameBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to start a new game? Your current progress will be lost.")) {
    localStorage.removeItem('lifeSimCharacter');
    localStorage.removeItem('lifeSimStory');
    window.location.reload();
  }
});

userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    sendButton.click();
  }
});

// ===================================================================================
//  SECTION 4: CORE GAME LOGIC & HELPER FUNCTIONS
// ===================================================================================

async function takeTurn(userAction) {
  if (!isAwaitingInput) return;

  isAwaitingInput = false;
  sendButton.disabled = true;
  choiceContainer.innerHTML = '';

  if (userAction) {
    storyContainer.innerHTML += `<p class="user-text"><strong>You:</strong> ${userAction}</p>`;
  }
  userInput.value = '';
  storyContainer.innerHTML += `<p class="ai-text" id="thinking"><strong>Narrator:</strong> Thinking...</p>`;
  storyContainer.scrollTop = storyContainer.scrollHeight;

  const promptForAI = `
    You are the Game Master for a text-based life simulator about systemic inequality.
    TONE: Grounded, gritty, and realistic. Avoid "feel-good" outcomes.
    CHARACTER BIOGRAPHY (Permanent facts):
    - Name: ${character.name}, Race: ${character.race}
    - Grew up ${character.background.isBelowPovertyLine ? 'below the poverty line.' : 'above the poverty line.'}
    - Raised in a ${character.background.isFromSingleParentHousehold ? 'single-parent household.' : 'two-parent household.'}
    CURRENT STATS: Age: ${character.age}, Health: ${character.health}, Wealth: ${character.wealth}
    SYSTEMIC FACTORS (Hidden influencers): Hiring Bias: ${character.multipliers.hiringBias}, Justice Disadvantage: ${character.multipliers.justiceSystem}.
    PLAYER'S ACTION: "${userAction}".
    INSTRUCTIONS:
    1. Write a narrative paragraph consistent with the BIOGRAPHY and TONE. The SYSTEMIC FACTORS must create tangible setbacks.
    2. Determine consequences. Estimate 'durationMonths'. Only increment 'age' if a year or more passes.
    3. Provide 3 choices that reflect the character's new, often more constrained, reality.
    CRUCIAL RULE: Do NOT tell stories of exceptional success. Model the typical, frustrating experience.
    Respond ONLY with a valid JSON object: { "storyText": "...", "statChanges": { "durationMonths": 0, "health": 0, "wealth": 0 }, "choices": ["...", "..."] }
  `;

  try {
    const response = await fetch('/.netlify/functions/get-ai-response', { method: 'POST', body: JSON.stringify({ userInput: promptForAI }) });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    document.getElementById('thinking').remove();
    storyContainer.innerHTML += `<p class="ai-text"><strong>Narrator:</strong> ${data.storyText}</p>`;
    
    const duration = data.statChanges.durationMonths || 0;
    character.monthsPassed += duration;
    if (character.monthsPassed >= 12) {
      character.age += Math.floor(character.monthsPassed / 12);
      character.monthsPassed = character.monthsPassed % 12;
    }
    character.health += data.statChanges.health || 0;
    character.wealth += data.statChanges.wealth || 0;
    
    updateStatus();
    displayChoices(data.choices);
    localStorage.setItem('lifeSimCharacter', JSON.stringify(character));
  } catch (error) {
    const thinkingP = document.getElementById('thinking');
    if (thinkingP) thinkingP.textContent = "Error connecting to the storyteller. Please try again.";
    console.error('Fetch error:', error);
  } finally {
    isAwaitingInput = true;
    sendButton.disabled = false;
    userInput.focus();
  }
}

async function runChildhoodSimulation() {
  isAwaitingInput = false;
  sendButton.disabled = true;
  let summary = `Your story begins. You are born a ${character.race} individual named ${character.name}. You grew up ${character.isFromSingleParentHousehold ? 'in a single-parent household' : 'in a two-parent household'}.`;
  storyContainer.innerHTML = `<p class="ai-text"><strong>Narrator:</strong> ${summary}</p><p class="ai-text"><strong>Narrator:</strong> Simulating formative years...</p>`;
  updateStatus();

  for (let i = 1; i <= 17; i++) {
    character.age = i;
    updateStatus();
    await new Promise(resolve => setTimeout(resolve, 600));

    const promptForChildhoodYear = `
      A character named ${character.name} is now age ${character.age}.
      Their SYSTEMIC FACTORS are: School Funding: ${character.multipliers.schoolFunding}, Crime Exposure: ${character.multipliers.crimeExposure}.
      Briefly narrate a key event for this year based on these factors.
      CRUCIAL RULE: Do NOT mention the raw numbers. Use them to influence the story.
      Respond ONLY with a valid JSON object: { "storyText": "...", "statChanges": { "health": 0, "wealth": 0 } }
    `;
    
    try {
      const response = await fetch('/.netlify/functions/get-ai-response', { method: 'POST', body: JSON.stringify({ userInput: promptForChildhoodYear }) });
      if (!response.ok) continue;
      const data = await response.json();
      storyContainer.innerHTML += `<p class="ai-text"><strong>Age ${character.age}:</strong> ${data.storyText}</p>`;
      character.health += data.statChanges.health || 0;
      character.wealth += data.statChanges.wealth || 0;
      storyContainer.scrollTop = storyContainer.scrollHeight;
    } catch (error) {
      console.error(`Error simulating age ${i}:`, error);
    }
  }

  // THIS IS THE CORRECTED TRANSITION
  character.age = 18;
  character.monthsPassed = 0;
  updateStatus();
  storyContainer.innerHTML += `<p class="ai-text"><strong>Narrator:</strong> You are now 18. Your childhood has shaped who you are. The first major decision of your adult life awaits.</p>`;
  
  // Directly call the main turn function and wait for it to complete
  await takeTurn("Present me with my first life choices based on my background.");
  
  localStorage.setItem('lifeSimCharacter', JSON.stringify(character));
}

function loadSavedGame() {
    const savedCharacter = localStorage.getItem('lifeSimCharacter');
    const savedStory = localStorage.getItem('lifeSimStory');
    if (savedCharacter && savedStory) {
      console.log("Saved game found.");
      character = JSON.parse(savedCharacter);
      storyContainer.innerHTML = savedStory;
      updateStatus();
      creationScreen.classList.add('hidden');
      gameContainer.classList.remove('hidden');
      isAwaitingInput = true;
      sendButton.disabled = false;
      displayChoices([]);
    }
}

function updateStatus() {
  statAge.textContent = character.age;
  statHealth.textContent = Math.round(character.health) + '%';
  statWealth.textContent = '$' + Math.round(character.wealth).toLocaleString();
}

function displayChoices(choices) {
  choiceContainer.innerHTML = '';
  if (!choices || choices.length === 0) {
    return;
  }
  choices.forEach(choice => {
    const button = document.createElement('button');
    button.textContent = choice;
    button.classList.add('choice-btn');
    button.addEventListener('click', () => {
      if (!isAwaitingInput) return;
      takeTurn(choice);
    });
    choiceContainer.appendChild(button);
  });
}