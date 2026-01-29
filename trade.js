const TRADE_SETTINGS = {
    producerTypes: ['industry', 'quarry', 'factory'],
    consumerTypes: ['commercial'],
    maxGoods: 5,
    maxStock: 5,
    stockBonusIncome: 4,
    producerCooldownTicks: 2,
    cartSpeedTilesPerMs: 0.0025,
    maxCarts: 25
};
function initTradeSystem() {
    if (!state.trade) state.trade = {carts: [], tick: 0};
}
function isProducer(tile) {
    return TRADE_SETTINGS.producerTypes.includes(tile.type);
}
function isConsumer(tile) {
    return TRADE_SETTINGS.consumerTypes.includes(tile.type);
}
function tradeTick() {
    initTradeSystem();
    state.trade.tick = (state.trade.tick || 0) + 1;
    let bonusIncome = 0;
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            const tile = state.grid[y][x];
            tile.tradeCooldown = Math.max(0, tile.tradeCooldown || 0);
            if (isProducer(tile) && tile.workers > 0) {
                tile.goods = Math.min(TRADE_SETTINGS.maxGoods, (tile.goods || 0) + 1);
            }
            if (isConsumer(tile) && tile.workers > 0 && (tile.stock || 0) > 0) {
                bonusIncome += TRADE_SETTINGS.stockBonusIncome;
                if (state.trade.tick % 2 === 0) {
                    tile.stock = Math.max(0, (tile.stock || 0) - 1);
                }
            }
        }
    }
    const carts = state.trade.carts || [];
    if (carts.length >= TRADE_SETTINGS.maxCarts) return bonusIncome;
    const consumers = [];
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            const tile = state.grid[y][x];
            if (isConsumer(tile) && tile.workers > 0 && (tile.stock || 0) < TRADE_SETTINGS.maxStock) {
                consumers.push({x, y});
            }
        }
    }
    if (!consumers.length) return bonusIncome;
    for (let y = 0; y < WORLD_SIZE; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
            const tile = state.grid[y][x];
            if (!isProducer(tile) || (tile.goods || 0) <= 0) continue;
            if ((tile.tradeCooldown || 0) > 0) continue;
            consumers.sort((a,b) => {
                const dA = Math.abs(a.x - x) + Math.abs(a.y - y);
                const dB = Math.abs(b.x - x) + Math.abs(b.y - y);
                return dA - dB;
            });
            const tryCount = Math.min(6, consumers.length);
            for (let i = 0; i < tryCount; i++) {
                const c = consumers[i];
                const path = findPath(x, y, c.x, c.y);
                if (path && path.length > 0) {
                    tile.goods = Math.max(0, (tile.goods || 0) - 1);
                    tile.tradeCooldown = TRADE_SETTINGS.producerCooldownTicks;
                    carts.push({
                        path,
                        pathIndex: 0,
                        x: path[0].x,
                        y: path[0].y,
                        toX: c.x,
                        toY: c.y
                    });
                    break;
                }
            }
        }
    }
    state.trade.carts = carts;
    return bonusIncome;
}
function updateTradeCarts(deltaMs) {
    if (!state.trade?.carts?.length) return;
    const carts = state.trade.carts;
    const speed = TRADE_SETTINGS.cartSpeedTilesPerMs * (deltaMs || 16);
    const remaining = [];
    for (const cart of carts) {
        if (cart.pathIndex >= cart.path.length) {
            const target = state.grid[cart.toY]?.[cart.toX];
            if (target && isConsumer(target)) {
                target.stock = Math.min(TRADE_SETTINGS.maxStock, (target.stock || 0) + 1);
                if (typeof spawnFloatingText === 'function') {
                    spawnFloatingText(cart.toX, cart.toY, '+Stock', '#8e44ad');
                }
            }
            continue;
        }
        const target = cert.path[cart.pathIndex];
        const dx = target.x - cart.x;
        const dy = target.y - cart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < speed) {
            cart.x = target.x;
            cart.y = target.y;
            cart.pathIndex++;
        } else if (dist > 0) {
            cart.x += (dx / dist) * speed;
            cart.y += (dy / dist) * speed;
        }
        remaining.push(cart);
    }
    state.trade.carts = remaining;
}
function renderTradeCarts(ctx) {
    if (!state.trade?.carts?.length) return;
    ctx.save();
    ctx.fillStyle = '#8e44ad';
    for (const cart of state.trade.carts) {
        const px = cart.x * TILE_SIZE + TILE_SIZE * 0.35;
        const py = cart.y * TILE_SIZE + TILE_SIZE * 0.35;
        ctx.fillRect(px, py, TILE_SIZE * 0.3, TILE_SIZE * 0.3);
    }
    ctx.restore();
}
function getTradeInfoLines(tile) {
    const lines = [];
    if (isProducer(tile)) lines.push(`<div>Goods: ${tile.goods || 0}/${TRADE_SETTINGS.maxGoods}</div>`);
    if (isConsumer(tile)) lines.push(`<div>Stock: ${tile.stock || 0}/${TRADE_SETTINGS.maxStock}</div>`);
    return lines;
}