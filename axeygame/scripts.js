let points = 0;
let pointsPerClick = 1;
let pointsPerSecond = 0;
let axeyHelperEnabled = false;
let axeyHelperInterval;
let rebirthCounter = 0;
let upgradePerClickCost = 50;
let axeyHelperCost = 100;

const pointsDisplay = document.getElementById('points');
const ppsDisplay = document.getElementById('pps');
const clickableImage = document.getElementById('clickableImage');
const upgradePerClick = document.getElementById('upgradePerClick');
const axeyHelperButton = document.getElementById('axeyHelper');
const rebirthButton = document.getElementById('rebirthButton');
const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsButton = document.getElementById('closeSettings');
const saveGameButton = document.getElementById('saveGame');
const loadGameButton = document.getElementById('loadGame');
const wipeGameButton = document.getElementById('wipeGame');
const rebirthCounterDisplay = document.getElementById('rebirthCounter');
const rebirthCountDisplay = document.getElementById('rebirthCount');

const updateDisplay = () => {
    pointsDisplay.textContent = points;
    ppsDisplay.textContent = pointsPerSecond;
};

// Click Handler
clickableImage.addEventListener('click', () => {
    points += pointsPerClick;
    updateDisplay();
});

// Shop Buttons
upgradePerClick.addEventListener('click', () => {
    if (points >= upgradePerClickCost) {
        points -= upgradePerClickCost;
        pointsPerClick += 2;
        upgradePerClickCost *= 1.5; // Increase cost for next upgrade
        document.getElementById('upgradePerClickCost').textContent = `Cost: ${Math.floor(upgradePerClickCost)} points`;
        updateDisplay();
    }
});

axeyHelperButton.addEventListener('click', () => {
    if (points >= axeyHelperCost && !axeyHelperEnabled) {
        points -= axeyHelperCost;
        axeyHelperEnabled = true;
        axeyHelperCost *= 1.5; // Increase cost for next purchase
        document.getElementById('axeyHelperCost').textContent = `Cost: ${Math.floor(axeyHelperCost)} points`;
        startAxeyHelper();
        updateDisplay();
    }
});

// Axey Helper Logic
function startAxeyHelper() {
    axeyHelperInterval = setInterval(() => {
        points += 1;
        pointsPerSecond += 1;
        updateDisplay();
    }, 1);
}

// Rebirth
rebirthButton.addEventListener('click', () => {
    if (points >= 20000) {
        points = 0;
        rebirthCounter++;
        rebirthCountDisplay.textContent = rebirthCounter;
        rebirthCounterDisplay.classList.remove('hidden');
        updateDisplay();
    }
});

// Settings Modal
settingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
});

closeSettingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

// Save Game
saveGameButton.addEventListener('click', () => {
    const gameStateTextbox = document.getElementById('gameStateTextbox');
    gameStateTextbox.value = JSON.stringify({ points, pointsPerClick, rebirthCounter });
    settingsModal.style.display = 'none';
});

// Load Game
loadGameButton.addEventListener('click', () => {
    const gameStateTextbox = document.getElementById('gameStateTextbox');
    const savedState = JSON.parse(gameStateTextbox.value);
    if (savedState) {
        points = savedState.points;
        pointsPerClick = savedState.pointsPerClick;
        rebirthCounter = savedState.rebirthCounter;
        rebirthCountDisplay.textContent = rebirthCounter;
        rebirthCounterDisplay.classList.toggle('hidden', rebirthCounter === 0);
        updateDisplay();
    }
    settingsModal.style.display = 'none';
});

// Wipe Game
wipeGameButton.addEventListener('click', () => {
    localStorage.removeItem('gameState');
    points = 0;
    pointsPerClick = 1;
    rebirthCounter = 0;
    rebirthCounterDisplay.classList.add('hidden');
    updateDisplay();
    settingsModal.style.display = 'none';
});

// Auto-update
setInterval(() => {
    points += pointsPerSecond;
    updateDisplay();
}, 1000);
