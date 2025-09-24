// ===================================================================================
//  SECTION 1: DOM ELEMENT SELECTION & GLOBAL VARIABLES
// ===================================================================================

// Get references to all the HTML elements we'll need to interact with
const creationScreen = document.getElementById('character-creation');
const gameContainer = document.getElementById('game-container');
const storyContainer = document.getElementById('story-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const raceSelect = document.getElementById('race-select');
const createCharacterBtn = document.getElementById('create-character-btn');
const statAge = document.getElementById('stat-age');
const statHealth = document.getElementById('stat-health');
const statWealth = document.getElementById('stat-wealth');
const choiceContainer = document.getElementById('choice-container');

// These will hold our game data and the player's character state
let realWorldStats = {};
let character = {};

// ===================================================================================
//  SECTION 2: DATA LOADING AND APP INITIALIZATION
// ===================================================================================

// Disable the start button until the data is loaded
createCharacterBtn.disabled = true;
createCharacterBtn.textContent = "Loading Data...";

// Fetch the data from the JSON file
fetch('data.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    realWorldStats = data; // Store the loaded data in our global variable
    console.log("Data loaded successfully.");
    // Now that the data is loaded, we can enable the app's start button
    createCharacterBtn.disabled = false;
    createCharacterBtn.textContent = "Begin Life";
  })
  .catch(error => {
    console.error("Error loading the data file:", error);
    alert("Could not load necessary game data. Please check the console and ensure data.json exists.");
    createCharacterBtn.textContent = "Error Loading Data";
  });


// ===================================================================================
//  SECTION 3: EVENT LISTENERS (The Core Logic)
// ===================================================================================

/**
 * Handles the "Begin Life" button click to generate a character.
 */
createCharacterBtn.addEventListener('click', () => {
  const selectedRace = raceSelect.value;
  const stats = realWorldStats.race[selectedRace];

  character = {
    race: selectedRace,
    age: 18,
    health: 100,
    wealth: stats.medianFamilyNetWorth * 0.05, // Start with 5% of median family net worth
    isBelowPovertyLine: Math.random() < stats.povertyRate,
    isFromSingleParentHousehold: Math.random() < stats.singleParentHousehold,
    parentsHaveBachelors: Math.random() < stats.parentsHaveBachelors,
    hasHealthInsurance: Math.random() > stats.uninsuredRate,
    multipliers: {
      schoolFunding: stats.schoolFundingLevel,
      crimeExposure: stats.violentCrimeExposure,
      hiringBias: stats.hiringCallbackMultiplier,
      justiceSystem: stats.justiceSystemDisadvantage,
      medicalBias: stats.medicalTreatmentModifier,
      familySupport: stats.familySupportChance,
    }
  };

  updateStatus();
  creationScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  generateFirstPrompt();
});

/**
 * Handles the "Send" button click to interact with the AI.
 */
sendButton.addEventListener('click', async () => {
  const userAction = userInput.value;
  if (!userAction) return;

  const storyHistory = storyContainer.innerText;

  storyContainer.innerHTML += `<p class="user-text"><strong>You:</strong> ${userAction}</p>`;
  userInput.value = '';
  sendButton.disabled = true;
  choiceContainer.innerHTML = '';
  document.getElementById('input-area').classList.add('hidden');

  storyContainer.innerHTML += `<p class="ai-text" id="thinking"><strong>Narrator:</strong> Thinking...</p>`;
  storyContainer.scrollTop = storyContainer.scrollHeight;

  const promptForAI = `
    You are the Game Master for a text-based life simulator about systemic inequality.
    
    CHARACTER STATS:
    - Age: ${character.age}, Health: ${character.health}, Wealth: ${character.wealth}

    SYSTEMIC FACTORS (Use these to influence outcomes):
    - Hiring Bias Multiplier: ${character.multipliers.hiringBias} (1.0 is baseline, <1.0 is a disadvantage)
    - Justice System Disadvantage: ${character.multipliers.justiceSystem} (1.0 is baseline, >1.0 means higher risk of negative encounters)
    - Medical Treatment Modifier: ${character.multipliers.medicalBias} (1.0 is baseline, <1.0 means less effective care)
    - Family Support Chance: ${character.multipliers.familySupport} (A high number means they are more likely to need to support family financially)

    STORY SO FAR:
    ---
    ${storyHistory}
    ---
    The player's last action was: "${userAction}".

    INSTRUCTIONS:
    1. Based on the character's systemic factors, advance the story with a realistic paragraph. For example, if they 'apply for a job' with a low hiring multiplier, describe how they face rejection despite their qualifications. If they have a high justice disadvantage and are 'driving home,' they are more likely to be pulled over.
    2. Determine the consequences and change the character's stats.
    3. Provide 2-3 clear choices for the player.

    Respond ONLY with a valid JSON object in the format:
    {
      "storyText": "Your narrative paragraph here.",
      "statChanges": { "age": 1, "health": -5, "wealth": 2000 },
      "choices": ["Choice A", "Choice B"]
    }
  `;

  try {
    const response = await fetch('/.netlify/functions/get-ai-response', {
      method: 'POST',
      body: JSON.stringify({ userInput: promptForAI }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();

    document.getElementById('thinking').remove();
    storyContainer.innerHTML += `<p class="ai-text"><strong>Narrator:</strong> ${data.storyText}</p>`;
    
    // Update character stats, providing a default of 0 if a stat is not returned
    character.age += data.statChanges.age || 0;
    character.health += data.statChanges.health || 0;
    character.wealth += data.statChanges.wealth || 0;
    
    updateStatus();
    displayChoices(data.choices);

  } catch (error) {
    const thinkingP = document.getElementById('thinking');
    if (thinkingP) thinkingP.textContent = "Error connecting to the storyteller. The AI may have returned an invalid response. Please try again.";
    console.error('Fetch error:', error);
    sendButton.disabled = false;
    document.getElementById('input-area').classList.remove('hidden');
  }
});

/**
 * Handles the Ctrl+Enter keyboard shortcut.
 */
userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.ctrlKey) {
    event.preventDefault();
    sendButton.click();
  }
});

// ===================================================================================
//  SECTION 4: HELPER FUNCTIONS (UI and Game Logic)
// ===================================================================================

/**
 * Updates the UI of the status bar with the character's current stats.
 */
function updateStatus() {
  statAge.textContent = character.age;
  statHealth.textContent = Math.round(character.health) + '%';
  statWealth.textContent = '$' + Math.round(character.wealth).toLocaleString();
}

/**
 * Generates the initial story text based on the character's generated stats.
 */
function generateFirstPrompt() {
  let summary = `Your story begins. You are an 18-year-old ${character.race} individual. `;
  summary += `You grew up ${character.isFromSingleParentHousehold ? 'in a single-parent household' : 'in a two-parent household'}. `;
  summary += `Your family's economic status was ${character.isBelowPovertyLine ? 'below the poverty line' : 'above the poverty line'}. `;
  summary += `You begin your adult life with $${Math.round(character.wealth).toLocaleString()} in savings. `;
  
  storyContainer.innerHTML = `<p class="ai-text"><strong>Narrator:</strong> ${summary}</p>`;
  storyContainer.innerHTML += `<p class="ai-text"><strong>Narrator:</strong> The text input below is for free-form actions. When choice buttons appear, please use them. Your first decision sets the course for your life. What do you do?</p>`;
  document.getElementById('input-area').classList.remove('hidden'); // Ensure the input is visible at the start
}

/**
 * Creates and displays clickable choice buttons from the AI's response.
 */
function displayChoices(choices) {
  choiceContainer.innerHTML = '';
  if (!choices || choices.length === 0) {
    // If no choices are provided, show the free-form input area
    document.getElementById('input-area').classList.remove('hidden');
    sendButton.disabled = false;
    userInput.focus();
    return;
  }

  // If choices are provided, hide the free-form input area
  document.getElementById('input-area').classList.add('hidden');

  choices.forEach(choice => {
    const button = document.createElement('button');
    button.textContent = choice;
    button.classList.add('choice-btn');
    button.addEventListener('click', () => {
      userInput.value = choice;
      sendButton.click();
    });
    choiceContainer.appendChild(button);
  });
}