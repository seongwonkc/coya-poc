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
const newGameBtn = document.getElementById('new-game-btn'); // New button
const statAge = document.getElementById('stat-age');
const statHealth = document.getElementById('stat-health');
const statWealth = document.getElementById('stat-wealth');
const choiceContainer = document.getElementById('choice-container');

let realWorldStats = {};
let character = {};

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
    loadSavedGame(); // Attempt to load a saved game after data is ready
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
  // ... (This function remains the same)
  const selectedRace = raceSelect.value;
  const stats = realWorldStats.race[selectedRace];
  character = {
    race: selectedRace,
    age: 18,
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
  updateStatus();
  creationScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  generateFirstPrompt();
});

sendButton.addEventListener('click', async () => {
  // ... (The prompt construction remains the same)
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
  const promptForAI = `...`; // The detailed prompt logic is unchanged
  
  try {
    const response = await fetch('/.netlify/functions/get-ai-response', { /* ... */ });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    document.getElementById('thinking').remove();
    storyContainer.innerHTML += `<p class="ai-text"><strong>Narrator:</strong> ${data.storyText}</p>`;
    
    character.age += data.statChanges.age || 0;
    character.health += data.statChanges.health || 0;
    character.wealth += data.statChanges.wealth || 0;
    
    updateStatus();
    displayChoices(data.choices);

    // AUTO-SAVE THE GAME STATE
    localStorage.setItem('lifeSimCharacter', JSON.stringify(character));
    localStorage.setItem('lifeSimStory', storyContainer.innerHTML);

  } catch (error) {
    // ... (Error handling remains the same)
  }
});

newGameBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to start a new game? Your current progress will be lost.")) {
    localStorage.removeItem('lifeSimCharacter');
    localStorage.removeItem('lifeSimStory');
    window.location.reload(); // Reload the page to start fresh
  }
});

userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.ctrlKey) {
    event.preventDefault();
    sendButton.click();
  }
});

// ===================================================================================
//  SECTION 4: HELPER FUNCTIONS (UI and Game Logic)
// ===================================================================================

function loadSavedGame() {
  const savedCharacter = localStorage.getItem('lifeSimCharacter');
  const savedStory = localStorage.getItem('lifeSimStory');

  if (savedCharacter && savedStory) {
    console.log("Saved game found. Loading...");
    character = JSON.parse(savedCharacter);
    storyContainer.innerHTML = savedStory;

    updateStatus();
    creationScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    // Check if the input or choices should be displayed
    const lastElement = storyContainer.lastElementChild;
    if (lastElement && lastElement.textContent.includes("Thinking...")) {
        // If the game was saved mid-turn, reset to a playable state
        lastElement.remove();
        document.getElementById('input-area').classList.remove('hidden');
    } else {
        displayChoices([]); // This will correctly show the input area if no choices are active
    }
  }
}

function updateStatus() { /* ... (This function remains the same) ... */ }
function generateFirstPrompt() { /* ... (This function remains the same) ... */ }
function displayChoices(choices) { /* ... (This function remains the same) ... */ }