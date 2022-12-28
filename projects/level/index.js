const sdk = require('@defillama/sdk');
const { transformBalances } = require('../helper/portedTokens')
const { unwrapUniswapLPs } = require("../helper/unwrapLPs");

const Contracts = {
    Pool: "0xA5aBFB56a78D2BD4689b25B8A77fd49Bb0675874",
    Chef: "0x1Ab33A7454427814a71F128109fE5B498Aa21E5d",
    Tokens: {
        BTC: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
        ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
        WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        CAKE: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
        BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
        USDT: "0x55d398326f99059fF775485246999027B3197955"
    },
    LVL_BNB_LP: "0x70f16782010fa7dDf032A6aaCdeed05ac6B0BC85"
}

const abi = {
    getPoolAsset: {
        "inputs": [{ "internalType": "address", "name": "_token", "type": "address" }],
        "name": "getPoolAsset",
        "outputs": [
            {
                "components": [
                    { "internalType": "uint256", "name": "poolAmount", "type": "uint256" },
                    { "internalType": "uint256", "name": "reservedAmount", "type": "uint256" },
                    { "internalType": "uint256", "name": "guaranteedValue", "type": "uint256" },
                    { "internalType": "uint256", "name": "totalShortSize", "type": "uint256" }
                ],
                "internalType": "struct AssetInfo",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
}

const calcTvl = async (_, _b, chainBlocks, { chain }) => {
    const balances = {};
    const { output: data } = await sdk.api.abi.multiCall({
        target: Contracts.Pool,
        abi: abi.getPoolAsset,
        calls: Object.values(Contracts.Tokens).map(t => ({
            params: [t],
        })),
        block: chainBlocks.bsc,
        chain,
    })
    Object.values(Contracts.Tokens).forEach((token, i) => {
        sdk.util.sumSingleBalance(balances, token, data[i].output.poolAmount || 0)
    })
    return transformBalances(chain, balances)
}

const calcPool2 = async (_, _b, chainBlocks, { chain }) => {
    const balances = {}
    const lpBalance = (await sdk.api.abi.call({
        target: Contracts.LVL_BNB_LP,
        abi: "erc20:balanceOf",
        params: Contracts.Chef,
        block: chainBlocks.bsc,
        chain
    })).output;
    await unwrapUniswapLPs(
        balances,
        [{
            balance: lpBalance,
            token: Contracts.LVL_BNB_LP,
        }],
        chainBlocks.bsc,
        chain,
        (addr) => `${chain}:${addr}`
    );
    return balances;
}

module.exports = {
    bsc: {
        tvl: calcTvl,
        pool2: calcPool2
    },
};