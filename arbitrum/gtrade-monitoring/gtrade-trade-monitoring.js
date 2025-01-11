
(async () => {

    /**
     * Monitors trading activity on the gtrade decentralised trading platform and prints trade events to the console.
     * See  https://gains.trade
     *
     * (*)Requires an infura api key
     */

    const { ethers } = require('ethers');
    const {GNSDiamond, GNSTradingInteractions, GNSOracle, oracles} = require('./GNSContracts');
    require('dotenv').config();

    const infuraApiKey = process.env.INFURA_API_KEY;

    if (infuraApiKey === null || infuraApiKey === undefined) {
        throw new Error('Please provide an INFURA_API_KEY in your .env file');
    }

    const provider = new ethers.providers.InfuraProvider('arbitrum', infuraApiKey);
    provider.pollingInterval = 5000;


    const diamond = new ethers.Contract(GNSDiamond.address, GNSDiamond.ABI, provider);
    const trading = new ethers.Contract('', GNSTradingInteractions.ABI, provider);

    let tradingPairs = await loadTradingPairsFromGtradeBackend();

    for (const i in oracles) {
        const oracle = new ethers.Contract(oracles[i], GNSOracle.ABI, provider);
        oracle.on('*', processOracleEvent);
    }

    console.log(wrapMessageWithTimeStampAndAppName('Monitoring G-trade trading activity..'));


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

            if (facetAddress === GNSTradingInteractions.address) {
                let txdata = trading.interface.parseTransaction({data: tx.data});


                if (txdata.name === 'openTrade') {
                    let trade = txdata.args._trade;
                    let pairIndex = trade.pairIndex;

                    let objectToParse = {};
                    objectToParse.tradingPair = tradingPairs[pairIndex].from + '/' + tradingPairs[pairIndex].to;

                    let trnParams = Object.keys(objectToParse).filter(v => isNaN(parseInt(v))).map((name) => [name, objectToParse[name]]);

                    console.log(wrapMessageWithTimeStampAndAppName(`New trade: ${trnParams.map((arr) => arr[0] + ': ' + arr[1].toString()).join(', ')}`));
                    console.log(txdata);

                } else {

                    console.log(wrapMessageWithTimeStampAndAppName(`New trading event: ${txdata.name}`));
                    console.log(txdata);

                }

            } else {
                // not interested
                console.log(wrapMessageWithTimeStampAndAppName('Received non-trading event: contract -> ' + facetAddress + '| function -> ' + functionSelector));
            }
    }

    function wrapMessageWithTimeStampAndAppName(msg) {
        const timeStr = new Date().toLocaleTimeString();
        return `${timeStr}: G-Trade: ${msg}`;
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
        try {
            const response = await fetch('https://backend-arbitrum.gains.trade/trading-variables');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.pairs;
        } catch (error) {
            console.error('Error loading Gtrade backend info:', error);
        }
    }


})();

