const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
const TICK_RATE = 1000;
const buildings = {
    road: {
        cost: 10,
        wood: 0,
        type: 'road',
        name: 'Road'
    },
    house: {
        cost: 50,
        wood: 10,
        type: 'house',
        name: 'House',
        popCap: 5
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
    grid: []
};

function init() {
    createGrid();
    updateUI();
    startGameLoop();
    showMessage("Welcome! Start by building a Road and a House.");
}
function createGrid() {
    const gridElement = document.getElementById('city-grid');
    gridElement.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, 40px)`;
    for (let y = 0; y < GRID_HEIGHT; y++) {
        let row = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            row.push({type: 'grass', x, y});
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
            if (tileData.type === 'house') state.popCap -= BUILDINGS.house.popCap;
            tileData.type = 'grass';
            tileDiv.className = 'tile';
            updateUI();
            showMessage("Demolished!");
        } else {
            showMessage("Not enough money")
        }
        return;
    }
    if (tileData.type !== 'grass') {
        showMessage("Space already occupied!");
        return;
    }
    if (state.money >= tool.cost && state.wood >= tool.wood) {
        state.money -= tool.cost;
        state.wood -= tool.wood;
        tileData.type = tool.type;
        if (tool.type === 'house') state.popCap += tool.popCap;
    }
}