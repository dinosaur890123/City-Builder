const WORLD_SIZE = 128;
const TILE_SIZE = 40;
const TILE_GAP = 1;
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
const TERRAIN_COLORS = {
    grass: '#2ecc71',
    water: '#3498db',
    forest: '#27ae60',
    stone: '#7f8c8d'
}
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
    hoverY: -1
};
let canvas, ctx;
let minimapCanvas, minimapCtx;
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d', {alpha: false});
    minimapCanvas = document.getElementById('minimap');
    minimapCtx = minimapCanvas.getContext('2d');
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    setupInputs();
    generateWorld();
    centerCamera();
    createGrid();
    updateUI();
    drawMinimap();
    startGameLoop();
    requestAnimationFrame(renderLoop);
    showMessage("Welcome! Start by building a Road and a House.");
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
                variant: Math.random()
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
    canvas.addEventListener('mousemove', () => {
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
    if (state.grid.length > 0) return;
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
                tile.type = 'water';
                tileDiv.classList.add('water');
            }
            gridElement.appendChild(tileDiv);
            row.push(tile);
        }
        state.grid.push(row);
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
        state = savedState;
        const gridElement = document.getElementById('city-grid');
        gridElement.innerHTML = '';
        gridElement.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, ${TILE_SIZE}px)`;
        gridElement.style.gap = `${TILE_GAP}px`;
        state.grid.forEach(row => {
            row.forEach(tile => {
                const tileDiv = document.createElement('div');
                tileDiv.className = 'tile';
                if (tile.type !== 'grass') {
                    tileDiv.classList.add(tile.type);
                }
                tileDiv.dataset.x = tile.x;
                tileDiv.dataset.y = tile.y;
                tileDiv.onclick = () => handleTileClick(tile.x, tile.y);
                gridElement.appendChild(tileDiv);
            });
        });
        updateUI();
        recalculateJobs();
        showMessage("Game loaded!");
    } catch (e) {
        console.error(e);
        showMessage("Error loading save");
    }
}
function selectTool(toolName) {
    state.selectedTool = toolName;
    document.querySelectorAll('.tool-button').forEach(button => button.classList.remove('active'));
    const buttons = document.querySelectorAll('.tool-button');
    for (let button of buttons) {
        if (toolName === 'select' && button.innerText.includes('Cursor')) button.classList.add('active');
        else if (BUILDINGS[toolName] && button.innerText.includes(BUILDINGS[toolName].name)) button.classList.add('active');
        else if (toolName === 'bulldoze' && button.innerText.includes('Bulldoze')) button.classList.add('active');
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
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            if (state.grid[y][x].maxWorkers > 0) jobs.push({x,y, tile: state.grid[y][x]});
        }
    }
    state.agents.forEach(a => {
        let bestDist = 9999;
        let bestJob = null;
        let bestPath = null;
        jobs.sort((a,b) => {
            let distA = Math.abs(agent.homeX - a.x) + Math.abs(agent.homeY - a.y);
            let distB = Math.abs(agent.homeX - b.x) + Math.abs(agent.homeY - b.y);
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
            bestJob.tile.workers++;
        }
    });
    state.employedCount = state.agents.filter(a => a.job).length;
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
function spawnAgents() {
    if (state.agents.length < state.population) {
        let houses = [];
        for (let y=0; y < GRID_HEIGHT; y++) {
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
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (let y = startRow; y < endRow; y++) {
        for (let x = startColumn; x < endColumn; x++) {
            drawTile(state.grid[y][x]);
        }
    }
    if (input.hoverX >= 0 && input.hoverX < WORLD_SIZE && input.hoverY >= 0 && input.hoverY < WORLD_SIZE) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(input.hoverX * TILE_SIZE, input.hoverY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    drawAgents();
    ctx.restore();
    document.getElementById('debug-info').innerText = `Pos: ${Math.floor(camera.x)},${Math.floor(camera.y)} | Zoom: ${camera.zoom.toFixed(2)}`;
    requestAnimationFrame(renderLoop);
}
function drawAgents() {
    const speed = 0.05;
    state.agents.forEach(agent => {
        if (!agent.job || agent.path.length === 0) return;
        if (agent.pathIndex >= agent.path.length) {
            agent.pathIndex = 0;
            agent.x = agent.homeX;
            agent.y = agent.homeY;
        }
        let target = agent.path[agent.pathIndex];
        let dx = target.x - agent.x;
        let dy = target.y - agent.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < speed) {
            agent.x = target.x;
            agent.y = target.y;
            agent.pathIndex++;
        } else {
            agent.x += (dx/dist) * speed;
            agent.y += (dy/dist) * speed;
        }
        const screenX = agent.x * TILE_SIZE + TILE_SIZE / 2;
        const screenY = agent.y * TILE_SIZE + TILE_SIZE / 2;
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(screenX, screenY, TILE_SIZE / 6, 0, Math.PI * 2);
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
        showMessage(`Inspect: ${tileData.type.toUpperCase()} at ${x},${y} (Workers: ${tileData.workers}/${tileData.maxWorkers})`);
        return;
    }
    
    if (state.selectedTool === 'bulldoze') {
        if (tileData.type === 'grass' || tileData.type === 'water') return;
        if (state.money >= tool.cost) {
            state.money -= tool.cost;
            if (BUILDINGS[tileData.type].populationCap) {
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
        tileData.type = tool.type;
        if (tool.popCap) state.populationCap += tool.popCap;
        if (tool.jobs) {
            tileData.maxWorkers = tool.jobs;
            tileData.workers = 0;
        }
        updateUI();
        drawMinimap();
        recalculateJobs();
    } else {
        showMessage("Not enough resources");
    }
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