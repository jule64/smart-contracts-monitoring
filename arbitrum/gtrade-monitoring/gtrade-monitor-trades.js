'use strict';


(async () => {

    /**
     * Monitors trading activity on the Gtrade decentralized trading platform (https://gains.trade/) and logs trade details
     * to the console upon detecting new trade events. Additionally, it triggers a sound alert for specific users or trade
     * sizes when such events occur.
     *
     * ## Setup (note: requires an infura api key):
     *
     * 1. create a .env file in `smart-contracts-monitoring` root folder and add your infura api key:
     * INFURA_API_KEY=yourkey
     *
     * 2. cd into the `gtrade-monitoring` folder and run `node gtrade-monitor-trades.js` to start
     * monitoring new trading activities
     *
     * 3. The script prints alerts for specific users and trade sizes by default but you can customise those rules in the `logTrade` function
     *
     */

    const {ethers} = require('ethers');
    const {GNSDiamond, GNSTradingCallbacks} = require('./GNSContracts');
    require('dotenv').config({path: '../../.env'});
    const player = require("play-sound")();

    const INFURA_KEY = process.env.INFURA_API_KEY;
    const network = 'arbitrum-mainnet'
    const INFURA_URL = `wss://${network}.infura.io/ws/v3/${INFURA_KEY}`;

    const provider = new ethers.providers.WebSocketProvider(INFURA_URL);

    const diamond = new ethers.Contract(GNSDiamond.address, GNSTradingCallbacks.ABI, provider);

    let tradingPairs = await loadTradingPairsFromGtradeBackend();

    function logTrade(user, orderType, tradeDetailsForLogging, notional, collateral) {
        if (user === process.env.MY_ADDRESS || user === '0x2E2e95fF8042A14Fa49DEB03bdb9d9113868494E' || user === '0x1755AF9d62eF0978AC9dAc48B3EeEBB90e793b82') {
            logAppMessage(`>>>>>>>>> new ${orderType} trade for tracked user <<<<<<<<<<`);
            isDayTime() && player.play('../../sounds/460133__eschwabe3__robot-affirmative.wav');
            logAppMessage(tradeDetailsForLogging);
        } else if (collateral > 5000) {
            logAppMessage(`>>>>>>>>> new LARGE ${orderType} trade for untracked user <<<<<<<<<<`);
            isDayTime() && player.play('../../sounds/577023__nezuai__ui-sound-14.wav'); // light sound
            logAppMessage(tradeDetailsForLogging);
        } else {
            // all other trades
            // logAppMessage(`>>>>>>>>> new ${orderType} trade <<<<<<<<<<`);
            // logAppMessage(tradeDetailsForLogging);
        }
    }

    /**
     *     event MarketExecuted(
     *         ITradingStorage.Id orderId,
     *         address indexed user,
     *         uint32 indexed index,
     *         ITradingStorage.Trade t,
     *         bool open,
     *         uint256 oraclePrice,
     *         uint256 marketPrice,
     *         uint256 liqPrice,
     *         uint256 priceImpactP,
     *         int256 percentProfit, // before fees
     *         uint256 amountSentToTrader,
     *         uint256 collateralPriceUsd // 1e8
     *     );
     *
     *     struct Trade {
     *         // slot 1
     *         address user; // 160 bits
     *         uint32 index; // max: 4,294,967,295
     *         uint16 pairIndex; // max: 65,535
     *         uint24 leverage; // 1e3; max: 16,777.215
     *         bool long; // 8 bits
     *         bool isOpen; // 8 bits
     *         uint8 collateralIndex; // max: 255
     *         // slot 2
     *         TradeType tradeType; // 8 bits
     *         uint120 collateralAmount; // 1e18; max: 3.402e+38
     *         uint64 openPrice; // 1e10; max: 1.8e19
     *         uint64 tp; // 1e10; max: 1.8e19
     *         // slot 3 (192 bits left)
     *         uint64 sl; // 1e10; max: 1.8e19
     *         uint192 __placeholder;
     *     }
     *
     *
     *
     */
    diamond.on('MarketExecuted', (orderId, user, index, t, open, oraclePrice, marketPrice, liqPrice, priceImpactP, percentProfit, amountSentToTrader, collateralPriceUsd) => {

        let pairIndex = t.pairIndex;
        let tradingPair = tradingPairs[pairIndex].from + '/' + tradingPairs[pairIndex].to;
        let orderType = open ? "MARKET_OPEN" : "MARKET_CLOSE";
        let direction = t.long ? "long" : "short";
        let price = parseFloat(marketPrice.toString()) / 10 ** 10;


        let {collatAsset, collateral} = getCollateralValueUSD(t);

        let leverage = t.leverage / 10 ** 3
        let notional = leverage * collateral;

        let tradeDetailsForLogging =
                   `user:       ${user.substring(0, 8)}
                    pair:       ${tradingPair}
                    direction:  ${direction}
                    price:      ${price}
                    collateral: ${collateral.toLocaleString()} (${collatAsset === 'ETH' ? 'USD (from ETH)' : collatAsset})
                    leverage:   ${leverage}
                    NOTIONAL:   ${notional.toLocaleString()}
                    `;

        logTrade(user, orderType, tradeDetailsForLogging, notional, collateral);

    });

    /**
     * Monitors Limit, SL, TP, LIQUIDATED, etc. events
     * 
     * event LimitExecuted(
     *         ITradingStorage.Id orderId,
     *         address indexed user,
     *         uint32 indexed index,
     *         uint32 indexed limitIndex,
     *         ITradingStorage.Trade t,
     *         address triggerCaller,
     *         ITradingStorage.PendingOrderType orderType,
     *         uint256 oraclePrice,
     *         uint256 marketPrice,
     *         uint256 liqPrice,
     *         uint256 priceImpactP,
     *         int256 percentProfit,
     *         uint256 amountSentToTrader,
     *         uint256 collateralPriceUsd, // 1e8
     *         bool exactExecution
     *     );
     *
     */
    diamond.on('LimitExecuted', (orderId, user, index, limitIndex, t, triggerCaller, orderTypeIndex, ...args) => {

        let pairIndex = t.pairIndex;
        let tradingPair = tradingPairs[pairIndex].from + '/' + tradingPairs[pairIndex].to;
        let direction = t.long ? "long" : "short";

        let orderType = PendingOrderType[orderTypeIndex];
        let {collatAsset, collateral} = getCollateralValueUSD(t);
        let leverage = t.leverage / 10 ** 3
        let notional = leverage * collateral;

        let tradeDetailsForLogging =
                   `user:       ${user}
                    pair:       ${tradingPair}
                    direction:  ${direction}
                    collateral: ${collateral.toLocaleString()} (${collatAsset === 'ETH' ? 'USD (from ETH)' : collatAsset})
                    leverage:   ${leverage}
                    NOTIONAL:   ${notional.toLocaleString()}
                    `;

        logTrade(user, orderType, tradeDetailsForLogging, notional, collateral);

    });

    const PendingOrderType = [
        "MARKET_OPEN",
        "MARKET_CLOSE",
        "LIMIT_OPEN",
        "STOP_OPEN",
        "TP_CLOSE",
        "SL_CLOSE",
        "LIQ_CLOSE",
        "UPDATE_LEVERAGE",
        "MARKET_PARTIAL_OPEN",
        "MARKET_PARTIAL_CLOSE"
    ];


// Handle provider errors
    provider._websocket.on('error', (err) => {
        console.error('WebSocket Error:', err);
        provider._websocket.terminate();
    });

// Handle disconnection and attempt to reconnect
    provider._websocket.on('close', (code, reason) => {
        console.warn(`WebSocket closed: ${reason} (code: ${code})`);
        setTimeout(() => {
            console.log('Reconnecting...');
            provider._websocket.connect();
        }, 1000);
    });

    /**
     * returns an array of trading pairs info in json form. Example:
     * {
     *     from: 'BTC',
     *     to: 'USD',
     *     spreadP: '0',
     *     groupIndex: '0',
     *     feeIndex: '0'
     *   }
     */
    async function loadTradingPairsFromGtradeBackend() {

        let response = await fetch('https://backend-arbitrum.gains.trade/trading-variables');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            const data = await response.json();
            return data.pairs;
        }

    }

    function getCollateralValueUSD(trade) {
        // if collateral is DAI then collateral should be scaled to 10 ** 18
        let collatAsset = {3: 'USDC', 1: 'DAI', 2: 'ETH'}[trade.collateralIndex];
        let collateral;
        if (collatAsset === 'USDC') {
            collateral = parseFloat(trade.collateralAmount.toString()) / 10 ** 6;
        } else if (collatAsset === 'DAI') {
            collateral = parseFloat(trade.collateralAmount.toString()) / 10 ** 18;
        } else if (collatAsset === 'ETH') {
            collateral = (parseFloat(trade.collateralAmount.toString()) / 10 ** 18) * 3300;
        } else {
            console.error(`collateral index not handled. index: ${trade.collateralIndex}`);
            collateral = 0;
        }
        return { collatAsset, collateral };
    }


    function isDayTime() {
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        return currentHour >= 7 && currentHour < 22;
    }

    function logAppMessage(msg) {
        console.log(`[${new Date().toLocaleTimeString()}][Gtrade]: ${msg}`);
    }

    logAppMessage(`Monitoring trades on ${network} ..`);

})();