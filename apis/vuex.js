const CryptoCompare = require('../services/cryptocompare');
const R = require('ramda');

// Takes Vue instance, store and opts object
// Options:
// updateMutationName - have cryptostreamer commit this mutation when it receives new data
// noWarnings - suppress warning message (if you later implement the update handler)
function setupStore(Vue, store, opts) {
    if (!Vue) {
        throw new Error('Please provide a Vue instance.');
    }

    if (!store) {
        throw new Error('Please provide a store');
    }

    const UPDATE_MUTATION_NAME = opts.updateMutationName || 'streamUpdate';

    if (!store.mutations[updateMutationName] && !opts.noWarnings) {
        console.warn(`Cryptostreamer commits '${UPDATE_MUTATION_NAME}' mutations when it receives data. Make sure to implement it.`);
    }

    const cc = new CryptoCompare({ hot: true });
    const subscriptions = {};

    // The cryptostreamer module is used with four mutations

    store.registerModule('cryptostreamer', {
        // Namespaced so that mutations are scoped e.g. 'store.cryptostreamer.commit'
        namespaced: true,
        state: { subscriptions },
        mutations: {
            addCoin(state, coin) {
                checkSafety(coin);

                cc.addCoin(coin);
                doSubscribe(state, coin);
            },

            addCoins(state, coins) {
                checkBatchSafety(coin);

                cc.addCoins(coin);
                coins.forEach((coin) => { doSubscribe(state, coin) });
            },

            removeCoin() {
                checkSafety(coin);

                cc.removeCoin(coin);
                doUnsubscribe(state, coin);
            },

            removeCoins() {
                checkBatchSafety(coin);

                cc.removeCoins(coins);
                coins.forEach((coin) => { doUnsubscribe(state, coin) });
            }
        }
    });


    function doSubscribe(state, coin) {
        state.subscriptions[coin] = cc.streams[coin].subscribe((tick) => {
            console.log('Got update for', coin);

            // Call the mutation with the payload { coin, tick }
            store.commit(UPDATE_MUTATION_NAME, { coin, tick });
        }, errorHandler);
    }

    function doUnsubscribe(state, coin) {
        state.subscriptions[coin].dispose();
        Vue.delete(state.subscriptions, coin);
    }

    function errorHandler(err) {
        console.log('Server Error:', err);
        throw err;
    }

    function checkSafety(coin) {
        // For safety, make sure it is a string and length less than 10 (all tickers should be shorter than 10)
        if (typeof coin !== 'string' || coin.length > 10) {
            throw new Error('please provide a coin ticker symbol of type string');
        }
    }

    function checkBatchSafety(coins) {
        if (!Array.isArray(coins)) {
            throw new Error('please provide an array of coin strings');
        }

        R.every(checkSafety, coins);
    }
}

module.exports = setupStore;