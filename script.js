const DAY_LENGTH_MS = 60000;
const LIGHTING = {
    dawnStart: 0.18,
    dayStart: 0.3,
    duskStart: 0.7,
    nightStart: 0.82
};
const WEATHER_TYPES = [
    {type: 'clear', minDuration: 40000, maxDuration: 90000},
    {type: 'rain', minDuration: 45000, maxDuration: 80000},
    {type: 'storm', minDuration: 30000, maxDuration: 60000},
    {type: 'snow', minDuration: 60000, maxDuration: 110000}
];
const SPRITE_PATH = 'assets/';
const SPRITES = {};
const SPRITE_FILES = {
    road: 'road.png',
    house1: 'house1.png',
    house2: 'house2.png',
    house3: 'house3.png',
    commercial: 'commercial.png',
    industry: 'industry.png',
    quarry: 'quarry.png',
    factory: 'factory.png',
    park: 'park.png',
    water: 'water.png',
    forest: 'forest.png',
    stone: 'stone.png'
}
const WEATHER_PARTICLE_BUDGET = 180;
const WORLD_SIZE = 128;
const TILE_SIZE = 64;
const TICK_RATE = 1000;
const BUILDINGS = {
    road: {
        cost: 10,
        wood: 0,
        stone: 0,
        type: 'road',
        name: 'Road',
        color: '#555555'
    },
    house1: {
        cost: 50,
        wood: 10,
        stone: 0,
        type: 'house1',
        name: 'House I',
        popCap: 5,
        color: '#e74c3c'
    },
    house2: {
        cost: 150,
        wood: 30,
        stone: 10,
        type: 'house2',
        name: 'House II',
        popCap: 12,
        color: '#c0392b'
    },
    house3: {
        cost: 400,
        wood: 100,
        stone: 40,
        type: 'house3',
        name: 'House III',
        popCap: 30,
        color: '#922b21'
    },
    commercial: {
        cost: 100,
        wood: 20,
        stone: 0,
        type: 'commercial',
        name: 'Market',
        jobs: 4,
        incomePerWorker: 3,
        color: '#3498db'
    },
    industry: {
        cost: 150,
        wood: 0,
        stone: 0,
        type: 'industry',
        name: 'Lumber Mill',
        jobs: 5,
        woodPerWorker: 1.5,
        color: '#f1c40f'
    },
    quarry: {
        cost: 200,
        wood: 20,
        stone: 0,
        type: 'quarry',
        name: 'Quarry',
        jobs: 5,
        stonePerWorker: 1,
        color: '#95a5a6'
    },
    factory: {
        cost: 400,
        wood: 50,
        stone: 20,
        type: 'factory',
        name: 'Factory',
        jobs: 10,
        incomePerWorker: 8,
        color: '#e67e22'
    },
    park: {
        cost: 30,
        wood: 0,
        stone: 0,
        type: 'park',
        name: 'Small Park',
        color: '#27ae60'
    },
    bulldoze: {
        cost: 5,
        wood: 0,
        stone: 0,
        type: 'bulldoze',
        name: 'Bulldozer',
        color: 'red'
    },
    select: {
        cost: 0,
        wood: 0,
        stone: 0,
        type: 'select',
        name: 'Cursor',
        color: 'white'
    }
};
const TERRAIN_COLORS = {
    grass: '#2ecc71',
    water: '#3498db',
    forest: '#27ae60',
    stone: '#7f8c8d'
}
const PERSON_ANIMATION_DURATION = 1400;
let peopleAnimations = [];
let floatingTexts = [];
let state = {
    money: 1000,
    wood: 50,
    stone: 0,
    population: 0,
    populationCap: 0,
    day: 1,
    selectedTool: 'select',
    grid: [],
    agents: [],
    employedCount: 0,
    objectives: {
        activeIndex: 0,
        progress: {
            build: {}
        },
        completed: []
    },
    timeOfDay: 0,
    weather: {
        type: 'clear',
        intensity: 0,
        nextChange: 0,
        particles: []
    },
    isPaused: false,
    weatherEnabled: true,
    weatherIntensityMultiplier: 1,
    trade: {carts: [], tick: 0}
};
let camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    minZoom: 0.2,
    maxZoom: 3.0
};

let input = {
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    hoverX: -1,
    hoverY: -1,
    mouseX: 0,
    mouseY: 0
};
let currentAmbientLight = 1;
let nightLightingActive = false;
let lastFrameTime = 0;
let canvas, ctx;
let minimapCanvas, minimapCtx;
let hasStarted = false;
const tutorialSteps = [
    {id: 'intro', text: 'Welcome to City Builder! you can drag to pan and scroll to zoom!', autoAdvance: 3500},
    {id: 'road', text: 'Select the Road tool and place a Road tile', event: 'build:road'},
    {id: 'house', text: 'Yay! Now place a House I next to your road', event: 'build:house1'},
    {id: 'market', text: 'Build a Market to create jobs and incomr', event: 'build:commercial'}
];
const OBJECTIVES = [
    {
        id: 'build_roads',
        description: 'Build 3 Roads to start your street grid.',
        requirements: {build: {road: 3}},
        reward: {money: 50}
    },
    {
        id: 'populate_settlement',
        description: 'Reach a population of 5 by building housing.',
        requirements: {population: 5},
        reward: {money: 100, wood: 20}
    },
    {
        id: 'open_market',
        description: 'Construct a Market to create jobs and income',
        requirements: {build: {commercial: 1}},
        reward: {money: 150}
    },
    {
        id: 'staff_industry',
        description: 'Employ 5 citizens in job buildings',
        requirements: {employed: 5},
        reward: {money: 100, stone: 20}
    },
    {
        id: 'grow_treasury',
        description: 'Collect $2k',
        requirements: {money: 2000},
        reward: {wood: 40, stone: 20}
    }
]
let tutorial = {active: true, stepIndex: 0};
let tutorialTimeout = null;
function init() {
    canvas = document.getElementById('game-canvas');
    state.weather.nextChange = performance.now() + 45000;
    lastFrameTime = performance.now();
    ctx = canvas.getContext('2d', {alpha: false});
    minimapCanvas = document.getElementById('minimap');
    minimapCtx = minimapCanvas.getContext('2d');
    window.addEventListener('resize', resizeCanvas);
    loadSprites();
    resizeCanvas();
    setupInputs();
    setupSettingsControls();
    generateWorld();
    ensureTradeDataOnGrid();
    centerCamera();
    updateUI();
    drawMinimap();
    startGameLoop();
    requestAnimationFrame(renderLoop);
    startTutorial();
}
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
function centerCamera() {
    camera.x = (WORLD_SIZE * TILE_SIZE) / 2;
    camera.y = (WORLD_SIZE * TILE_SIZE) / 2;
    camera.zoom = 0.5;
}
function generateWorld() {
    state.grid = [];
    for (let y = 0; y < WORLD_SIZE; y++) {
        let row = [];
        for (let x = 0; x < WORLD_SIZE; x++) {
            row.push({
                type: 'grass',
                x, y,
                workers: 0,
                maxWorkers: 0,
                variant: Math.random(),
                goods: 0,
                stock: 0,
                tradeCooldown: 0
            });
        }
        state.grid.push(row);
    }
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            if (Math.random() < 0.35) state.grid[y][x].type = 'water';
        }
    }
    for (let i = 0; i < 4; i++) applyAutomataRule('water', 'grass', 4);
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            if (state.grid[y][x].type === 'grass' && Math.random() < 0.3) {
                state.grid[y][x].type = 'forest';
            }
        }
    }
    for (let i = 0; i < 2; i++) applyAutomataRule('forest', 'grass', 4);
    const cx = Math.floor(WORLD_SIZE / 2);
    const cy = Math.floor(WORLD_SIZE / 2);
    for (let y = cy-5; y < cy+5; y++) {
        for (let x = cx-5; x < cx+5; x++) {
            state.grid[y][x].type = 'grass';
        }
    }
}
function loadSprites() {
    for (const [key, file] of Object.entries(SPRITE_FILES)) {
        const image = new Image();
        image.src = `${SPRITE_PATH}${file}`;
        SPRITES[key] = image;
    }
}
function applyAutomataRule(targetType, emptyType, threshold) {
    let newGridState = JSON.parse(JSON.stringify(state.grid.map(row => row.map(cell => cell.type))));
    for (let y = 1; y < WORLD_SIZE - 1; y++) {
        for (let x = 1; x < WORLD_SIZE - 1; x++) {
            let neighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (state.grid[y+dy][x+dx].type === targetType) neighbors++;
                }
            }
            if (state.grid[y][x].type === targetType) {
                if (neighbors < threshold) newGridState[y][x] = emptyType;
            } else if (state.grid[y][x].type === emptyType) {
                if (neighbors > threshold) newGridState[y][x] = targetType;
            }
        }
    }
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            if (newGridState[y][x]) state.grid[y][x].type = newGridState[y][x];
        }
    }
}
function setupInputs() {
    canvas.addEventListener('mousedown', e => {
        if (e.button === 0 || e.button === 1) {
            input.isDragging = true;
            input.lastMouseX = e.clientX;
            input.lastMouseY = e.clientY;
        }
    });
    window.addEventListener('mouseup', () => {
        input.isDragging = false;
    });
    canvas.addEventListener('mousemove', e => {
        updateHover(e.clientX, e.clientY);
        if (input.isDragging && (e.buttons === 4 || state.selectedTool === 'select')) {
            const dx = (e.clientX - input.lastMouseX) / camera.zoom;
            const dy = (e.clientY - input.lastMouseY) / camera.zoom;
            camera.x -= dx;
            camera.y -= dy;
            camera.x = Math.max(0, Math.min(camera.x, WORLD_SIZE * TILE_SIZE));
            camera.y = Math.max(0, Math.min(camera.y, WORLD_SIZE * TILE_SIZE));
            input.lastMouseX = e.clientX;
            input.lastMouseY = e.clientY;
        }
    });
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        if (e.deltaY < 0) {
            camera.zoom = Math.min(camera.zoom + zoomSpeed, camera.maxZoom);
        } else {
            camera.zoom = Math.max(camera.zoom - zoomSpeed, camera.minZoom);
        }
    }, {passive: false});
    
    canvas.addEventListener('click', e => {
        if (input.isDragging && (Math.abs(e.clientX - input.lastMouseX) > 5)) return;
        handleMapClick();
    });
}
function updateHover(screenX, screenY) {
    const rect = canvas.getBoundingClientRect();
    const worldX = (screenX - rect.left - canvas.width/2) / camera.zoom + camera.x;
    const worldY = (screenY - rect.top - canvas.height/2) / camera.zoom + camera.y;
    input.hoverX = Math.floor(worldX / TILE_SIZE);
    input.hoverY = Math.floor(worldY / TILE_SIZE);
    input.mouseX = screenX;
    input.mouseY = screenY;
}
function setupCanvas() {
    const canvas = document.getElementById('agent-layer');
    const totalWidth = (GRID_WIDTH * TILE_SIZE) + ((GRID_WIDTH - 1) * TILE_GAP);
    const totalHeight = (GRID_HEIGHT * TILE_SIZE) + ((GRID_HEIGHT - 1) * TILE_GAP);
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    ctx = canvas.getContext('2d');
}
function drawTile(tile) {
    const px = tile.x * TILE_SIZE;
    const py = tile.y * TILE_SIZE;

    const sprite = SPRITES[tile.type];
    if (sprite && sprite.complete) {
        ctx.drawImage(sprite, px, py, TILE_SIZE, TILE_SIZE);
    } else {
        let color = TERRAIN_COLORS[tile.type] || '#ff00ff';
        if (BUILDINGS[tile.type]) {
            color = BUILDINGS[tile.type].color;
        }
        ctx.fillStyle = color;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
    if (tile.type.startsWith('house') || tile.type === 'commercial' || tile.type === 'industry' || tile.type === 'factory' || tile.type === 'quarry') {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let label = '';
        if (tile.type === 'house1') label = 'H1';
        if (tile.type === 'house2') label = 'H2';
        if (tile.type === 'house3') label = 'H3';
        if (tile.type === 'commercial') label = '$';
        if (tile.type === 'industry') label = 'W';
        if (tile.type === 'factory') label = 'F';
        if (tile.type === 'quarry') label = 'Q';
        ctx.fillText(label, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
    }
    if (nightLightingActive && (tile.type.startsWith('house') || tile.type === 'commercial' || tile.type === 'industry' || tile.type === 'factory')) {
        const glowAlpha = 0.35 + (1 - currentAmbientLight) * 0.5;
        ctx.fillStyle = `rgba(255, 223, 128, ${glowAlpha})`;
        const windowW = TILE_SIZE * 0.18;
        const windowH = TILE_SIZE * 0.22;
        ctx.fillRect(px + TILE_SIZE * 0.18, py + TILE_SIZE * 0.24, windowW, windowH);
        ctx.fillRect(px + TILE_SIZE * 0.64, py + TILE_SIZE * 0.24, windowW, windowH);
        if (BUILDINGS[tile.type]?.jobs) {
            ctx.fillRect(px + TILE_SIZE * 0.41, py + TILE_SIZE * 0.62, windowW, windowH * 0.9);
        }
    }
}
function saveGame() {
    try {
        const json = JSON.stringify(state);
        localStorage.setItem('cityBuilderSave', json);
        showMessage("Game saved successfully!");
    } catch (e) {
        console.error(e);
        showMessage("Error saving game");
    }
}
function loadGame() {
    const json = localStorage.getItem('cityBuilderSave');
    if (!json) {
        showMessage("No save found");
        return;
    }
    try {
        const savedState = JSON.parse(json);
        state = {
            ...state,
            ...savedState,
            grid: savedState.grid || state.grid,
            agents: (savedState.agents || []).map(agent => ({
                ...agent,
                path: [],
                pathIndex: 0,
                job: null
            })),
            trade: {carts: [], tick: 0}
        };
        if (typeof state.weatherEnabled === 'undefined') state.weatherEnabled = true;
        if (typeof state.weatherIntensityMultiplier === 'undefined') state.weatherIntensityMultiplier = 1;
        const defaultObjectives = {
            activeIndex: 0,
            progress: {build: {}},
            completed: []
        };
        state.objectives = {
            ...defaultObjectives,
            ...(savedState.objectives || {}),
            progress: {
                build: {
                    ...defaultObjectives.progress.build,
                    ...(savedState.objectives?.progress?.build || {})
                }
            }
        };
        if (!savedState.objectives?.progress?.build) {
            rebuildObjectiveBuildProgress();
        }
        tutorial.active = false;
        if (tutorialTimeout) {
            clearTimeout(tutorialTimeout);
            tutorialTimeout = null;
        }
        updateUI();
        updateSettingsUI();
        drawMinimap();
        recalculateJobs();
        showMessage("Game loaded!");
    } catch (e) {
        console.error(e);
        showMessage("Error loading save");
    }
}
function selectTool(toolName) {
    state.selectedTool = toolName;
    hideSelectionTooltip();
    document.querySelectorAll('.tool-button').forEach(button => button.classList.remove('active'));
    const buttons = document.querySelectorAll('.tool-button');
    for (let button of buttons) {
        if (toolName === 'select' && button.innerText.includes('Cursor')) button.classList.add('active');
        else if (BUILDINGS[toolName] && button.innerText.includes(BUILDINGS[toolName].name)) button.classList.add('active');
        else if (toolName === 'bulldoze' && button.innerText.includes('Bulldoze')) button.classList.add('active');
    }
}
function updateSettingsControls() {
    const toggle = document.getElementById('weather-toggle');
    const slider = document.getElementById('weather-intensity');
    const valueLabel = document.getElementById('weather-intensity-value');
    if (!toggle || !slider || !valueLabel) return;
    updateSettingsUI();
    toggle.addEventListener('change', () => {
        state.weatherEnabled = toggle.checked;
        slider.disabled = !toggle.checked;
        updateSettingsUI();
    })
    slider.addEventListener('input', () => {
        const value = Math.max(0, Math.min(100, Number(slider.value)));
        state.weatherIntensityMultiplier = value / 100;
        valueLabel.innerText = `${value}%`;
    })
}
function updateSettingsUI() {
    const toggle = document.getElementById('weather-toggle');
    const slider = document.getElementById('weather-intensity');
    const valueLabel = document.getElementById('weather-intensity-value');
    if (!toggle || !slider || !valueLabel) return;
    toggle.checked = !!state.weatherEnabled;
    const value = Math.round((state.weatherIntensityMultiplier ?? 1) * 100);
    slider.value = `${value}`;
    slider.disabled = !toggle.checked;
    valueLabel.innerText = `${value}%`;
}
function getEffectiveWeatherIntensity() {
    if (!state.weatherEnabled) return 0;
    const raw = state.weather.intensity * (state.weatherIntensityMultiplier ?? 1);
    return Math.max(0, Math.min(1, raw));
}
function handleTileClick(x, y) {
    const tileData = state.grid[y][x];
    const tileDiv = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
    const tool = BUILDINGS[state.selectedTool];
    if (state.selectedTool === 'select') {
        showMessage(`Inspect: ${tileData.type.toUpperCase()} at ${x},${y}`);
        return;
    }
    if (tileData.type === 'water') {
        showMessage('You cannot build on water');
        return;
    }
    if (state.selectedTool === 'bulldoze') {
        if (tileData.type === 'grass') return;
        if (state.money >= tool.cost) {
            state.money -= tool.cost;
            if (BUILDINGS[tileData.type] && BUILDINGS[tileData.type].popCap) {
                state.populationCap -= BUILDINGS[tileData.type].popCap;
                state.agents = state.agents.filter(a => !(a.homeX === x && a.homeY === y));
            }
            tileDiv.classList.remove(tileData.type);
            tileData.type = 'grass';
            tileData.maxWorkers = 0;
            tileData.workers = 0;
            recalculateJobs();
            updateUI();
            showMessage("Demolished!");
        } else {
            showMessage("Not enough money")
        }
        return;
    }
    let isUpgrade = false;
    if ((tileData.type === 'house1' && tool.type === 'house2') ||
        (tileData.type === 'house1' && tool.type === 'house3') ||
        (tileData.type === 'house2' && tool.type === 'house3')) {
        isUpgrade = true;
    }
    if (tileData.type !== 'grass' && !isUpgrade) {
        showMessage("Space already occupied!");
        return;
    }
    const hasMoney = state.money >= tool.cost;
    const hasWood = state.wood >= (tool.wood || 0);
    const hasStone = state.stone >= (tool.stone || 0);
    if (hasMoney && hasWood && hasStone) {
        state.money -= tool.cost;
        state.wood -= (tool.wood || 0);
        state.stone -= (tool.stone || 0);
        if (isUpgrade) {
            tileDiv.classList.remove(tileData.type);
            if (BUILDINGS[tileData.type].popCap) {
                state.populationCap -= BUILDINGS[tileData.type].popCap;
            }
        }
        tileData.type = tool.type;
        tileDiv.classList.add(tool.type);
        if (tool.popCap) {
            state.populationCap += tool.popCap;
            spawnPersonAnimation(x, y, Math.min(3, Math.max(1, Math.ceil(tool.popCap / 5))));
        } else if (tool.jobs) {
            spawnPersonAnimation(x, y, 1);
        }
        if (tool.jobs) {
            tileData.maxWorkers = tool.jobs;
            tileData.workers = 0;
        }
        recordBuildForObjectives(tool.type);
        recalculateJobs();
        updateUI();
    } else {
        let missing = [];
        if (!hasMoney) missing.push("Money");
        if (!hasWood) missing.push("Wood");
        if (!hasStone) missing.push("Stone");
        showMessage(`Need more: ${missing.join(', ')}`);
    }
}
function findPath(startX, startY, endX, endY) {
    const MAX_DIST = 60;
    if (Math.abs(startX - endX) + Math.abs(startY - endY) > MAX_DIST) return null
    let startNodes = getAdjacentRoads(startX, startY);
    let endNodes = getAdjacentRoads(endX, endY);
    if (startNodes.length === 0 || endNodes.length === 0) return null;
    let queue = [];
    let visited = new Set();
    let parents = {};
    for (let node of startNodes) {
        let key = `${node.x},${node.y}`;
        queue.push(node);
        visited.add(key);
        parents[key] = null;
    }
    let iterations = 0;
    while (queue.length > 0) {
        iterations++
        if (iterations > 2000) return null;
        let current = queue.shift();
        if (endNodes.some(n => n.x === current.x && n.y === current.y)) {
            let path = [];
            let currentKey = `${current.x},${current.y}`;
            while (currentKey) {
                let parts = currentKey.split(',');
                path.unshift({x: parseInt(parts[0]), y: parseInt(parts[1])});
                let p = parents[currentKey];
                currentKey = p ? `${p.x},${p.y}` : null;
            }
            return path;
        }
        let dirs = [[0,1], [0,-1], [1,0], [-1,0]];
        for (let d of dirs) {
            let nx = current.x + d[0];
            let ny = current.y + d[1];
            let nKey = `${nx},${ny}`;
            if (nx >= 0 && nx < WORLD_SIZE && ny >= 0 && ny < WORLD_SIZE) {
                if (state.grid[ny][nx].type === 'road' && !visited.has(nKey)) {
                    visited.add(nKey);
                    parents[nKey] = current;
                    queue.push({x: nx, y: ny});
                }
            }
        }
    }
    return null;
}
function getAdjacentRoads(cx, cy) {
    let roads = [];
    let dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < WORLD_SIZE && ny >= 0 && ny < WORLD_SIZE) {
            if (state.grid[ny][nx].type === 'road') {
                roads.push({x: nx, y: ny});
            }
        }
    }
    return roads;
}
function ensureTradeDataOnGrid() {
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            const tile = state.grid[y][x];
            tile.goods = tile.goods;
            tile.stock = tile.stock || 0;
            tile.tradeCooldown = tile.tradeCooldown || 0;
        }
    }
}
function recalculateJobs() {
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            if (state.grid[y][x].maxWorkers > 0) state.grid[y][x].workers = 0;
        }
    }
    state.agents.forEach(agent => {
        agent.job = null;
        agent.path = [];
        agent.pathIndex = 0;
    });

    const jobs = [];
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            if (state.grid[y][x].maxWorkers > 0) jobs.push({x,y, tile: state.grid[y][x]});
        }
    }
    state.agents.forEach(agent => {
        let bestJob = null;
        let bestPath = null;
        jobs.sort((jobA, jobB) => {
            const distA = Math.abs(agent.homeX - jobA.x) + Math.abs(agent.homeY - jobA.y);
            const distB = Math.abs(agent.homeX - jobB.x) + Math.abs(agent.homeY - jobB.y);
            return distA - distB;
        });
        let tries = 0;
        for (let job of jobs) {
            if (tries > 5) break;
            if (job.tile.workers < job.tile.maxWorkers) {
                let path = findPath(agent.homeX, agent.homeY, job.x, job.y);
                if (path) {
                    bestJob = job;
                    bestPath = path;
                    break;
                }
                tries++;
            }
        }
        if (bestJob) {
            agent.job = {x: bestJob.x, y: bestJob.y};
            agent.path = bestPath;
            agent.pathIndex = 0;
            bestJob.tile.workers++;
        }
    });
    state.employedCount = state.agents.filter(a => a.job).length;
    checkObjectiveCompletion();
}
function assignJobToAgent(agent) {
    let bestJob = null;
    let bestPath = null;
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            const tile = state.grid[y][x];
            if (tile.maxWorkers > 0 && tile.workers < tile.maxWorkers) {
                const dist = Math.abs(agent.homeX - x) + Math.abs(agent.homeY - y);
                if (!bestJob || dist < bestJob.dist) {
                    const path = findPath(agent.homeX, agent.homeY, x, y);
                    if (path) {
                        bestJob = {x, y, dist};
                        bestPath = path;
                    }
                }
            }
        }
    }
    if (bestJob) {
        agent.job = {x: bestJob.x, y: bestJob.y};
        agent.path = bestPath;
        agent.pathIndex = 0;
        state.grid[bestJob.y][bestJob.x].workers++;
    }
}
function countEmployed() {
    state.employedCount = state.agents.filter(a => a.job !== null).length;
}
function spawnAgents() {
    if (state.agents.length < state.population) {
        let houses = [];
        for (let y=0; y < WORLD_SIZE; y++) {
            for (let x = 0; x < WORLD_SIZE; x++) {
                if (state.grid[y][x].type.startsWith('house')) houses.push({x,y});
            }
        }
        if (houses.length > 0) {
            let home = houses[Math.floor(Math.random() * houses.length)];
            let newAgent = {
                id: Math.random(),
                homeX: home.x,
                homeY: home.y,
                x: home.x,
                y: home.y,
                job: null,
                path: [],
                pathIndex: 0,
                animationSeed: Math.random() * Math.PI * 2
            };
            state.agents.push(newAgent);
            recalculateJobs();
            spawnPersonAnimation(home.x, home.y, 2);
        }
    }
}
function startGameLoop() {
    setInterval(() => {
        if (state.isPaused) return;
        const previousDay = state.day;
        updateTimeAndWeather(TICK_RATE);
        const newDayStarted = state.day !== previousDay;
        if (state.population < state.populationCap) {
            state.population++;
            spawnAgents();
            updateUI();
        }
        let dailyIncome = 0;
        let dailyWood = 0;
        let dailyStone = 0;
        for (let y = 0; y < WORLD_SIZE; y++) {
            for (let x = 0; x < WORLD_SIZE; x++) {
                let tile = state.grid[y][x];
                if (tile.workers > 0) {
                    let b = BUILDINGS[tile.type];
                    if (b.incomePerWorker) {
                        const inc = (tile.workers * b.incomePerWorker);
                        dailyIncome += inc;
                        spawnFloatingText(x, y, `+$${Math.floor(inc)}`, '#2ecc71');
                    }
                    if (b.woodPerWorker) {
                        const w = (tile.workers * b.woodPerWorker);
                        dailyWood += w;
                    }
                    if (b.stonePerWorker) {
                        const s = (tile.workers * b.stonePerWorker);
                        dailyStone += s;
                    }
                }
            }
        }
        state.money += Math.floor(dailyIncome);
        state.wood += Math.floor(dailyWood);
        state.stone += Math.floor(dailyStone);
        updateUI();
        checkObjectiveCompletion();
        if (newDayStarted && state.day % 10 === 0) showMessage(`Day ${state.day}: Income Generated`);
    }, TICK_RATE)
}
function renderLoop(timestamp) {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const viewW = canvas.width / camera.zoom;
    const viewH = canvas.height / camera.zoom;
    const viewX = camera.x - viewW / 2;
    const viewY = camera.y - viewH / 2;

    const startColumn = Math.floor(Math.max(0, viewX / TILE_SIZE));
    const endColumn = Math.floor(Math.min(WORLD_SIZE, (viewX + viewW) / TILE_SIZE + 1));
    const startRow = Math.floor(Math.max(0, viewY / TILE_SIZE));
    const endRow = Math.floor(Math.min(WORLD_SIZE, (viewY + viewH) / TILE_SIZE + 1));
    const delta = lastFrameTime ? (timestamp - lastFrameTime) : 16;
    lastFrameTime = timestamp;
    if (!state.isPaused) {
        updateWeatherParticles(delta);
    } else {
        delta = 0;
    }
    ctx.fillStyle = '#282626';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ambientLight = getAmbientLightLevel();
    currentAmbientLight = ambientLight;
    nightLightingActive = isNightTime();
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (let y = startRow; y < endRow; y++) {
        for (let x = startColumn; x < endColumn; x++) {
            drawTile(state.grid[y][x]);
        }
    }
    if (!state.isPaused) updateAndRenderPersonAnimations(timestamp);
    if (input.hoverX >= 0 && input.hoverX < WORLD_SIZE && input.hoverY >= 0 && input.hoverY < WORLD_SIZE) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(input.hoverX * TILE_SIZE, input.hoverY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    drawAgents(timestamp, delta);
    ctx.restore();
    updateAndRenderFloatingTexts(timestamp);
    drawLightingOverlay(ambientLight);
    drawWeatherLayer();
    if (state.isPaused) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 36px Calibri'; // yes calibri is my favourite font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }
    document.getElementById('debug-info').innerText = `Pos: ${Math.floor(camera.x)},${Math.floor(camera.y)} | Zoom: ${camera.zoom.toFixed(2)}`;
    requestAnimationFrame(renderLoop);
}
function updateTimeAndWeather(deltaMs) {
    const previousTime = state.timeOfDay;
    state.timeOfDay = (state.timeOfDay + (deltaMs / DAY_LENGTH_MS)) % 1;
    if (previousTime > state.timeOfDay) {
        state.day++;
    }
    if (!state.weatherEnabled) {
        state.weather.type = 'clear';
        state.weather.intensity = 0;
        state.weather.particles = [];
        const timeLabel = document.getElementById('stat-time');
        if (timeLabel) timeLabel.innerText = formatTimeOfDay(state.timeOfDay);
        return;
    }
    const now = performance.now();
    if (now >= state.weather.nextChange) {
        const next = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
        state.weather.type = next.type;
        state.weather.intensity = next.type === 'clear' ? 0 : 0.4 + Math.random() * 0.6;
        state.weather.nextChange = now + next.minDuration + Math.random() * (next.maxDuration - next.minDuration);
        state.weather.particles = [];
    }
    const timeLabel = document.getElementById('stat-time');
    if (timeLabel) timeLabel.innerText = formatTimeOfDay(state.timeOfDay);
}
function updateWeatherParticles(deltaMs) {
    if (!canvas) return;
    const effectiveIntensity = getEffectiveWeatherIntensity();
    if (effectiveIntensity <= 0 || state.weather.type === 'clear') {
        state.weather.particles = [];
        return;
    }
    const particles = state.weather.particles;
    const budget = Math.floor(WEATHER_PARTICLE_BUDGET * state.weather.intensity);
    while (particles.length < budget) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: state.weather.type === 'snow' ? (Math.random() * 0.04 - 0.02) : (Math.random() * 0.18 - 0.09),
            vy: state.weather.type === 'snow' ? 0.06 + Math.random() * 0.05 : 0.25 + Math.random() * 0.2
        });
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * deltaMs;
        p.y += p.vy * deltaMs;
        if (p.y > canvas.height) {
            if (particles.length > budget) {
                particles.splice(i, 1);
            } else {
                p.y = -5;
                p.x = Math.random() * canvas.width;
            }
        }
    }
    while (particles.length > budget) particles.pop();
}
function getAmbientLightLevel() {
    const base = (() => {
        const t = state.timeOfDay;
        if (t < LIGHTING.dawnStart) return 0.2;
        if (t < LIGHTING.dayStart) return lerp(0.2, 1, (t - LIGHTING.dawnStart) / (LIGHTING.dayStart - LIGHTING.dawnStart));
        if (t < LIGHTING.duskStart) return 1;
        if (t < LIGHTING.nightStart) return lerp(1, 0.25, (t - LIGHTING.duskStart) / (LIGHTING.nightStart - LIGHTING.duskStart));
        return 0.25;
    })();
    const dimFactor = (() => {
        if (state.weather.type === 'storm') return 0.35;
        if (state.weather.type === 'rain') return 0.2;
        if (state.weather.type === 'snow') return 0.1;
        return 0;
    })();
    const effectiveIntensity = getEffectiveWeatherIntensity();
    return Math.max(0.15, base - dimFactor * effectiveIntensity);
}
function drawLightingOverlay(ambientLight) {
    const intensity = 1 - ambientLight;
    if (intensity <= 0.01) return;
    ctx.save();
    ctx.fillStyle = `rgba(13, 22, 35, ${intensity * 0.85})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}
function drawWeatherLayer() {
    if (!state.weather.particles.length) return;
    const effectiveIntensity = getEffectiveWeatherIntensity();
    if (effectiveIntensity <= 0) return;
    ctx.save();
    const type = state.weather.type;
    ctx.fillStyle = type === 'snow' ? '#ffffff' : '#9cb7ff';
    ctx.globalAlpha = type === 'snow' ? 0.7 * state.weather.intensity : 0.5 * state.weather.intensity;
    state.weather.particles.forEach(p => {
        const width = type === 'snow' ? 3 : 2;
        const height = type === 'snow' ? 3 : 6;
        ctx.fillRect(p.x, p.y, width, height);
    });
    ctx.restore();
    if (type === 'storm') {
        ctx.save();
        ctx.fillStyle = `rgba(10, 15, 25, ${0.25 * state.weather.intensity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}
function isNightTime() {
    return state.timeOfDay >= LIGHTING.nightStart || state.timeOfDay < LIGHTING.dawnStart;
}
function formatTimeOfDay(normalized) {
    const totalMinutes = Math.floor((normalized * 24 * 60) % (24 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}`;
}
function lerp(a, b, t) {
    return a + (b - a) * Math.min(1, Math.max(0, t));
}
function drawAgents(timestamp, deltaMs) {
    const moveSpeed = deltaMs ? Math.max(0.02, 0.05 * (deltaMs / 16)) : 0.05;
    state.agents.forEach(agent => {
        if (!agent.job || agent.path.length === 0) return;
        if (agent.pathIndex >= agent.path.length) {
            agent.pathIndex = 0;
            agent.x = agent.homeX;
            agent.y = agent.homeY;
        } else {
            let target = agent.path[agent.pathIndex];
            let dx = target.x - agent.x;
            let dy = target.y - agent.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < moveSpeed) {
                agent.x = target.x;
                agent.y = target.y;
                agent.pathIndex++;
            } else if (dist > 0) {
                agent.x += (dx / dist) * moveSpeed;
                agent.y += (dy / dist) * moveSpeed;
            }
        }
        
        const screenX = agent.x * TILE_SIZE + TILE_SIZE / 2;
        const screenY = agent.y * TILE_SIZE + TILE_SIZE / 2;
        const bob = Math.sin(((timestamp ?? performance.now()) / 300) + agent.animationSeed) * TILE_SIZE * 0.06;
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + bob, TILE_SIZE * 0.18, TILE_SIZE * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f5d76e';
        ctx.beginPath();
        ctx.arc(screenX, screenY + bob - TILE_SIZE * 0.18, TILE_SIZE * 0.12, 0, Math.PI * 2);
        ctx.fill();
    });
}
function drawMinimap() {
    minimapCanvas.width = WORLD_SIZE;
    minimapCanvas.height = WORLD_SIZE;
    const mCtx = minimapCtx;
    const id = mCtx.createImageData(WORLD_SIZE, WORLD_SIZE);
    const d = id.data;
    for (let i = 0; i < state.grid.length * WORLD_SIZE; i++) {
        const y = Math.floor(i / WORLD_SIZE);
        const x = i % WORLD_SIZE;
        const tile = state.grid[y][x];
        let r = 0, g = 0, b = 0;
        if (tile.type === 'grass') {r = 46; g = 204; b = 113;}
        else if (tile.type === 'water') { r= 52; g = 152; b = 219;}
        else if (tile.type === 'forest') {r = 39; g = 174; b = 96;}
        else if (tile.type === 'road') {r = 100; g = 100; b = 100;}
        else if (tile.type.startsWith('house')) {r = 231; g = 76; b = 60;}
        else {r = 200; g = 200; b = 200;}

        d[i*4] = r;
        d[i*4+1] = g;
        d[i*4+2] = b;
        d[i*4+3] = 255;
    }
    mCtx.putImageData(id, 0, 0);
}
function handleMapClick() {
    const x = input.hoverX;
    const y = input.hoverY;
    if (x < 0 || x >= WORLD_SIZE || y < 0 || y >= WORLD_SIZE) return;
    const tileData = state.grid[y][x];
    const tool = BUILDINGS[state.selectedTool];
    if (state.selectedTool === 'select') {
        showSelectionTooltip(tileData, input.mouseX, input.mouseY);
        showMessage(`Inspect: ${tileData.type.toUpperCase()} at ${x},${y} (Workers: ${tileData.workers}/${tileData.maxWorkers})`);
        return;
    }
    hideSelectionTooltip();
    
    if (state.selectedTool === 'bulldoze') {
        if (tileData.type === 'grass' || tileData.type === 'water') return;
        if (state.money >= tool.cost) {
            state.money -= tool.cost;
            spawnFloatingText(x, y, `-$${tool.cost}`, '#e74c3c');
            if (BUILDINGS[tileData.type].popCap) {
                state.populationCap -= BUILDINGS[tileData.type].popCap;
                state.agents = state.agents.filter(a => !(a.homeX === x && a.homeY === y));
            }
            tileData.type = 'grass';
            tileData.workers = 0;
            tileData.maxWorkers = 0;
            updateUI();
            drawMinimap();
            recalculateJobs();
        }
        return;
    }
    if (tileData.type !== 'grass') {
        showMessage("Cannot build here!");
        return;
    }
    const hasMoney = state.money >= tool.cost;
    const hasWood = state.wood >= (tool.wood || 0);
    const hasStone = state.stone >= (tool.stone || 0);
    if (hasMoney && hasWood && hasStone) {
        state.money -= tool.cost;
        state.wood -= (tool.wood || 0);
        state.stone -= (tool.stone || 0);
        spawnFloatingText(x, y, `-$${tool.cost}`, '#e74c3c');
        tileData.type = tool.type;
        if (tool.popCap) {
            state.populationCap += tool.popCap;
            spawnPersonAnimation(x, y, Math.min(3, Math.max(1, Math.ceil(tool.popCap / 5))));
        } else if (tool.jobs) {
            spawnPersonAnimation(x, y, 1);
        }
        if (tool.jobs) {
            tileData.maxWorkers = tool.jobs;
            tileData.workers = 0;
        }
        recordBuildForObjectives(tool.type);
        updateUI();
        drawMinimap();
        recalculateJobs();
        triggerTutorialEvent(`build:${tool.type}`);
    } else {
        showMessage("Not enough resources");
    }
}
function showSelectionTooltip(tile, screenX, screenY) {
    const tooltip = document.getElementById('tile-tooltip');
    const container = document.getElementById('game-container');
    if (!tooltip || !container) return;
    const building = BUILDINGS[tile.type];
    if (!building) {
        hideSelectionTooltip();
        return;
    }

    const lines = [];
    if (building) {
        lines.push(`<strong>${building.name}</strong>`);
        lines.push(`<div>Type: ${building.type}</div>`);
        if (building.populationCap) lines.push(`<div>Population Cap: ${building.popCap}</div>`);
        if (building.jobs) lines.push(`<div>Jobs: ${tile.workers}/${building.jobs}</div>`);
        if (building.incomePerWorker) lines.push(`<div>Income/Worker: $${building.incomePerWorker}</div>`);
        if (building.woodPerWorker) lines.push(`<div>Wood/Worker: ${building.woodPerWorker}</div>`);
        if (building.stonePerWorker) lines.push(`<div>Stone/Worker: ${building.stonePerWorker}</div>`);
        const upgrades = getUpgradeOptions(tile.type);
        if (upgrades.length) {
            lines.push(`<div><strong>Upgrades:</strong></div>`);
            upgrades.forEach(u => lines.push(`<div>${u}</div>`));
        }
    } else {
        const terrainLabel = getTerrainLabel(tile.type);
        lines.push(`<strong>${terrainLabel}</strong>`);
        lines.push(`<div>Terrain: ${terrainLabel}</div>`);
        lines.push(`<div>Buildable: ${isBuildableTerrain(tile.type) ? 'Yes' : 'No'}</div>`);
    }
    
    tooltip.innerHTML = lines.join('');
    tooltip.classList.add('visible');
    const rect = container.getBoundingClientRect();
    let x = screenX - rect.left + 12;
    let y = screenY - rect.top + 12;
    const bounds = tooltip.getBoundingClientRect();
    const maxX = rect.width - bounds.width - 8;
    const maxY = rect.height - bounds.height - 8;
    x = Math.max(8, Math.min(x, maxX));
    y = Math.max(8, Math.min(y, maxY));
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}
function getTerrainLabel(type) {
    if (type === 'grass') return 'Grass';
    if (type === 'forest') return 'Forest';
    if (type === 'water') return 'Water';
    if (type === 'stone') return 'Stone';
    return type.charAt(0).toUpperCase() + type.slice(1);
}
function isBuildableTerrain(type) {
    return type !== 'water';
}
function getUpgradeOptions(tileType) {
    if (tileType === 'house1') {
        return [
            formatUpgrade('house2'),
            formatUpgradeLine('house3')
        ];
    }
    if (tileType === 'house2') {
        return [formatUpgradeLine('house3')];
    }
    return [];
}
function formatUpgradeLine(type) {
    const b = BUILDINGS[type];
    if (!b) return '';
    const costParts = [];
    if (b.cost) costParts.push(`$${b.cost}`);
    if (b.wood) costParts.push(`${b.wood}W`);
    if (b.stone) costParts.push(`${b.stone}S`);
    return `${b.name} — ${costParts.join(', ') || 'Free'}`;
}
function hideSelectionTooltip() {
    const tooltip = document.getElementById('tile-tooltip');
    if (!tooltip) return;
    tooltip.classList.remove('visible');
    tooltip.innerHTML = '';
}
function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    state.isPaused = true;
    updatePauseButton();
    modal.classList.remove('hidden');
}
function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}
function togglePause() {
    state.isPaused = !state.isPaused;
    updatePauseButton();
}
function updatePauseButton() {
    const button = document.getElementById('pause-toggle-button');
    if (button) button.innerText = state.isPaused ? 'Resume' : 'Pause';
}
function spawnPersonAnimation(tileX, tileY, count = 1) {
    const now = performance.now();
    for (let i = 0; i < count; i++) {
        peopleAnimations.push({
            x: tileX * TILE_SIZE + TILE_SIZE / 2,
            y: tileY * TILE_SIZE + TILE_SIZE / 2,
            start: now + i * 80,
            duration: PERSON_ANIMATION_DURATION,
            radius: TILE_SIZE * (0.15 + Math.random() * 0.08),
            lineWidth: 2 + Math.random() * 2,
            driftX: (Math.random() - 0.5) * TILE_SIZE * 0.4,
            driftY: -TILE_SIZE * (0.3 + Math.random() * 0.3)
        });
    }
}
function updateAndRenderPersonAnimations(timestamp) {
    if (!peopleAnimations.length) return;
    const now = timestamp ?? performance.now();
    const ease = t => t * t * (3 - 2 * t);
    const active = [];
    for (const anim of peopleAnimations) {
        const progress = (now - anim.start) / anim.duration;
        if (progress <= 0) {
            active.push(anim);
            continue;
        }
        if (progress >= 1) continue;
        const eased = ease(progress);
        const px = anim.x + anim.driftX * eased;
        const py = anim.y + anim.driftY * eased;
        const pulse = anim.radius * (1 + 0.2 * Math.sin(eased * Math.PI));
        const alpha = (1 - eased) * 0.85;
        ctx.beginPath();
        ctx.arc(px, py, pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(241, 196, 15, ${alpha * 0.3})`;
        ctx.fill();
        ctx.lineWidth = anim.lineWidth;
        ctx.strokeStyle = `rgba(241, 196, 15, ${alpha})`;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, pulse * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(241, 196, 15, ${alpha * 0.6})`;
        ctx.fill();
        active.push(anim);
    }
    peopleAnimations = active;
}
function spawnFloatingText(tileX, tileY, text, color) {
    floatingTexts.push({
        x: tileX * TILE_SIZE + TILE_SIZE / 2,
        y: tileY * TILE_SIZE,
        text: text,
        color: color,
        start: performance.now(),
        duration: 2000,
        vy: -0.04
    });
}
function updateAndRenderFloatingTexts(timestamp) {
    const now = timestamp ?? performance.now();
    const active = [];
    ctx.font = 'bold 20px Calibri';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const txt of floatingTexts) {
        const elapsed = now - txt.start;
        if (elapsed < txt.duration) {
            const progress = elapsed / txt.duration;
            const yOffset = txt.vy * elapsed;
            const alpha = 1 - Math.pow(progress, 3);
            ctx.save();
            ctx.fillStyle = txt.color;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 2;
            ctx.fillText(txt.text, txt.x, txt.y + yOffset);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeText(txt.text, txt.x, txt.y + yOffset);
            ctx.restore();
            active.push(txt);
        }
    }
    floatingTexts = active;
}
function drawPlacementPreview() {
    if (state.selectedTool === 'select' || input.hoverX < 0 || input.hoverY < 0) return;
    const x = input.hoverX;
    const y = input.hoverY;
    if (x >= WORLD_SIZE || y >= WORLD_SIZE || x < 0 || y < 0) return;
    const tileData = state.grid[y][x];
    const tool = BUILDINGS[state.selectedTool];
    let isValid = false;
    let color = 'rgba(231, 76, 60, 0.5)';
    if (state.selectedTool === 'bulldoze') {
        if (tileData.type !== 'grass' && tileData.type !== 'water') {
            isValid = true;
            color = 'rgba(231, 76, 60, 0.6)';
        }
    } else if (tool) {
        const isWater = tileData.type === 'water';
        const isOccupied = tileData.type !== 'grass';
        let isUpgrade = false;
        if ((tileData.type === 'house1' && tool.type === 'house2') || (tileData.type === 'house1' && tool.type === 'house3') || (tileData.type === 'house2' && tool.type === 'house3')) {
            isUpgrade = true;
        }
        if (!isWater && (!isOccupied || isUpgrade)) {
            isValid = true;
            color = 'rgba(46, 204, 113, 0.5)';
        }
    }
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = isValid ? '#2ecc71' : '#e74c3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.restore();
}
function updateUI() {
    document.getElementById('stat-money').innerText = `$${state.money}`;
    document.getElementById('stat-wood').innerText = state.wood;
    document.getElementById('stat-stone').innerText = state.stone;
    document.getElementById('stat-population').innerText = state.population;
    document.getElementById('stat-population-cap').innerText = state.populationCap;
    document.getElementById('stat-employed').innerText = `${state.employedCount}`;
    document.getElementById('stat-day').innerText = state.day;
    const timeLabel = document.getElementById('stat-time');
    if (timeLabel) timeLabel.innerText = formatTimeOfDay(state.timeOfDay);
    updateObjectiveUI();
}
function recordBuildForObjectives(buildType) {
    if (!state.objectives || !buildType) return;
    if (!state.objectives.progress.build[buildType]) {
        state.objectives.progress.build[buildType] = 0;
    }
    state.objectives.progress.build[buildType]++;
    checkObjectiveCompletion();
}
function getCurrentObjective() {
    return state.objectives ? (OBJECTIVES[state.objectives.activeIndex] || null) : null;
}
function isObjectiveComplete(objective) {
    if (!objective || !objective.requirements) return true;
    const req = objective.requirements;
    if (req.build) {
        for (const [type, count] of Object.entries(req.build)) {
            if ((state.objectives.progress.build[type] || 0) < count) return false;
        }
    }
    if (req.population !== undefined && state.population < req.population) return false;
    if (req.employed !== undefined && state.employedCount < req.employed) return false;
    if (req.money !== undefined && state.money < req.money) return false;
    return true;
}
function applyObjectiveReward(reward = {}) {
    const summary = [];
    if (reward.money) {
        state.money += reward.money;
        summary.push(`+$${reward.money}`);
    }
    if (reward.wood) {
        state.wood += reward.wood;
        summary.push(`+${reward.wood} Wood`); 
    }
    if (reward.stone) {
        state.stone += reward.stone;
        summary.push(`+${reward.stone} Stone`);
    }
    return summary.join(', ');
}
function getObjectiveProgressLines(objective) {
    const lines = [];
    if (objective.requirements?.build) {
        for (const [type, required] of Object.entries(objective.requirements.build)) {
            const built = state.objectives.progress.build[type] || 0;
            const name = BUILDINGS[type]?.name || type;
            lines.push(`${name}: ${Math.min(built, required)}/${required}`);
        }
    }
    if (objective.requirements?.population !== undefined) {
        lines.push(`Population: ${Math.min(state.population, objective.requirements.population)}/${objective.requirements.population}`);
    }
    if (objective.requirements?.employed !== undefined) {
        lines.push(`Employed: ${Math.min(state.employedCount, objective.requirements.employed)}/${objective.requirements.employed}`);
    }
    if (objective.requirements?.money !== undefined) {
        lines.push(`Money: $${Math.min(state.money, objective.requirements.money)}/${objective.requirements.money}`);
    }
    return lines;
}
function checkObjectiveCompletion() {
    const completedMessages = [];
    let objective = getCurrentObjective();
    while (objective && isObjectiveComplete(objective)) {
        const id = objective.id;
        const description = objective.description;
        if (!state.objectives.completed.includes(id)) {
            state.objectives.completed.push(id);
        }
        const rewardSummary = applyObjectiveReward(objective.reward || {});
        state.objectives.activeIndex++;
        completedMessages.push(
            rewardSummary ? `Objective complete: ${description} (Reward ${rewardSummary})`: `Objective complete: ${description}`
        );
        objective = getCurrentObjective();
    }
    if (completedMessages.length > 0) {
        updateUI();
        showMessage(completedMessages[completedMessages.length - 1]);
    } else {
        updateObjectiveUI();
    }
}
function updateObjectiveUI() {
    const panel = document.getElementById('objective-panel');
    if (!panel) return;
    const descriptionElement = document.getElementById('objective-description');
    const progressElement = document.getElementById('objective-progress');
    const current = getCurrentObjective();
    if (!current) {
        panel.classList.add('objective-complete');
        if (descriptionElement) descriptionElement.innerText = 'All objectives complete! Keep building your city.';
        if (progressElement) progressElement.innerHTML = '';
        return;
    }
    panel.classList.remove('objective-complete');
    if (descriptionElement) descriptionElement.innerText = current.description;
    if (progressElement) {
        const lines = getObjectiveProgressLines(current);
        progressElement.innerHTML = lines.length ? lines.map(line => `<div>${line}</div>`).join('') : '<div>Complete the task to earn a reward</div>';
    }
}
function rebuildObjectiveBuildProgress() {
    if (!state.objectives) return;
    const buildProgress = {};
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            const type = state.grid[y][x].type;
            if (BUILDINGS[type] && type !== 'select' && type !== 'bulldoze') {
                buildProgress[type] = (buildProgress[type] || 0) + 1;
            }
        }
    }
    state.objectives.progress.build = buildProgress;
}
function showMessage(message) {
    const log = document.getElementById('message-log');
    log.innerText = message;
    log.style.opacity = 1;
    if (window.messageTimeout) clearTimeout(window.messageTimeout);
    window.messageTimeout = setTimeout(() => {
        log.style.opacity = 0;
    }, 2500);
}
function startTutorial() {
    if (!tutorial.active) return;
    tutorial.stepIndex = 0;
    showTutorialStep();
}
function showTutorialStep() {
    if (!tutorial.active) return;
    const step = tutorialSteps[tutorial.stepIndex];
    if (!step) return;
    if (tutorialTimeout) {
        clearTimeout(tutorialTimeout);
        tutorialTimeout = null;
    }
    showMessage(step.text);
    if (step.autoAdvance) {
        tutorialTimeout = setTimeout(() => {
            tutorialTimeout = null;
            advanceTutorial();
        }, step.autoAdvance);
    }
}
function advanceTutorial() {
    if (!tutorial.active) return;
    tutorial.stepIndex++;
    if (tutorial.stepIndex >= tutorialSteps.length) {
        tutorial.active = false;
        showMessage("Tutorial complete! Keep building your city.");
        return;
    }
    showTutorialStep();
}
function triggerTutorialEvent(eventId) {
    if (!tutorial.active) return;
    const step = tutorialSteps[tutorial.stepIndex];
    if (!step || !step.event) return;
    if (step.event === eventId) {
        advanceTutorial();
    }
}
function startGame() {
    if (hasStarted) return;
    hasStarted = true;
    init();
}
window.addEventListener('load', () => {
    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('start-game-button');
    if (startButton && startScreen) {
        startButton.addEventListener('click', () => {
            startScreen.classList.add('hidden');
            startGame();
        });
    } else {
        startGame();
    }
})