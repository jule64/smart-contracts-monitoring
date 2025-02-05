# Description

A collection of scripts for monitoring smart contract activities across multiple blockchains.

## Current Scripts

| name                                                                                 | Description                                                                    | Chain    |
|--------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|----------|
| [gtrade-monitor-trades.js](arbitrum%2Fgtrade-monitoring%2Fgtrade-monitor-trades.js)  | Monitors trading activity on the gTrade decentralized trading platform.        | Arbitrum |
| [dai-savings-rate-monitor.js](ethereum%2Fmonitor-sDAI%2Fdai-savings-rate-monitor.js) | Monitors changes in DAI savings rate and play alert when a change is detected. | Ethereum |


## Screenshots

### DAI DSR monitoring:

The screenshot shows the script polling the DSR rate value every 6 hours, then a rate change is detected and gets printed 3 times (with sound if during daytime) and finally the script exits after saving the new rate to file.
<br><br>
![Screenshot 2025-01-29 at 19.52.45.jpeg](screenshots%2FScreenshot%202025-01-29%20at%2019.52.45.jpeg)
**screenshot** - DAI dsr monitoring
<br><br>


### Gtrade trade monitoring

The screenshots below show various types of trades captured by the script throughout the day (and night) across various crypto pairs. 
The script prints trades based on the size, collateral and/or watchlist rules defined in the script (see script doc for more info)


![Screenshot 2025-02-05 at 21.41.09.jpeg](screenshots%2FScreenshot%202025-02-05%20at%2021.41.09.jpeg)
**screenshot 1** - new 8.5m short BTC/USD trade from a user on the watchlist
<br><br>

![Screenshot 2025-02-05 at 21.31.16.jpeg](screenshots%2FScreenshot%202025-02-05%20at%2021.31.16.jpeg)
**screenshot 2** - a short BTC/USD trade from an untracked user with a significant notional value of 500K (see log filtering rules in script)
<br><br>

![Screenshot 2025-02-03 at 02.47.37.jpeg](screenshots%2FScreenshot%202025-02-03%20at%2002.47.37.jpeg)
**screenshot 3** - a trade liquidation event from an untracked user with a significant collateral of 5K (see log filtering rules in script)
<br><br>

![Screenshot 2025-02-02 at 12.06.45.jpeg](screenshots%2FScreenshot%202025-02-02%20at%2012.06.45.jpeg)
**screenshot 4** - a stop loss from a user on the watchlist