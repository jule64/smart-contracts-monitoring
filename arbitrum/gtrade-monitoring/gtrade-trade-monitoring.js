'use strict';
(async () => {

    /**
     * Monitors trading activity on the gtrade decentralised trading platform and prints trade events to the console.
     * See  https://gains.trade
     *
     * (*)Requires an infura api key
     */

    const { ethers } = require('ethers');
    const {GNSDiamond, GNSTradingInteractions, GNSOracle, GNSPriceAggregator} = require('./GNSContracts');
    require('dotenv').config({path: '../../.env'});

    const infuraApiKey = process.env.INFURA_API_KEY;

    if (infuraApiKey === null || infuraApiKey === undefined) {
        throw new Error('Please provide an INFURA_API_KEY in your .env file');
    }

    // const provider = new ethers.providers.InfuraProvider('arbitrum', infuraApiKey);
    // provider.pollingInterval = 5000;
    const provider = new ethers.providers.InfuraWebSocketProvider('arbitrum', infuraApiKey);

    const diamond = new ethers.Contract(GNSDiamond.address, GNSDiamond.ABI, provider);
    const trading = new ethers.Contract('', GNSTradingInteractions.ABI, provider);
    const priceAggreg = new ethers.Contract(GNSDiamond.address, GNSPriceAggregator.ABI, provider);

    let tradingPairs = await loadTradingPairsFromGtradeBackend();


    const oracles = await priceAggreg.getOracles();
    for (const i in oracles) {
        const oracle = new ethers.Contract(oracles[i], GNSOracle.ABI, provider);
        oracle.on('*', processOracleEvent);
    }

    logAppMessage('Monitoring Gtrade trading activity..');


    async function processOracleEvent(data) {
        try {
            await _processOracleEvent(data);
        } catch (e) {
            console.error(`error from infura. (trn: ${data.transactionHash})`, e);
        }
    }


    async function _processOracleEvent(data) {
        let tx = await provider.getTransaction(data.transactionHash);


            const functionSelector = tx.data.slice(0, 10).toLowerCase();

            let facetAddress = await diamond.facetAddress(functionSelector);

            let message;
            if (facetAddress === GNSTradingInteractions.address) {
                let txdata = trading.interface.parseTransaction({data: tx.data});


                if (txdata.name === 'openTrade') {
                    let trade = txdata.args._trade;
                    let user = trade.user;
                    let pairIndex = trade.pairIndex;
                    let tradingPair = tradingPairs[pairIndex].from + '/' + tradingPairs[pairIndex].to;
                    let direction = trade.long ? 'long' : 'short';
                    let price = trade.openPrice.toNumber();
                    let leverage = trade.leverage;
                    let collateral = trade.collateralAmount.toNumber();

                    message = `New trade: ${direction} ${tradingPair} @${price} Lev: ${leverage} Collateral: ${collateral} (user: ${user})`;

                } else {
                    console.log(txdata);
                    message =`New trading event: ${txdata.name}`;
                }

            } else {
                // not interested
                message = 'Received non-trading event: contract -> ' + facetAddress + '| function -> ' + functionSelector;
            }
            logAppMessage(message);
    }

    function logAppMessage(msg) {
        console.log(`[${new Date().toLocaleTimeString()}][GTrade]: ${msg}`);
    }


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


})();

