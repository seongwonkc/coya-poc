// ===================================================================================
//  SECTION 1: DATA AND GLOBAL SETTINGS
// ===================================================================================

const realWorldStats = {
  race: {
    // Data sourced from US Census, KFF, NCES, Federal Reserve, and BJS.
    // Multipliers are conceptual models based on sociological & public health research.
    white: {
      // STARTING CONDITIONS
      povertyRate: 0.086,
      singleParentHousehold: 0.28,
      parentsHaveBachelors: 0.45,
      uninsuredRate: 0.057,
      medianFamilyNetWorth: 285000,
      privateSchoolChance: 0.09,
      socialCapitalScore: 60, // Starting score (0-100)

      // ENVIRONMENTAL & HEALTH FACTORS
      schoolFundingLevel: 1.05, 
      violentCrimeExposure: 1.0, 
      pollutionExposure: 3, // Risk score (1-10)
      stressHealthModifier: -0.001, // Annual health decay from "weathering"
      medicalTreatmentModifier: 1.0, // Baseline treatment effectiveness

      // SYSTEMIC MULTIPLIERS
      justiceSystemDisadvantage: 1.0, 
      hiringCallbackMultiplier: 1.0,
      drugArrestRisk: 1.0,
      loanApprovalChance: 0.85, // Baseline mortgage approval chance
      propertyValueGrowth: 1.0, // Baseline appreciation
      familySupportChance: 0.15, // Chance of needing to provide major financial support to family
    },
    black: {
      povertyRate: 0.171,
      singleParentHousehold: 0.64,
      parentsHaveBachelors: 0.31,
      uninsuredRate: 0.096,
      medianFamilyNetWorth: 44900,
      privateSchoolChance: 0.06,
      socialCapitalScore: 30,

      schoolFundingLevel: 0.85,
      violentCrimeExposure: 5.2,
      pollutionExposure: 7,
      stressHealthModifier: -0.005,
      medicalTreatmentModifier: 0.75,

      justiceSystemDisadvantage: 3.5, 
      hiringCallbackMultiplier: 0.67,
      drugArrestRisk: 3.7,
      loanApprovalChance: 0.65,
      propertyValueGrowth: 0.80,
      familySupportChance: 0.60,
    },
    hispanic: {
      povertyRate: 0.169,
      singleParentHousehold: 0.42,
      parentsHaveBachelors: 0.22,
      uninsuredRate: 0.177,
      medianFamilyNetWorth: 61600,
      privateSchoolChance: 0.05,
      socialCapitalScore: 35,

      schoolFundingLevel: 0.88,
      violentCrimeExposure: 2.1,
      pollutionExposure: 6,
      stressHealthModifier: -0.004,
      medicalTreatmentModifier: 0.85,

      justiceSystemDisadvantage: 2.5, 
      hiringCallbackMultiplier: 0.75,
      drugArrestRisk: 1.9,
      loanApprovalChance: 0.70,
      propertyValueGrowth: 0.85,
      familySupportChance: 0.55,
    },
    asian: {
      povertyRate: 0.092,
      singleParentHousehold: 0.15,
      parentsHaveBachelors: 0.62,
      uninsuredRate: 0.060,
      medianFamilyNetWorth: 320000,
      privateSchoolChance: 0.11,
      socialCapitalScore: 70,

      schoolFundingLevel: 1.02,
      violentCrimeExposure: 0.4,
      pollutionExposure: 4,
      stressHealthModifier: -0.002,
      medicalTreatmentModifier: 0.95,

      justiceSystemDisadvantage: 0.8,
      hiringCallbackMultiplier: 0.9,
      drugArrestRisk: 0.7,
      loanApprovalChance: 0.80,
      propertyValueGrowth: 0.95,
      familySupportChance: 0.40,
    },
  },
};

// ===================================================================================
//  SECTION 2: DOM ELEMENT SELECTION
// ===================================================================================

const creationScreen = document.getElementById('character-creation');
const gameContainer = document.getElementById('game-container');
const storyContainer = document.getElementById('story-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const raceSelect = document.getElementById('race-select');
const createCharacterBtn = document.getElementById('create-character-btn');
  updateStatus(); // <-- ADD THIS LINE
// Add these with your other DOM element selections
const statAge = document.getElementById('stat-age');
const statHealth = document.getElementById('stat-health');
const statWealth = document.getElementById('stat-wealth');

// This object will hold the character's generated stats and track their progress.
let character = {};

// ===================================================================================
//  SECTION 3: EVENT LISTENERS
// ===================================================================================

/**
 * Handles the "Begin Life" button click to generate a character.
 */
createCharacterBtn.addEventListener('click', () => {
  const selectedRace = raceSelect.value;
  const stats = realWorldStats.race[selectedRace];

  // Generate the character based on the selected race and real-world probabilities
  character = {
    race: selectedRace,
    age: 18,
    health: 100,
    wealth: stats.medianFamilyNetWorth * 0.05, // Start with 5% of median family net worth as savings
    
    // Procedurally generated background conditions
    isBelowPovertyLine: Math.random() < stats.povertyRate,
    isFromSingleParentHousehold: Math.random() < stats.singleParentHousehold,
    parentsHaveBachelors: Math.random() < stats.parentsHaveBachelors,
    hasHealthInsurance: Math.random() > stats.uninsuredRate,

    // Store the systemic multipliers for use in game events
    multipliers: {
      schoolFunding: stats.schoolFundingLevel,
      crimeExposure: stats.violentCrimeExposure,
      hiringBias: stats.hiringCallbackMultiplier,
      justiceSystem: stats.justiceSystemDisadvantage,
      medicalBias: stats.medicalTreatmentModifier,
      familySupport: stats.familySupportChance,
    }
  };

  // Transition from the creation screen to the main game screen
  creationScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  
  // Generate the initial story prompt based on the created character
  generateFirstPrompt();
});

/**
 * Handles the "Send" button click to interact with the AI.
 */
sendButton.addEventListener('click', async () => {
  const userText = userInput.value;
  if (!userText) return;

  const fullStoryHistory = storyContainer.innerText; // Get all previous text for context

  // Display the user's action and a "thinking" message
  storyContainer.innerHTML += `<p class="user-text"><strong>You:</strong> ${userText}</p>`;
  userInput.value = '';
  sendButton.disabled = true;
  storyContainer.innerHTML += `<p class="ai-text" id="thinking"><strong>Narrator:</strong> Thinking...</p>`;
  storyContainer.scrollTop = storyContainer.scrollHeight;

  // Construct a detailed prompt for the AI
  const promptForAI = `
    This is a life simulation game. Here is the character's background and story so far:
    ---
    ${fullStoryHistory}
    ---
    The user, playing as the character, just did this: "${userText}".
    Continue the story by describing what happens next. Be creative and realistic.
  `;

  // Call our backend Netlify Function
  try {
    const response = await fetch('/.netlify/functions/get-ai-response', {
      method: 'POST',
      body: JSON.stringify({ userInput: promptForAI }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const aiReply = data.reply;
    
    // Replace "Thinking..." with the real AI reply
    const thinkingP = document.getElementById('thinking');
    thinkingP.innerHTML = `<strong>Narrator:</strong> ${aiReply}`;
    thinkingP.removeAttribute('id');

  } catch (error) {
    const thinkingP = document.getElementById('thinking');
    if (thinkingP) {
      thinkingP.textContent = "Sorry, there was an error connecting to the storyteller.";
    }
    console.error('Fetch error:', error);
  } finally {
    sendButton.disabled = false;
    userInput.focus(); // Set focus back to the input box
    storyContainer.scrollTop = storyContainer.scrollHeight;
  }
});

/**
 * Handles the Ctrl+Enter keyboard shortcut to send messages.
 */
userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.ctrlKey) {
    event.preventDefault(); // Prevent a new line from being entered
    sendButton.click();
  }
});

// ===================================================================================
//  SECTION 4: HELPER FUNCTIONS
// ===================================================================================

/**
 * Generates the initial story text based on the character's generated stats.
 */
function generateFirstPrompt() {
  let summary = `Your story begins. You are an 18-year-old ${character.race} individual. `;
  summary += `You grew up ${character.isFromSingleParentHousehold ? 'in a single-parent household' : 'in a two-parent household'}. `;
  summary += `Your family's economic status was ${character.isBelowPovertyLine ? 'below the poverty line' : 'above the poverty line'}. `;
  summary += `You begin your adult life with $${Math.round(character.wealth).toLocaleString()} in savings. `;
  
  storyContainer.innerHTML = `<p class="ai-text"><strong>Narrator:</strong> ${summary}</p>`;
  storyContainer.innerHTML += `<p class="ai-text"><strong>Narrator:</strong> You stand at a crossroads, ready to make your first major decision. What do you do?</p>`;
}
/**
 * Updates the UI of the status bar with the character's current stats.
 */
function updateStatus() {
  statAge.textContent = character.age;
  statHealth.textContent = character.health + '%';
  statWealth.textContent = '$' + Math.round(character.wealth).toLocaleString();
}