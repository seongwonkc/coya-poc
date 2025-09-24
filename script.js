// This wrapper ensures the entire script runs only after the HTML page is fully loaded.
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
        if (confirm("Are you sure you want to start a new game? Your current progress will be lost.")) {
            localStorage.removeItem('lifeSimCharacter');
            localStorage.removeItem('lifeSimStory');
            window.location.reload();
        }
    };
    newGameBtn.addEventListener('click', resetGame);
    newGameBtnInGame.addEventListener('click', resetGame);

    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            sendButton.click();
        }
    });

    // SECTION 4: CORE GAME LOGIC & HELPER FUNCTIONS
    async function takeTurn(userAction) {
        // ... (takeTurn function as previously defined)
    }

    async function runChildhoodSimulation() {
        // ... (runChildhoodSimulation function as previously defined)
    }

    function resolveAction(actionId) {
        // ... (resolveAction function as previously defined)
    }

    function checkRandomEvents() {
        // ... (checkRandomEvents function as previously defined)
    }
    
    function loadSavedGame() {
        // ... (loadSavedGame function as previously defined)
    }

    function updateStatus() {
        // ... (updateStatus function as previously defined)
    }

    function displayChoices(choices) {
        // ... (displayChoices function as previously defined)
    }
    
    function checkHealth() {
        // ... (checkHealth function as previously defined)
    }

    function gameOver() {
        // ... (gameOver function as previously defined)
    }
});