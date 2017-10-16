const config = require('../config');
const io = require('socket.io-client');
const R = require('ramda');
const CCC = require('../utils/cryptocompare');
const { Observable, Subject } = require('rxjs');

const API_URL = config.CRYPTOCOMPARE_URL;
const STREAMER_URL = config.STREAMER_URL;
const ANCHOR_COINS = config.ANCHOR_COINS;

class CryptoCompare {
    get streams() { return this._streams; }

    constructor(opts) {
        Object.assign(this, opts);

        // External properties
        this.coins = this.coins || [];

        // Internal props (cryptocompare-specific)
        this._observers = {};
        this._streams = {};

        this._checkSafety();
        this._initConnections();

        // FOR TESTING:
        if (this.coins.length === 0) {
            this.addCoins(['BTC', 'ETH', 'ZEC']);
        }
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
        const anchorCurrency = ANCHOR_COINS.includes(coin) ? 'USD' : 'BTC';
        const subscriptionID = `5~CCCAGG~${coin}~${anchorCurrency}`;

        return subscriptionID;
    }

    _setupObservable(coin) {
        const source = Observable.create((observer) => {
            this._observers[coin] = observer;
        });

        if (this.hot) {
            const subject = new Subject();
            source.subscribe(subject);
            this.streams[coin] = new Observable((observer) => subject.subscribe(observer));
        } else {
            this.streams[coin] = source;
        }

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
        const { FROMSYMBOL: coin, TYPE } = messageData;

        if (TYPE !== '5') {
            // This is not a price update
            return;
        }

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