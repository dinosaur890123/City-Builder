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
function findPath(startX, startY, endX, endY) {
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

    while (queue.length > 0) {
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
            if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
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
    for (let d of dirs) {
        let nx = cx + d[0];
        let ny = cy + d[1];
        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
            if (state.grid[ny][nx].type === 'road') {
                roads.push({x: nx, y: ny});
            }
        }
    }
    return roads;
}
function recalculateJobs() {
    for (let row of state.grid) {
        for (let tile of row) {
            if (tile.maxWorkers > 0) tile.workers = 0;
        }
    }
    state.agents.forEach(a => {
        a.job = null;
        a.path = [];
    });
    state.agents.forEach(agent => {
        assignJobToAgent(agent);
    });
    countEmployed();
}
function assignJobToAgent() {
    let bestDist = 9999;
    let bestJob = null;
    let bestPath = null;
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            let tile = state.grid[y][x];
            if (tile.maxWorkers > 0 && tile.workers < tile.maxWorkers) {
                let dist = Math.abs(agent.homeX - x) + Math.abs(agent.homeY - y);
                if (dist < bestDist) {
                    let path = findPath(agent.homeX, agent.homeY, x, y);
                    if (path) {
                        bestDist = dist;
                        bestJob = {x, y};
                        bestPath = path;
                    }
                }
            }
        }
    }
    if (bestJob) {
        agent.job = bestJob;
        agent.path = bestPath;
        state.grid[bestJob.y][bestJob.x].workers++;
    }
}
function countEmployed() {
    state.employedCount = state.agents.filter(a => a.job !== null).length;
}
function spawnAgent() {
    let currentAgents = state.agents.length;
    if (currentAgents < state.population) {
        let houses = [];
        for (let y=0; y < GRID_HEIGHT; y++) {
            for (let x=0; x<GRID_WIDTH; x++) {
                let t = state.grid[y][x];
                if (t.type.startsWith('house')) houses.push({x,y});
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
                progress: 0,
                state: 'idle'
            };
            state.agents.push(newAgent);
            assignJobToAgent(newAgent);
        }
    }
}
function startGameLoop() {
    setInterval(() => {
        state.day++;
        if (state.population < state.populationCap) {
            state.population++;
            spawnAgents();
            updateUI();
        }
        let dailyIncome = 0;
        let dailyWood = 0;
        let dailyStone = 0;
        let houses = 0;
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                let tile = state.grid[y][x];
                if (tile.workers > 0) {
                    let b = BUILDINGS[tile.type];
                    if (b.incomePerWorker) dailyIncome += (tile.workers * b.incomePerWorker);
                    if (b.woodPerWorker) dailyWood += (tile.workers * b.woodPerWorker);
                    if (b.stonePerWorker) dailyStone += (tile.workers * b.stonePerWorker);
                }
            }
        }
        state.money += Math.floor(dailyIncome);
        state.wood += Math.floor(dailyWood);
        state.stone += Math.floor(dailyStone);
        updateUI();
        if (state.day % 10 === 0) showMessage(`Day ${state.day}: Income Generated`);
    }, TICK_RATE)
}
function renderLoop() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const speed = 0.05;
    state.agents.forEach(agent => {
        if (!agent.job || agent.path.length === 0) {
            drawAgent(agent.homeX, agent.homeY, 'red');
            return;
        }
        let targetX, targetY;
        if (agent.pathIndex >= agent.path.length) {
            agent.pathIndex = 0;
            agent.x = agent.homeX;
            agent.y = agent.homeY;
        }
        let targetNode = agent.path[agent.pathIndex];
        let dx = targetNode.x - agent.x;
        let dy = targetNode.y - agent.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < speed) {
            agent.x = targetNode.x;
            agent.y = targetNode.y;
            agent.pathIndex++;
        } else {
            agent.x += (dx / dist) * speed;
            agent.y += (dy / dist) * speed;
        }
        drawAgent(agent.x, agent.y, 'yellow');
    });
    requestAnimationFrame(renderLoop);
}
function drawAgent(gridX, gridY, color) {
    const px = gridX * (TILE_SIZE + TILE_GAP) + (TILE_SIZE / 2);
    const py = gridY * (TILE_SIZE + TILE_GAP) + (TILE_SIZE / 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();
}
function updateUI() {
    document.getElementById('stat-money').innerText = `$${state.money}`;
    document.getElementById('stat-wood').innerText = state.wood;
    document.getElementById('stat-stone').innerText = state.stone;
    document.getElementById('stat-population').innerText = state.population;
    document.getElementById('stat-population-cap').innerText = state.populationCap;
    document.getElementById('stat-employed').innerText = `${state.employedCount}`;
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