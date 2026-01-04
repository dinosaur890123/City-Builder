const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
const TICK_RATE = 1000;
const BUILDINGS = {
    road: {
        cost: 10,
        wood: 0,
        type: 'road',
        name: 'Road'
    },
    house1: {
        cost: 50,
        wood: 10,
        stone: 0,
        type: 'house',
        name: 'House',
        populationCap: 5
    },
    house2: {
        cost: 150,
        wood: 30,
        stone: 10,
        type: 'house2',
        name: 'House II',
        populationCap: 12
    },
    house3: {
        cost: 400,
        wood: 100,
        stone: 40,
        type: 'house3',
        name: 'House III',
        populationCap: 30
    },
    commercial: {
        cost: 100,
        wood: 20,
        type: 'commercial',
        name: 'Market',
        income: 10
    },
    industry: {
        cost: 150,
        wood: 0,
        type: 'industry',
        name: 'Lumber Mill',
        woodGen: 5
    },
    quarry: {
        cost: 200,
        wood: 20,
        stone: 0,
        type: 'quarry',
        name: 'Quarry',
        stoneGen: 3
    },
    factory: {
        cost: 400,
        wood: 50,
        stone: 20,
        type: 'factory',
        name: 'Factory',
        income: 50
    },
    park: {
        cost: 30,
        wood: 0,
        type: 'park',
        name: 'Small Park'
    },
    bulldoze: {
        cost: 5,
        wood: 0,
        type: 'bulldoze',
        name: 'Bulldozer'
    },
    select: {
        cost: 0,
        wood: 0,
        type: 'select',
        name: 'Cursor'
    }
};
let state = {
    money: 1000,
    wood: 50,
    population: 0,
    populationCap: 0,
    day: 1,
    selectedTool: 'select',
    grid: [],
    agents: [],
    employedCount: 0
};
let ctx;
function init() {
    createGrid();
    updateUI();
    startGameLoop();
    requestAnimationFrame(renderLoop);
    showMessage("Welcome! Start by building a Road and a House.");
}
function setupCanvas() {
    const canvas = document.getElementById('agent-layer');
    const totalWidth = (GRID_WIDTH * TILE_SIZE) + ((GRID_WIDTH - 1) * TILE_GAP);
    const totalHeight = (GRID_HEIGHT * TILE_SIZE) + ((GRID_HEIGHT - 1) * TILE_GAP);
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    ctx = canvas.getContext('2d');
}
function createGrid() {
    const gridElement = document.getElementById('city-grid');
    gridElement.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, ${TILE_SIZE}px)`;
    gridElement.style.gap = `${TILE_GAP}px`;
    for (let y = 0; y < GRID_HEIGHT; y++) {
        let row = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            let tile = {
                type: 'grass', 
                x, y, 
                workers: 0, 
                maxWorkers: 0
            };
            const tileDiv = document.createElement('div');
            tileDiv.classList.add('tile');
            tileDiv.dataset.x = x;
            tileDiv.dataset.y = y;
            tileDiv.onclick = () => handleTileClick(x, y);
            if (Math.random() < 0.05) {
                row[x].type = 'water';
                tileDiv.classList.add('water');
            }
            gridElement.appendChild(tileDiv);
            row.push(tile);
        }
        state.grid.push(row);
    }
}
function selectTool(toolName) {
    state.selectedTool = toolName;
    document.querySelectorAll('.tool-button').forEach(button => button.classList.remove('active'));
    const buttons = document.querySelectorAll('.tool-button');
    for (let button of buttons) {
        if (button.innerText.toLowerCase().includes(BUILDINGS[toolName].name.toLowerCase())) {
            button.classList.add('active');
        }
    }
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
            if (BUILDINGS[tileData.type] && BUILDINGS[tileData.type].populationCap) {
                state.populationCap -= BUILDINGS[tileData.type].populationCap;
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
            if (BUILDINGS[tileData.type].populationCap) {
                state.populationCap -= BUILDINGS[tileData.type].populationCap;
            }
        }
        tileData.type = tool.type;
        if (tool.type === 'house') state.populationCap += tool.populationCap;
        tileDiv.classList.add(tool.type);
        if (tool.populationCap) state.populationCap += tool.populationCap;
        if (tool.jobs) {
            tileData.maxWorkers = tool.jobs;
            tileData.workers = 0;
        }
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
function startGameLoop() {
    setInterval(() => {
        state.day++;
        let dailyIncome = 0;
        let dailyWood = 0;
        let dailyStone = 0;
        let houses = 0;
        for (let y=0; y < GRID_HEIGHT; y++) {
            for (let x=0; x < GRID_WIDTH; x++) {
                const cell = state.grid[y][x];
                if (cell.type === 'house') houses++;
                if (cell.type === 'commercial') {
                    dailyIncome += 5 + Math.floor(state.population / 2);
                }
                if (cell.type === 'industry') {
                    dailyWood += BUILDINGS.industry.woodGen;
                }
                if (cell.type === 'quarry') {
                    dailyStone += BUILDINGS.quarry.stoneGen;
                }
                if (cell.type === 'factory') {
                    dailyIncome += BUILDINGS.factory.income;
                }
            }
        }
        if (state.population < state.populationCap) {
            const growth = Math.ceil((state.populationCap - state.population) / 4);
            state.population += growth;
        } else {
            state.population = state.populationCap;
        }
        state.money += dailyIncome;
        state.wood += dailyWood;
        updateUI();
        if (state.day % 10 === 0 && state.population > 0) {
            showMessage(`Day ${state.day}: Taxes collected.`);
        }
    }, TICK_RATE)
}
function updateUI() {
    document.getElementById('stat-money').innerText = `$${state.money}`;
    document.getElementById('stat-wood').innerText = state.wood;
    document.getElementById('stat-population').innerText = state.population;
    document.getElementById('stat-population-cap').innerText = state.populationCap;
    document.getElementById('stat-day').innerText = state.day;
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
window.onload = init;