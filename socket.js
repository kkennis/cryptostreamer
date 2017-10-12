const CryptoCompare = require('./services/cryptocompare');

function setupSocket(io) {
    io.on('connection', setupSocket);
}

function setupConnection(socket) {
    const cc = new CryptoCompare();
    const subscriptions = {};

    socket.on('addCoin', (coin) => {
        cc.addCoin(coin);
        doSubscribe(coin);
    });

    socket.on('addCoins', (coins) => {
        cc.addCoins(coin);
        coins.forEach(doSubscribe);
    });

    socket.on('removeCoin', (coin) => {
        cc.removeCoin(coin);
        doUnsubscribe(coin);
    });

    socket.on('removeCoins', (coins) => {
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
}



module.exports = setupSocket;