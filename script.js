document.addEventListener('DOMContentLoaded', () => {

    // SECTION 1: DOM ELEMENT SELECTION & GLOBAL VARIABLES
    const creationScreen = document.getElementById('character-creation');
    const gameContainer = document.getElementById('game-container');
    const storyContainer = document.getElementById('story-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const raceSelect = document.getElementById('race-select');
    const createCharacterBtn = document.getElementById('create-character-btn');
    const newGameBtn = document.getElementById('new-game-btn'); // Only one button now
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
        // ... (This function is unchanged)
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
        // ... (This function is unchanged)
    });

    // SECTION 4: CORE GAME LOGIC & HELPER FUNCTIONS
    async function takeTurn(userAction) {
        // ... (This function is unchanged)
    }

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
    
    function checkHealth() {
        // ... (This function is unchanged)
    }

    function gameOver() {
        // ... (This function is unchanged)
    }
});