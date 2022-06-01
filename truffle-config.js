const HDWalletProvider = require('@truffle/hdwallet-provider');

require('dotenv').config();
const {
    ETHERSCAN_API_KEY,
    HECOINFO_API_KEY,
    BSCSCAN_API_KEY,
    POLYGONSCAN_API_KEY,
    FANTOM_API_KEY,
    AVALANCHE_API_KEY,
    CRONOS_API_KEY,
    MNEMONIC,
    DEPLOY_GAS_LIMIT,
    DEPLOY_GAS_PRICE,
    INFURA_ID_PROJECT,
} = process.env;

const Web3 = require("web3");
const web3 = new Web3();

module.exports = {
    plugins: ['truffle-plugin-verify', 'truffle-contract-size'],

    api_keys: {
        etherscan: ETHERSCAN_API_KEY,
        bscscan: BSCSCAN_API_KEY,
        hecoinfo: HECOINFO_API_KEY,
        polygonscan: POLYGONSCAN_API_KEY,
        ftmscan: FANTOM_API_KEY,
        snowtrace: AVALANCHE_API_KEY,
        cronoscan: CRONOS_API_KEY,
    },

    networks: {
        /* development: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*",
            gas: 30000000
        }, */
        ropsten: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://ropsten.infura.io/v3/" + INFURA_ID_PROJECT),
            network_id: 3,
            gas: DEPLOY_GAS_LIMIT,
            confirmations: 2,
            skipDryRun: true
        },
        mainnet: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://mainnet.infura.io/v3/" + INFURA_ID_PROJECT),
            network_id: 1,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE, 'gwei'),
            gas: DEPLOY_GAS_LIMIT,
            skipDryRun: false
        },
        kovan: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://kovan.infura.io/v3/" + INFURA_ID_PROJECT),
            network_id: 42,
            confirmations: 1,
            gas: DEPLOY_GAS_LIMIT,
            skipDryRun: true
        },
        rinkeby: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://rinkeby.infura.io/v3/" + INFURA_ID_PROJECT),
            network_id: 4,
            confirmations: 2,
            gas: DEPLOY_GAS_LIMIT,
            skipDryRun: true
        },
        bscTestnet: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://data-seed-prebsc-1-s2.binance.org:8545"),
            network_id: 97,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        bsc: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://bsc-dataseed.binance.org"),
            network_id: 56,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE, 'gwei'),
            gas: DEPLOY_GAS_LIMIT,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        maticMainnet: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://polygon-rpc.com/"),
            network_id: 137,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE, 'gwei'),
            gas: DEPLOY_GAS_LIMIT,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: false
        },
        maticTestnet: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://rpc-mumbai.maticvigil.com"),
            network_id: 80001,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        hecoTestnet: {
            provider: () => new HDWalletProvider(MNEMONIC, 'https://http-testnet.hecochain.com'),
            network_id: 256,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true 
        },
        hecoMainnet: {
            provider: () => new HDWalletProvider(MNEMONIC, 'https://http-mainnet.hecochain.com'),
            network_id: 128,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE, 'gwei'),
            gas: DEPLOY_GAS_LIMIT,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: false
        },
        celoMainnet: {
            provider: () => new HDWalletProvider(MNEMONIC, 'https://forno.celo.org'),
            network_id: 42220,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE, 'gwei'),
            gas: DEPLOY_GAS_LIMIT,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: false
        },
        celoTestnet: {
            provider: () => new HDWalletProvider(MNEMONIC, 'https://alfajores-forno.celo-testnet.org'),
            network_id: 44787,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE, 'gwei'),
            gas: DEPLOY_GAS_LIMIT,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true,
            networkCheckTimeout: 999999
        },
        fantomMainnet: {
            provider: () => new HDWalletProvider(MNEMONIC, 'https://rpc.ftm.tools/'),
            network_id: 250,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE, 'gwei'),
            gas: DEPLOY_GAS_LIMIT,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: false,
        },
        fantomTestnet: {
            provider: () => new HDWalletProvider(MNEMONIC, 'https://rpc.testnet.fantom.network/'),
            network_id: 4002,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true,
        },
        avalancheMainnet: {
            provider: () => new HDWalletProvider(MNEMONIC, 'https://api.avax.network/ext/bc/C/rpc'),
            network_id: 43114,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE, 'gwei'),
            gas: DEPLOY_GAS_LIMIT,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: false,
        },
        avalancheTestnet: {
            provider: () => new HDWalletProvider(MNEMONIC, 'https://api.avax-test.network/ext/bc/C/rpc'),
            network_id: 43113,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true,
        },
        cronosMainnet: {
            provider: () => new HDWalletProvider(MNEMONIC, 'https://evm.cronos.org'),
            network_id: 25,
            confirmations: 2,
            timeoutBlocks: 200,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE, 'gwei'),
            gas: DEPLOY_GAS_LIMIT,
            skipDryRun: false,
        },
        cronosTestnet: {
            provider: () => new HDWalletProvider(MNEMONIC, 'https://cronos-testnet-3.crypto.org:8545'),
            network_id: 338,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true,
        }
    },

    // Set default mocha options here, use special reporters etc.
    mocha: {
        reporter: 'eth-gas-reporter',
        reporterOptions : {
            onlyCalledMethods : true
        }
        // timeout: 100000
    },

    compilers: {
        solc: {
            version: "0.8.14",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200000
                }
            }
        }
    },
    
};