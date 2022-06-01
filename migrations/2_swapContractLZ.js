const BN = require('bn.js');

require('dotenv').config();
const {
    DEPLOY_GAS_LIMIT_TOKEN,
    DEPLOY_GAS_LIMIT_BRIDGE,
    DEPLOY_GAS_LIMIT_TXES,
    WITH_TOKEN_ETH,
    WITH_TOKEN_BSC,
    NAME_ETH,
    SYMBOL_ETH,
    NAME_BSC,
    SYMBOL_BSC,
    TOTAL_SUPPLY,
    DECIMALS,
    TOKEN_ADDRESS_ETH,
    TOKEN_ADDRESS_BSC,
    TOKEN_UNLIMITED_ETH,
    TOKEN_UNLIMITED_BSC,
    NUM_BLOCKCHAIN_FOR_BSC,
    NUM_BLOCKCHAIN_FOR_ETH,
    ALL_BLOCKCHAIN_NUMS_LIST,
    TOKEN_TRANSFER_OWNERSHIP,
    TOKEN_CONTRACT_OWNER,
    MAX_TOTAL_SUPPLY,
    PREMINT_SUPPLY_DEST_BSC,
    PREMINT_SUPPLY_DEST_ETH,
    // Relayer update parameters
    MIN_CONFIRMATION_SIGNATURES,
    MIN_CONFIRMATION_BLOCKS,
    WITH_VALIDATORS,
    WITH_RELAYERS,
    VALIDATORS_ADDRESSES,
    RELAYERS_ADDRESSES,
    ENDPOINT
} = process.env;

const testToken = artifacts.require("TokenTestLimited");
const testTokenUnlimited = artifacts.require("TokenTest");
const swapContractTokens = artifacts.require("SwapContractLZ");

const ZERO = new BN(0);
const ONE = new BN(1);

module.exports = async function (deployer, network) {
    if (network == "test" || network == "development" || network == "ganache")
        return;

    let name;
    let symbol;
    let blockchainNum;
    let withToken;
    let tokenUnlimited;
    let tokenAddressIfExist;
    let allBlockchainNums;
    let premintSupplyDest;

    if (ALL_BLOCKCHAIN_NUMS_LIST.length > 1) {
        allBlockchainNums = ALL_BLOCKCHAIN_NUMS_LIST.split(",")
    } else {
        allBlockchainNums = [ALL_BLOCKCHAIN_NUMS_LIST]
    }
    
    if (network == "bsc" || network == "bscTestnet")
    {
        withToken = WITH_TOKEN_BSC
        name = NAME_BSC;
        symbol = SYMBOL_BSC;
        blockchainNum = new BN(NUM_BLOCKCHAIN_FOR_BSC);
        tokenAddressIfExist = TOKEN_ADDRESS_BSC;
        otherBlockchainNums = allBlockchainNums.filter(function(e) {
            return e !== blockchainNum.toString()
        });
        premintSupplyDest = PREMINT_SUPPLY_DEST_BSC;
        tokenUnlimited = TOKEN_UNLIMITED_BSC;
    }
    {
        withToken = WITH_TOKEN_ETH;
        name = NAME_ETH;
        symbol = SYMBOL_ETH;
        blockchainNum = new BN(NUM_BLOCKCHAIN_FOR_ETH);
        tokenAddressIfExist = TOKEN_ADDRESS_ETH;
        otherBlockchainNums = allBlockchainNums.filter(function(e) {
            return e !== blockchainNum.toString()
        });
        premintSupplyDest = PREMINT_SUPPLY_DEST_ETH;
        tokenUnlimited = TOKEN_UNLIMITED_ETH;
    }

    let token;
    if (withToken == "true")
    {
        if (tokenUnlimited == "true") {
            await deployer.deploy(
                testTokenUnlimited,
                name,
                symbol,
                {gas: DEPLOY_GAS_LIMIT_TOKEN}
            );
            token = await testTokenUnlimited.deployed();
        } else {
            await deployer.deploy(
                testToken,
                name,
                symbol,
                MAX_TOTAL_SUPPLY,
                {gas: DEPLOY_GAS_LIMIT_TOKEN}
            );
            token = await testToken.deployed();
        }
        
        tokenAddress = token.address;
        console.log('token deployed address: ', tokenAddress)    
    }
    else
        tokenAddress = tokenAddressIfExist;

    
    let swapContractInst;
    
    await deployer.deploy(
        swapContractTokens,
        ENDPOINT,
        tokenAddress,
        blockchainNum,
        otherBlockchainNums,
        MIN_CONFIRMATION_SIGNATURES,
        MIN_CONFIRMATION_BLOCKS,
        {gas: DEPLOY_GAS_LIMIT_BRIDGE}
    );
    swapContractInst = await swapContractTokens.deployed();

    
    console.log('swap deployed address: ', swapContractInst.address)
    if (withToken == "true" && premintSupplyDest != "")
    {
        if (premintSupplyDest == "swapContract") {
            await token.mint(swapContractInst.address, TOTAL_SUPPLY, {gas: DEPLOY_GAS_LIMIT_TXES});
            console.log("total supply of ", TOTAL_SUPPLY, "minted to swap contract ")
        } else if (premintSupplyDest == "owner") {
            await token.mint(TOKEN_CONTRACT_OWNER, TOTAL_SUPPLY), {gas: DEPLOY_GAS_LIMIT_TXES};
            console.log("total supply of ", TOTAL_SUPPLY, "minted to token contract owner")
        }
        
    }

    if (WITH_VALIDATORS == "true") {
        validators = VALIDATORS_ADDRESSES.split(',');
        validatorsLength = new BN(validators.length);
        validator_role = await swapContractInst.VALIDATOR_ROLE();
        for(let i = ZERO; i.lt(validatorsLength); i = i.add(ONE))
        {
            let validatorAddTx = await swapContractInst.grantRole(
                validator_role,
                validators[i],
                {gas: DEPLOY_GAS_LIMIT_TXES}
                )
            console.log("Added validator ", validators[i])
        }
    }

    if (WITH_RELAYERS == "true") {
        relayers = RELAYERS_ADDRESSES.split(',');
        relayersLength = new BN(relayers.length);
        relayer_role = await swapContractInst.RELAYER_ROLE();
        for(let i = ZERO; i.lt(relayersLength); i = i.add(ONE))
        {
            let relayerAddTx = await swapContractInst.grantRole(
                relayer_role,
                relayers[i],
                {gas: DEPLOY_GAS_LIMIT_TXES}
                )
            console.log("Added relayer ", relayers[i])
        }
    }

    
    // console.log(transferOwnershipSwapTx)

    if (withToken == "true" && TOKEN_TRANSFER_OWNERSHIP == "true")
    {
        let transferOwnershipTokenTx = await token.transferOwnership(
            TOKEN_CONTRACT_OWNER,
            {gas: DEPLOY_GAS_LIMIT_TXES}
        );
        console.log("token contract ownership transferred to ", TOKEN_CONTRACT_OWNER);
        // console.log(transferOwnershipTx);
    }
    console.log("tokenAddress address =", tokenAddress);
    console.log("swapContract address =", swapContractInst.address);
};