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
    const newGameBtnInGame = document.getElementById('new-game-btn-ingame');
    const nameInput = document.getElementById('name-input');
    const statAge = document.getElementById('stat-age');
    const statHealth = document.getElementById('stat-health');
    const statWealth = document.getElementById('stat-wealth');
    const choiceContainer = document.getElementById('choice-container');

    let realWorldStats = {};
    let gameActions = {};
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
        alert("Could not load necessary game data. Please check the console.");
        createCharacterBtn.textContent = "Error Loading Data";
    });

    // SECTION 3: EVENT LISTENERS
    createCharacterBtn.addEventListener('click', () => {
        const selectedRace = raceSelect.value;
        const stats = realWorldStats.race[selectedRace];
        const characterName = nameInput.value.trim();
        if (!characterName) {
            alert("Please enter a name.");
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
            multipliers: { ...stats }
        };

        generateInitialLifeEvents(); // NEW: Determine major childhood events
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

    const resetGame = () => {
        if (confirm("Are you sure? Your progress will be lost.")) {
            localStorage.removeItem('lifeSimCharacter');
            localStorage.removeItem('lifeSimStory');
            window.location.reload();
        }
    };
    newGameBtn.addEventListener('click', resetGame);
    if (newGameBtnInGame) newGameBtnInGame.addEventListener('click', resetGame);

    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            sendButton.click();
        }
    });

    // SECTION 4: CORE GAME LOGIC & HELPER FUNCTIONS
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
            You are a Game Master for a realistic life simulator about systemic inequality.
            TONE: Grounded, gritty, realistic. Avoid "feel-good" or heroic outcomes. Focus on slow, challenging progress.
            CHARACTER BIOGRAPHY (Permanent facts): ${getCharacterBiography()}
            CURRENT STATS: Age: ${character.age}, Health: ${character.health}, Wealth: ${character.wealth}.
            PLAYER'S ACTION: "${userAction}".
            INSTRUCTIONS: 1. Narrate the outcome of the action, consistent with the BIOGRAPHY and TONE. 2. Determine consequences ('durationMonths', 'health', 'wealth'). 3. Suggest 3 relevant 'action_ids' from this list: [${Object.keys(gameActions.actions).join(', ')}].
            Respond ONLY with a valid JSON object: { "storyText": "...", "statChanges": { "durationMonths": 0, "health": 0, "wealth": 0 }, "choices": ["action_id_1", "action_id_2"] }
        `;

        try {
            const response = await fetch('/netlify/functions/get-ai-response', { method: 'POST', body: JSON.stringify({ userInput: promptForAI }) });
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
            
            if (checkHealth()) {
                displayChoices(data.choices);
                localStorage.setItem('lifeSimCharacter', JSON.stringify(character));
            }
        } catch (error) {
            const thinkingP = document.getElementById('thinking');
            if (thinkingP) thinkingP.textContent = "Error connecting to the storyteller. Please try again.";
            console.error('Fetch error:', error);
        } finally {
            if (character.health > 0) {
                isAwaitingInput = true;
                sendButton.disabled = false;
                userInput.focus();
            }
        }
    }

    async function runChildhoodSimulation() {
        isAwaitingInput = false;
        sendButton.disabled = true;
        let summary = `Your story begins. You are born a ${character.race} individual named ${character.name}.`;
        storyContainer.innerHTML = `<p class="ai-text"><strong>Narrator:</strong> ${summary}</p><p class="ai-text"><strong>Narrator:</strong> Simulating formative years...</p>`;
        updateStatus();

        for (let i = 1; i <= 17; i++) {
            character.age = i;
            character.academicPerformance += (character.multipliers.schoolFunding - 1.0) * 2;
            updateStatus();
            await new Promise(resolve => setTimeout(resolve, 600));

            const promptForChildhoodYear = `
                A character is now age ${character.age}.
                CHARACTER BIOGRAPHY: ${getCharacterBiography()}
                Briefly narrate a key event or summary for this year based on their BIOGRAPHY.
                CRUCIAL RULE: Do NOT mention raw numbers or multipliers.
                Respond ONLY with a valid JSON object: { "storyText": "...", "statChanges": { "health": 0, "wealth": 0 } }
            `;
            
            try {
                const response = await fetch('/netlify/functions/get-ai-response', { method: 'POST', body: JSON.stringify({ userInput: promptForChildhoodYear }) });
                if (!response.ok) throw new Error('API Response not OK');
                const data = await response.json();
                storyContainer.innerHTML += `<p class="ai-text"><strong>Age ${character.age}:</strong> ${data.storyText}</p>`;
                character.health += data.statChanges.health || 0;
                character.wealth += data.statChanges.wealth || 0;
                storyContainer.scrollTop = storyContainer.scrollHeight;
                if (!checkHealth()) return;
            } catch (error) {
                console.error(`Error simulating age ${i}:`, error);
                storyContainer.innerHTML += `<p class="ai-text event-text">Error simulating age ${character.age}. The year passed uneventfully.</p>`;
            }
        }

        character.age = 18;
        character.monthsPassed = 0;
        updateStatus();
        storyContainer.innerHTML += `<p class="ai-text"><strong>Narrator:</strong> You are now 18. Your childhood has shaped who you are. The first major decision of your adult life awaits.</p>`;
        
        await takeTurn(`I have just turned 18. Suggest my first choices from this list: [${gameActions.initial_choices.join(', ')}]`);
        localStorage.setItem('lifeSimCharacter', JSON.stringify(character));
    }

    function generateInitialLifeEvents() {
        // High Net Worth Check
        if (character.multipliers.medianFamilyNetWorth > 250000 && Math.random() < 0.5) {
            character.background.isHighNetWorth = true;
            character.wealth *= 5; // Start with more savings
        }
        // Parental Incarceration Check
        let incarcerationChance = 0.015 * character.multipliers.justiceSystemDisadvantage;
        if (character.background.isBelowPovertyLine) incarcerationChance *= 2;
        if (Math.random() < incarcerationChance) {
            character.background.parentIncarcerated = true;
            character.background.isFromSingleParentHousehold = true; // Assume this outcome
            character.health -= 10; // Early life trauma
        }
    }
    
    function getCharacterBiography() {
        let bio = `Name: ${character.name}, Race: ${character.race}. `;
        bio += `Grew up ${character.background.isBelowPovertyLine ? 'below the poverty line' : 'above the poverty line'}. `;
        bio += `Raised in a ${character.background.isFromSingleParentHousehold ? 'single-parent household' : 'two-parent household'}. `;
        if (character.background.parentIncarcerated) {
            bio += 'A parent was incarcerated during their childhood. ';
        }
        return bio;
    }

    function loadSavedGame() {
        const savedCharacter = localStorage.getItem('lifeSimCharacter');
        const savedStory = localStorage.getItem('lifeSimStory');
        if (savedCharacter && savedStory) {
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
        if (!choices) return;
        choices.forEach(choice => {
            let actionId = choice;
            let action = gameActions.actions[actionId];
            if (!action) {
                // Handle cases where AI might return text instead of an ID
                const foundAction = Object.values(gameActions.actions).find(a => a.label === choice);
                if (foundAction) {
                    action = foundAction;
                    actionId = Object.keys(gameActions.actions).find(key => gameActions.actions[key] === foundAction);
                }
            }
            if (!action) {
                console.warn(`Could not find action for choice: ${choice}`);
                return;
            }
            const button = document.createElement('button');
            button.textContent = action.label;
            button.classList.add('choice-btn');
            button.addEventListener('click', () => {
                if (!isAwaitingInput) return;
                resolveAction(actionId);
            });
            choiceContainer.appendChild(button);
        });
    }
    
    function resolveAction(actionId) {
        if (!isAwaitingInput) return;
        const action = gameActions.actions[actionId];
        if (!action) { console.error(`Action "${actionId}" not found.`); return; }
        
        isAwaitingInput = false;
        sendButton.disabled = true;
        choiceContainer.innerHTML = '';
        storyContainer.innerHTML += `<p class="user-text"><strong>You:</strong> ${action.label}</p>`;
        
        if (action.requirements) {
            if (action.requirements.min_wealth && character.wealth < action.requirements.min_wealth) {
                storyContainer.innerHTML += `<p class="ai-text event-text">You don't have enough money.</p>`;
                isAwaitingInput = true;
                sendButton.disabled = false;
                return;
            }
        }
        character.wealth += action.cost?.wealth || 0;
        character.health += action.cost?.health || 0;
        
        let successChance = action.success_chance;
        if (action.modifier && character.multipliers[action.modifier]) {
            successChance *= character.multipliers[action.modifier];
        }
        if (action.wealth_modifier) {
            if (character.background.isBelowPovertyLine) successChance *= 0.2;
            if (character.wealth > 20000 || character.background.isHighNetWorth) successChance *= 5;
        }
        successChance *= (character.academicPerformance / 50);

        const outcome = Math.random() < successChance ? action.success : action.failure;
        
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
        
        if (checkHealth()) {
            takeTurn(`(I just resolved the action '${action.label}' with the result: ${outcome.text})`);
        }
    }

    function checkHealth() {
        if (character.health <= 0) {
            gameOver();
            return false;
        }
        if (character.health > 100) {
            character.health = 100;
        }
        updateStatus();
        return true;
    }

    function gameOver() {
        isAwaitingInput = false;
        sendButton.disabled = true;
        storyContainer.innerHTML += `<div class="ai-text event-text">
          <strong>Your story has ended at age ${character.age}.</strong>
          <br>Final Wealth: $${Math.round(character.wealth).toLocaleString()}
        </div>`;
        storyContainer.scrollTop = storyContainer.scrollHeight;
        choiceContainer.innerHTML = '';
        document.getElementById('input-area').style.display = 'none';
        document.querySelector('.input-separator').style.display = 'none';
        localStorage.removeItem('lifeSimCharacter');
        localStorage.removeItem('lifeSimStory');
    }
});