const CryptoCompare = require('../services/cryptocompare');
const R = require('ramda');
const { Observable } = require('rxjs');

function setupRoutes(router) {
    router.get('/', setupPoll);
}

function setupPoll(req, res, next) {
    const { coins, all, timeWindow } = req.query;

    if (!(coins || all || timeWindow)) {
        res.status(200).json({ message: 'Welcome to cryptostreamer! You can use the HTTP API, or connect to our socket.' });
    }

    if (!coins) {
        badRequest('must provide coins');
    }

    let pollWindow;
    if (timeWindow) {
        // convert to milliseconds
        pollWindow = parseInt(timeWindow, 10) * 1000;
        if (isNaN(pollWindow)) {
            badRequest('poll window must be a number (in ms)');
        }
    }

    // Default to a 'first' strategy - i.e. return the first update we get
    const strategy = all || pollWindow ? 'all' : 'first';

    // We want a comma separated list of tickers
    let coinList = decodeURIComponent(coins);
    if (coinList.match(/[^a-zA-Z,]/)) {
        badRequest('please provide a comma-separated list of ticker symbols');
    }
    coinList = coinList.split(',');

    // Make sure these are valid tickers
    for (let coin of coinList) {
        if (coin.length > 10) {
            badRequest('Invalid ticker symbol');
        }
    }

    const cc = new CryptoCompare({ coins: coinList });

    // Poll for tick(s)
    if (strategy === 'race') {
        getOneTick(coinList, sendUpdate);
    } else if (pollWindow) {
        getTicksForWindow(coinList, pollWindow, sendUpdate);
    } else {
        getAllTicks(coinList, sendUpdate)
    }

    function getOneTick(coins, cb) {
        // Merge the streams for each coin and take first
        const streams = coins.map((coin) => cc.streams[coin]);
        Observable.merge(streams).first().subscribe(sendUpdate, errorHandler);
    }

    function getTicksForWindow(coins, pollWindow, cb) {
        // Keep taking from each stream while the window is open
    }

    function getAllTicks(coins, pollWindow, cb) {
        // Take one from each stream
        const streams = coins.map((coin) => cc.streams[coin]);
        Observable.zip(streams).subscribe(sendUpdate, errorHandler);
    }

    function sendUpdate(tickData) {
        res.status(200).json(tickData);
    }

    function badRequest(error) {
        res.status(400).json(error);
    }

    function errorHandler(error) {
        res.status(500).json(error);
    }

}


module.exports = setupRoutes;