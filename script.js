document.addEventListener('DOMContentLoaded', () => {

    // SECTION 1: DOM ELEMENT SELECTION & GLOBAL VARIABLES
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
    let gameActions = {}; // <--- THIS WAS THE MISSING LINE
    let character = {};
    let isAwaitingInput = true;

    // SECTION 2: DATA LOADING AND APP INITIALIZATION
    createCharacterBtn.disabled = true;
    createCharacterBtn.textContent = "Loading Data...";

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
    .catch(error => {
        console.error("Error loading data files:", error);
        alert("Could not load necessary game data. Please check the console and ensure data.json and actions.json exist.");
        createCharacterBtn.textContent = "Error Loading Data";
    });

    // SECTION 3: EVENT LISTENERS
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
            academicPerformance: 50,
            studentDebt: 0,
            flags: {},
            background: {
                isBelowPovertyLine: Math.random() < stats.povertyRate,
                isFromSingleParentHousehold: Math.random() < stats.singleParentHousehold,
                parentsHaveBachelors: Math.random() < stats.parentsHaveBachelors,
            },
            multipliers: { ...stats } // Copies all stats into multipliers
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
        if (confirm("Are you sure you want to start a new game? Any current progress will be lost.")) {
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

    // SECTION 4: CORE GAME LOGIC & HELPER FUNCTIONS
    
    // The Action Resolution Engine (for choice buttons)
    function resolveAction(actionId) {
        if (!isAwaitingInput) return;
        const action = gameActions.actions[actionId];
        if (!action) { console.error(`Action "${actionId}" not found.`); return; }
        
        isAwaitingInput = false;
        sendButton.disabled = true;
        choiceContainer.innerHTML = '';
        storyContainer.innerHTML += `<p class="user-text"><strong>You:</strong> ${action.label}</p>`;
        
        // 1. Check Requirements & Apply Costs
        if (action.requirements) {
            if (action.requirements.min_wealth && character.wealth < action.requirements.min_wealth) {
                storyContainer.innerHTML += `<p class="ai-text event-text">You don't have enough money to do that.</p>`;
                isAwaitingInput = true;
                sendButton.disabled = false;
                return;
            }
        }
        character.wealth += action.cost?.wealth || 0;
        character.health += action.cost?.health || 0;
        
        // 2. Roll for Success
        let successChance = action.success_chance;
        if (action.modifier && character.multipliers[action.modifier]) {
            successChance *= character.multipliers[action.modifier];
        }
        if (action.wealth_modifier) {
            if (character.background.isBelowPovertyLine) successChance *= 0.2;
            if (character.wealth > 20000) successChance *= 5;
        }
        successChance *= (character.academicPerformance / 50);

        const roll = Math.random();
        const outcome = roll < successChance ? action.success : action.failure;
        
        // 3. Calculate Debt
        if (outcome.calculate_debt) {
            const tuition = outcome.calculate_debt === 'private' ? 220000 : 92000;
            const familyContribution = character.wealth + (character.background.parentsHaveBachelors ? 20000 : 5000);
            const debt = tuition - familyContribution;
            character.studentDebt = debt > 0 ? debt : 0;
            if (character.studentDebt > 0) {
                outcome.text += ` You are now burdened with $${character.studentDebt.toLocaleString()} in student loans.`;
            } else {
                outcome.text += ` Thanks to family support, you graduate with no student debt.`;
            }
        }

        // 4. Apply Outcome Effects
        character.health += outcome.statChanges.health || 0;
        character.wealth += outcome.statChanges.wealth || 0;
        if (outcome.set_flag) {
            Object.assign(character.flags, outcome.set_flag);
        }
        
        const duration = outcome.statChanges.durationMonths || 0;
        character.monthsPassed += duration;
        if (character.monthsPassed >= 12) {
          character.age += Math.floor(character.monthsPassed / 12);
          character.monthsPassed = character.monthsPassed % 12;
        }
        
        storyContainer.innerHTML += `<p class="ai-text"><strong>Narrator:</strong> ${outcome.text}</p>`;

        if (checkHealth()) {
            takeTurn(`(The player just resolved the action '${action.label}')`);
        }
    }
    
    // The main function to get the next story beat from the AI
    async function takeTurn(userAction) {
        // ... (This function is the same as the last 'complete' version)
    }

    async function runChildhoodSimulation() {
        // ... (This function is the same)
    }
    
    function loadSavedGame() {
        // ... (This function is the same)
    }

    function updateStatus() {
        // ... (This function is the same)
    }

    function displayChoices(choices) {
        // ... (This function needs to handle action_ids now)
        choiceContainer.innerHTML = '';
        if (!choices || choices.length === 0) return;
        
        choices.forEach(actionId => {
            const action = gameActions.actions[actionId];
            if (!action) return;
            const button = document.createElement('button');
            button.textContent = action.label;
            button.classList.add('choice-btn');
            button.addEventListener('click', () => resolveAction(actionId));
            choiceContainer.appendChild(button);
        });
    }
    
    function checkHealth() {
        // ... (This function is the same)
    }

    function gameOver() {
        // ... (This function is the same)
    }
});