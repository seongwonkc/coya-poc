// ===================================================================================
//  SECTION 1: DOM ELEMENT SELECTION & GLOBAL VARIABLES
// ===================================================================================
const creationScreen = document.getElementById('character-creation');
const gameContainer = document.getElementById('game-container');
// ... (all other consts are the same)
let realWorldStats = {};
let gameActions = {};
let character = {};
let isAwaitingInput = true;

// ===================================================================================
//  SECTION 2: DATA LOADING AND APP INITIALIZATION
// ===================================================================================
Promise.all([
  fetch('data.json').then(res => res.json()),
  fetch('actions.json').then(res => res.json())
])
.then(([statsData, actionsData]) => {
  realWorldStats = statsData;
  gameActions = actionsData;
  console.log("All game data loaded successfully.");
  createCharacterBtn.disabled = false;
  createCharacterBtn.textContent = "Begin Life";
  loadSavedGame();
})
.catch(error => { console.error("Error loading data files:", error); });

// ===================================================================================
//  SECTION 3: EVENT LISTENERS (The Core Logic)
// ===================================================================================
createCharacterBtn.addEventListener('click', () => {
  const selectedRace = raceSelect.value;
  const stats = realWorldStats.race[selectedRace];
  const characterName = nameInput.value.trim();
  if (!characterName) { alert("Please enter a name."); return; }

  character = {
    name: characterName,
    race: selectedRace,
    age: 0,
    monthsPassed: 0,
    health: 100,
    wealth: stats.medianFamilyNetWorth * 0.05,
    academicPerformance: 50, // Start at a baseline of 50
    studentDebt: 0,
    flags: {},
    background: {
        isBelowPovertyLine: Math.random() < stats.povertyRate,
        isFromSingleParentHousehold: Math.random() < stats.singleParentHousehold,
        parentsHaveBachelors: Math.random() < stats.parentsHaveBachelors,
    },
    multipliers: {
      schoolFunding: stats.schoolFundingLevel,
      // ... (all other multipliers)
    }
  };
  creationScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  runChildhoodSimulation();
});

// ... (sendButton, newGameBtn, keydown listeners are unchanged)

// ===================================================================================
//  SECTION 4: CORE GAME LOGIC & HELPER FUNCTIONS
// ===================================================================================

function resolveAction(actionId) {
    if (!isAwaitingInput) return;
    const action = gameActions.actions[actionId];
    if (!action) { console.error(`Action "${actionId}" not found.`); return; }

    // ... (Check requirements and apply costs)

    // Calculate Success Chance
    let successChance = action.success_chance;
    if (action.wealth_modifier) {
        if (character.background.isBelowPovertyLine) successChance *= 0.2;
        if (character.wealth > 20000) successChance *= 5; // Simplified high-wealth bonus
    }
    successChance *= (character.academicPerformance / 50); // Academic performance modifier

    const roll = Math.random();
    const outcome = roll < successChance ? action.success : action.failure;
    
    // Calculate Debt if applicable
    if (outcome.calculate_debt) {
        const tuition = outcome.calculate_debt === 'private' ? 220000 : 92000; // 4-year total
        const familyContribution = character.wealth + (character.background.parentsHaveBachelors ? 20000 : 5000);
        const debt = tuition - familyContribution;
        character.studentDebt = debt > 0 ? debt : 0;
        if (character.studentDebt > 0) {
            outcome.text += ` You are now burdened with $${character.studentDebt.toLocaleString()} in student loans.`;
        } else {
            outcome.text += ` Thanks to family support, you graduate with no student debt.`;
        }
    }
    
    // ... (Apply other effects, update stats, request next turn)
}

async function runChildhoodSimulation() {
  isAwaitingInput = false;
  // ... (summary text)
  for (let i = 1; i <= 17; i++) {
    character.age = i;
    // NEW: Update academic performance based on school funding
    character.academicPerformance += (character.multipliers.schoolFunding - 1.0) * 2;
    // ... (the rest of the loop is unchanged)
  }
  character.age = 18;
  // ... (transition to adulthood)
  // The AI prompt for the first turn should now suggest action_ids
  await requestNextTurn(`I have just turned 18. Suggest my first choices from this list: [${gameActions.initial_choices.join(', ')}]`);
}

// ... (All other functions are unchanged)