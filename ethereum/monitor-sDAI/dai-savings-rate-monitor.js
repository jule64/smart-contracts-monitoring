'use strict';


require('dotenv').config({path: '../../.env'});

const {ethers} = require('ethers');
const {MCDPot} = require('./contracts');
const player = require("play-sound")();
const fs = require('fs');

async function mainLoop() {

    const infuraApiKey = process.env.INFURA_API_KEY;

    if (infuraApiKey === null || infuraApiKey === undefined) {
        throw new Error('Please provide an INFURA_API_KEY in your .env file');
    }

    const provider = new ethers.providers.InfuraWebSocketProvider('mainnet', infuraApiKey);

    const pot = new ethers.Contract(MCDPot.address, MCDPot.ABI, provider);
    let dsr = await pot.dsr(); // dsr per second
    let secondsInYear = 365 * 24 * 60 * 60;
    let dsrYear = parseFloat((((parseFloat(dsr.toString()) / 10 ** 27) ** (secondsInYear) - 1) * 100).toFixed(2));

    let lastDsr = loadLastSavedDsr();

    if (dsrYear !== lastDsr) {

        let count = 0;
        const maxCalls = 3;

        let playAlertAndExitProcess = () => {

            isDayTime() && player.play('../../sounds/460133__eschwabe3__robot-affirmative.wav');
            logAppMessage(`DSR rate has changed to ${dsrYear}% (previous rate was: ${lastDsr}%)`);

            count++;
            if (count < maxCalls) {
                setTimeout(playAlertAndExitProcess, 5000); // run again after 5 seconds
            } else {
                logAppMessage(`The process will now exit. Please restart to resume dsr rate checks (new DSR rate: ${dsrYear}%)`);
                process.exit(0);
            }
        }

        playAlertAndExitProcess();
        saveDsr(dsrYear);

    } else {
        let waitTimeSeconds = 12 * 60 * 60000; // 12 hours
        let nextCheckTime = new Date(Date.now() + waitTimeSeconds).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true}).toLowerCase();
        logAppMessage(`No change in dsr rate (current value: ${dsrYear}%).  Will check again at ${nextCheckTime}`);
        setTimeout(mainLoop, waitTimeSeconds);
    }

}

function logAppMessage(msg) {
    console.log(`[${new Date().toLocaleTimeString()}][sDAI]: ${msg}`);
}

function loadLastSavedDsr() {
    const filePath = './lastDsr';

    try {
        const data = fs.readFileSync(filePath, 'utf8').trim();

        const lastDsr = parseFloat(data);
        //console.log(`loaded dsr from file: ${lastDsr}`)

        if (isNaN(lastDsr)) {
            throw new Error(`Invalid number in file: ${data}`);
        }

        return lastDsr;
    } catch (err) {
        console.error(`Error reading or parsing file '${filePath}':`, err.message);
        throw err;
    }
}

function saveDsr(dsr) {
    const filePath = './lastDsr';
    try {
        fs.writeFileSync(filePath, dsr.toString());
    } catch (err) {
        console.error(`Error saving Dsr to file '${filePath}':`, err.message);
        throw err;
    }
}

function isDayTime() {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  return currentHour >= 7 && currentHour < 22;
}

if (require.main === module) {
    mainLoop().catch(err => {
        console.error("Unhandled error:", err.message);
        process.exit(1);
   });
} else {
    // for testing
    module.exports = {saveDsr, loadLastDsr: loadLastSavedDsr, isDayTime, mainLoop};
}

