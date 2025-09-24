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
const nameInput = document.getElementById('name-input'); // New name input
const statAge = document.getElementById('stat-age');
const statHealth = document.getElementById('stat-health');
const statWealth = document.getElementById('stat-wealth');
const choiceContainer = document.getElementById('choice-container');

let realWorldStats = {};
let character = {};
let isSimulatingChildhood = false;

// ===================================================================================
//  SECTION 2: DATA LOADING AND APP INITIALIZATION
// ===================================================================================
// ... (This section is unchanged)
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
  const characterName = nameInput.value.trim(); // Get name from input

  // Add validation to make sure a name is entered
  if (!characterName) {
    alert("Please enter a name for your character.");
    return;
  }

  character = {
    name: characterName, // Use the input name
    race: selectedRace,
    age: 0,
    monthsPassed: 0,
    health: 100,
    wealth: stats.medianFamilyNetWorth * 0.05,
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

  creationScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  runChildhoodSimulation();
});

sendButton.addEventListener('click', async () => {
    // ... (This function is unchanged)
});

newGameBtn.addEventListener('click', () => {
    // ... (This function is unchanged)
});

userInput.addEventListener('keydown', (event) => {
    // ... (This function is unchanged)
});

// ===================================================================================
//  SECTION 4: HELPER FUNCTIONS
// ===================================================================================
async function runChildhoodSimulation() {
    // ... (This function is unchanged)
}
function loadSavedGame() {
    // ... (This function is unchanged)
}
function updateStatus() {
    // ... (This function is unchanged)
}
function displayChoices(choices) {
    // ... (This function is unchanged)
}