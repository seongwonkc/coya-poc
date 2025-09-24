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
    let character = {};
    let isAwaitingInput = true;

    // SECTION 2: DATA LOADING AND APP INITIALIZATION
    createCharacterBtn.disabled = true;
    createCharacterBtn.textContent = "Loading Data...";

    fetch('data.json') // Only loading the main data file for now to ensure stability
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        realWorldStats = data;
        console.log("Game data loaded successfully.");
        createCharacterBtn.disabled = false;
        createCharacterBtn.textContent = "Begin Life";
        loadSavedGame();
    })
    .catch(error => {
        console.error("Error loading data file:", error);
        alert("Could not load necessary game data. Please check that data.json exists and is correct.");
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
            background: {
                isBelowPovertyLine: Math.random() < stats.povertyRate,
                isFromSingleParentHousehold: Math.random() < stats.singleParentHousehold,
                parentsHaveBachelors: Math.random() < stats.parentsHaveBachelors,
            },
            multipliers: { ...stats }
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
        storyContainer.innerHTML += `<p class="user-text"><strong>You:</strong> ${userAction}</p>`;
        userInput.value = '';
        storyContainer.innerHTML += `<p class="ai-text" id="thinking"><strong>Narrator:</strong> Thinking...</p>`;
        storyContainer.scrollTop = storyContainer.scrollHeight;

        const promptForAI = `
            You are a Game Master for a realistic life simulator.
            TONE: Grounded, gritty, and realistic. Avoid "feel-good" outcomes.
            CHARACTER BIOGRAPHY: ${getCharacterBiography()}
            CURRENT STATS: Age: ${character.age}, Health: ${character.health}, Wealth: ${character.wealth}.
            PLAYER'S ACTION: "${userAction}".
            INSTRUCTIONS: 1. Narrate the outcome. 2. Determine consequences ('durationMonths', 'health', 'wealth'). 3. Provide 3 text choices for the player.
            Respond ONLY with a valid JSON object: { "storyText": "...", "statChanges": { "durationMonths": 0, "health": 0, "wealth": 0 }, "choices": ["Choice A", "Choice B", "Choice C"] }
        `;

        try {
            const response = await fetch('/netlify/functions/get-ai-response', { method: 'POST', body: JSON.stringify({ userInput: promptForAI }) });
            if (!response.ok) throw new Error(`API error: ${response.statusText}`);
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
            if (thinkingP) thinkingP.textContent = "An error occurred with the AI. Please try a different choice or refresh.";
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
            updateStatus();
            await new Promise(resolve => setTimeout(resolve, 600));

            const promptForChildhoodYear = `
                A character is now age ${character.age}.
                CHARACTER BIOGRAPHY: ${getCharacterBiography()}
                Briefly narrate a key event or summary for this year based on their full BIOGRAPHY.
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
        
        await takeTurn("Present me with my first life choices.");
        localStorage.setItem('lifeSimCharacter', JSON.stringify(character));
    }
    
    function getCharacterBiography() {
        let bio = `Name: ${character.name}, Race: ${character.race}. `;
        bio += `Grew up ${character.background.isBelowPovertyLine ? 'below the poverty line' : 'above the poverty line'}. `;
        bio += `Raised in a ${character.background.isFromSingleParentHousehold ? 'single-parent household' : 'two-parent household'}. `;
        // Add more background flags here in the future
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
            const button = document.createElement('button');
            button.textContent = choice;
            button.classList.add('choice-btn');
            button.addEventListener('click', () => {
                if (!isAwaitingInput) return;
                userInput.value = choice;
                sendButton.click();
            });
            choiceContainer.appendChild(button);
        });
    }
    
    function checkHealth() {
        if (character.health <= 0) {
            gameOver();
            return false;
        }
        if (character.health > 100) { character.health = 100; }
        updateStatus();
        return true;
    }

    function gameOver() {
        isAwaitingInput = false;
        sendButton.disabled = true;
        storyContainer.innerHTML += `<div class="ai-text event-text">...</div>`;
        choiceContainer.innerHTML = '';
        document.getElementById('input-area').style.display = 'none';
        document.querySelector('.input-separator').style.display = 'none';
        localStorage.removeItem('lifeSimCharacter');
        localStorage.removeItem('lifeSimStory');
    }
});