const CryptoCompare = require('./services/cryptocompare');
const R = require('ramda');

const setupSocket = (io) => { io.on('connection', setupConnection); };

function setupConnection(socket) {
    const cc = new CryptoCompare();
    const subscriptions = {};

    socket.on('addCoin', (coin) => {
        const isSafe = checkSafety(coin);

        if (!isSafe) {
            console.log('Bad Request');
            return;
        }

        cc.addCoin(coin);
        doSubscribe(coin);
    });

    socket.on('addCoins', (coins) => {
        const isSafe = checkBatchSafety(coin);

        if (!isSafe) {
            console.log('Bad Request');
            return;
        }

        cc.addCoins(coin);
        coins.forEach(doSubscribe);
    });

    socket.on('removeCoin', (coin) => {
        const isSafe = checkSafety(coin);

        if (!isSafe) {
            console.log('Bad Request');
            return;
        }

        cc.removeCoin(coin);
        doUnsubscribe(coin);
    });

    socket.on('removeCoins', (coins) => {
        const isSafe = checkBatchSafety(coin);

        if (!isSafe) {
            console.log('Bad Request');
            return;
        }

        cc.removeCoins(coins);
        coins.forEach(doUnsubscribe);
    });

    function doSubscribe(coin) {
        subscriptions[coin] = cc.streams[coin].subscribe((newPrice) => {
            console.log('Got update for', coin);
            socket.emit(coin, newPrice);
        });
    }

    function doUnsubscribe(coin) {
        subscriptions[coin].dispose();
    }

    function errorHandler(err) {
        console.log('Server Error:', err);
        socket.emit('error', err);
    }

    function checkSafety(coin) {
        // For safety, make sure it is a string and length less than 10 (all tickers should be shorter than 10)
        if (typeof coin !== 'string' || coin.length > 10) {
            socket.emit('badrequest', { message: 'please provide a coin ticker symbol of type string' });
            return false;
        }

        return true;
    }

    function checkBatchSafety(coins) {
        if (!Array.isArray(coins)) {
            socket.emit('badrequest', { message: 'please provide an array of coin strings' });
            return false;
        }

        return R.every(checkSafety, coins);
    }
}



module.exports = setupSocket;