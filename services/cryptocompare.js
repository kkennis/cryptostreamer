const config = require('../config');
const io = require('socket.io-client');
const R = require('ramda');
const CCC = require('../utils/cryptocompare');
const { Observable } = require('rxjs');

class CryptoCompare {
    static API_URL = config.CRYPTOCOMPARE_URL;
    static STREAMER_URL = config.STREAMER_URL;
    static FIAT_COINS = config.FIAT_COINS;

    // External properties
    coins = [];
    get streams() { return this._streams; }

    // Internal props (cryptocompare-specific)
    _observers = {};
    _streams = {};

    constructor(opts) {
        Object.assign(this, opts);

        this._checkSafety();
        this._initConnections();
    }

    _checkSafety() {
        if (!Array.isArray(this.coins)) {
            throw new Error('Coins property is not an array');
        }
    }

    _addConnections(subscriptions) {
        if (!Array.isArray(subscriptions)) {
            subscriptions = [subscriptions];
        }

        this.socket.emit('SubAdd', { subs: subscriptions });
    }

    _removeConnections(subscriptions) {
        if (!Array.isArray(subscriptions)) {
            subscriptions = [subscriptions];
        }

        this.socket.emit('SubRemove', { subs: subscriptions });
    }

    _getSubscription(coin) {
        // Right now, this compares everything except BTC/ETH against BTC
        // And compares both BTC/ETH against USD
        const anchorCurrency = CryptoCompare.FIAT_COINS.includes(coin) ? 'USD' : 'BTC';
        const subscriptionID = `5~CCCAGG~${coin}~${anchorCurrency}`;

        return subscriptionID;
    }

    _setupObservable(coin) {
        this._streams[coin] = Observable.create((observer) => {
            this._observers[coin] = observer;
        });
    }

    _closeObservable(coin) {
        Reflect.deleteProperty(this._observers, coin);
    }

    _initConnections() {
        this.socket = io.connect('https://streamer.cryptocompare.com/');
        this.socket.on('m', this._handleUpdate.bind(this));

        if (this.coins.length === 0) {
            return;
        }

        this.addCoins(this.coins);
    }

    _handleUpdate(message) {
        const messageData = CCC.CURRENT.unpack(message);
        const { fromSymbol: coin } = messageData;

        // TODO: Unpack message data here

        this._observers[coin].next(messageData);
    }

    addCoin(coin) {
        const setupInbound = R.pipe(
            this._getSubscription.bind(this),
            this._addConnections.bind(this)
        );

        const setupOutbound = this._setupObservable.bind(this);

        const setConnections = R.juxt([setupInbound, setupOutbound]);
        setConnections(coin);

        return this;
    }

    addCoins(coins) {
        const setupInbound = R.pipe(
            R.map(this._getSubscription.bind(this)),
            this._addConnections.bind(this)
        );

        const setupOutbound = R.map(this._setupObservable.bind(this));

        const setConnections = R.juxt([setupInbound, setupOutbound]);
        setConnections(coins);

        return this;
    }

    removeCoin(coin) {
        const closeInbound = R.pipe(
            this._getSubscription.bind(this),
            this._removeConnections.bind(this)
        );

        const closeOutbound = this._closeObservable.bind(this);

        const destroyConnections = R.juxt([closeInbound, closeOutbound]);
        destroyConnections(coins);

        return this;
    }

    removeCoins(coins) {
        const closeInbound = R.pipe(
            R.map(this._getSubscription.bind(this)),
            this._removeConnections.bind(this)
        );

        const closeOutbound = R.map(this._closeObservable.bind(this));

        const destroyConnections = R.juxt([closeInbound, closeOutbound]);
        destroyConnections(coins);

        return this;
    }
}

module.exports = CryptoCompare;