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
            tile.tradeCooldown = Math.max(0, tile);
        }
    }
}