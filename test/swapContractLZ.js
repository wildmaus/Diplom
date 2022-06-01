const BN = require("bn.js");
const chai = require("chai");
const { expect, assert } = require("chai");
const expectRevert = require("./utils/expectRevert.js");
chai.use(require("chai-bn")(BN));
const EthCrypto = require("eth-crypto");

require('dotenv').config();
const {
} = process.env;

const ZERO = new BN(0);
const ONE = new BN(1);
const TWO = new BN(2);
const THREE = new BN(3);
const FOUR = new BN(4);
const FIVE = new BN(5);
const TEN = new BN(10);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const DECIMALS = new BN(18);
const ONE_TOKEN = TEN.pow(DECIMALS);

const TOTAL_SUPPLY = ONE_TOKEN.mul(new BN(1000000));

const swapContract = artifacts.require('SwapContractLZ');
const testToken = artifacts.require('TokenTest');


const getTransferMessageHash = (user, amount) => {
    const hash = EthCrypto.hash.keccak256([
        { type: "address", value: user },
        { type: "uint256", value: amount.toString() }
    ]);

    return hash;
}

contract(
    'swapContract-test',
    ([
        swapContractOwner,
        testTokenOwner,
        user1,
        user2,
        newOwnerAddress,
        
    ]) => {
        let swapContractInst;
        let testTokenInst;

        let name = "Name";
        let symbol = "Symbol";
        let endpoint = "0x1234567890123456789012345678901234567";

        beforeEach(async () => {
            // Init contracts

            testTokenInst = await testToken.new(
                name,
                symbol,
                TOTAL_SUPPLY,
                {from: testTokenOwner}
            );

            swapContractInst = await swapContract.new(
                endpoint,
                testTokenInst.address,
                feeAddress,
                ZERO,
                [ONE, TWO],
                THREE,
                FIVE,
                TEN,
                TEN,
                {from: swapContractOwner}
            );
        })

        it("#0 Deploy test", async () => {
            const thisBlockchain = await swapContractInst.numOfThisBlockchain();
            expect(thisBlockchain).to.be.a.bignumber.zero;
            const otherBlockchainOne = await swapContractInst.getOtherBlockchainAvailableByNum(ONE);
            const otherBlockchainTwo = await swapContractInst.getOtherBlockchainAvailableByNum(TWO);
            const otherBlockchainThree = await swapContractInst.getOtherBlockchainAvailableByNum(THREE);
            expect(otherBlockchainOne).to.be.true;
            expect(otherBlockchainTwo).to.be.true;
            expect(otherBlockchainThree).to.be.false;

            await testTokenInst.mint(user1, ONE_TOKEN, {from: testTokenOwner});
            const userBalanceBefore = await testTokenInst.balanceOf(user1);
            expect(userBalanceBefore).to.be.a.bignumber.equals(ONE_TOKEN);
            await testTokenInst.approve(swapContractInst.address, ONE_TOKEN, {from: user1})
            const userApproval = await testTokenInst.allowance(user1, swapContractInst.address)
            expect(userApproval).to.be.a.bignumber.equals(ONE_TOKEN);
            await expectRevert(
                swapContractInst.transferToOtherBlockchain(ZERO, ONE_TOKEN, user2, {from: user1}),
                "swapContract: Wrong choose of blockchain"
            ) 
            await expectRevert(
                swapContractInst.transferToOtherBlockchain(FOUR, ONE_TOKEN, user2, {from: user1}),
                "swapContract: Wrong choose of blockchain"
            )
            await swapContractInst.transferToOtherBlockchain(ONE, ONE_TOKEN, user2, {from: user1})
            const userBalanceAfter = await testTokenInst.balanceOf(user1);
            expect(userBalanceAfter).to.be.a.bignumber.zero;
        })

        it("#1 Setup new owner and manager", async () => {
            // Owner modifier precheck
            const deployFeeAddress = await swapContractInst.feeAddress();
            await swapContractInst.changeFeeAddress(newFeeAddress, {from: swapContractOwner});
            const setupFeeAddress = await swapContractInst.feeAddress();
            expect(setupFeeAddress).not.to.be.equals(deployFeeAddress);

            // Owner and manager modifier precheck
            const deployFeeAmount = await swapContractInst.feeAmountOfBlockchain(ZERO);
            
            await swapContractInst.setFeeAmountOfBlockchain(ZERO, 15, {from: swapContractOwner});
            const newFeeAmount = await swapContractInst.feeAmountOfBlockchain(ZERO);
            expect(newFeeAmount).not.to.be.a.bignumber.equals(deployFeeAmount)
            await expectRevert(
                swapContractInst.setFeeAmountOfBlockchain(ZERO, 15, {from: newManagerAddress}),
                "Caller is not in owner or manager role"
            );

            await swapContractInst.transferOwnerAndSetManager(newOwnerAddress, newManagerAddress);
            await expectRevert(
                swapContractInst.changeFeeAddress(newFeeAddress, {from: swapContractOwner}),
                "Caller is not in owner or manager role"
            );

            await expectRevert(
                swapContractInst.setFeeAmountOfBlockchain(ZERO, 25, {from: swapContractOwner}),
                "Caller is not in owner or manager role"
            );

            await swapContractInst.changeFeeAddress(deployFeeAddress, {from: newOwnerAddress})
            const revertedFeeAddress = await swapContractInst.feeAddress();
            expect(revertedFeeAddress).to.be.equals(deployFeeAddress);
            await swapContractInst.setFeeAmountOfBlockchain(ZERO, 25, {from: newManagerAddress});
            const secondFeeAmount = await swapContractInst.feeAmountOfBlockchain(ZERO);
            expect(secondFeeAmount).not.be.be.a.bignumber.equals(newFeeAmount);

            await swapContractInst.setFeeAmountOfBlockchain(ZERO, 30, {from: newOwnerAddress});
            const thirdFeeAmount = await swapContractInst.feeAmountOfBlockchain(ZERO);
            expect(thirdFeeAmount).not.be.be.a.bignumber.equals(secondFeeAmount);
        })

        it("#2 Only relayer can access transfer function", async () => {
            expect(
                await  swapContractInst.isRelayer(relayer1)
            ).to.be.false;
            
            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    FIVE,
                    MOCK_TX_HASH,
                    MOCK_TX_HASH, 
                    {from: relayer1}
                ),
                "Caller is not in relayer role"
            )

            await swapContractInst.grantRole(RELAYER_ROLE, relayer1, {from: swapContractOwner});

            expect(
                await  swapContractInst.isRelayer(relayer1)
            ).to.be.true;

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    FIVE,
                    MOCK_TX_HASH,
                    MOCK_TX_HASH, 
                    {from: relayer1}
                ),
                "swapContract: Signatures lengths must be divisible by 65"
            )
        })


        it("#3 Cannot be executed with zero address", async () => {
            await swapContractInst.grantRole(RELAYER_ROLE, relayer1, {from: swapContractOwner});

            expect(
                await  swapContractInst.isRelayer(relayer1)
            ).to.be.true;

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    ZERO_ADDRESS,
                    minTokens,
                    MOCK_TX_HASH,
                    MOCK_TX_HASH, 
                    {from: relayer1}
                ),
                "swapContract: Address cannot be zero address"
            )
        }) 
        
        it("#4 Should check lengths of bytes in signature", async () => {
            await swapContractInst.grantRole(RELAYER_ROLE, relayer1, {from: swapContractOwner});

            expect(
                await  swapContractInst.isRelayer(relayer1)
            ).to.be.true;

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    MOCK_TX_HASH, 
                    {from: relayer1}
                ),
                "swapContract: Signatures lengths must be divisible by 65"
            )

            const firstValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.first.priv)
            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    firstValidatorSignature, 
                    {from: relayer1}
                ),
                "swapContract: Not enough signatures passed"
            )

        })
        
        it("#5 Should revert if length of signatures less that minimum confirmations", async () => {
            await swapContractInst.grantRole(RELAYER_ROLE, relayer1, {from: swapContractOwner});

            expect(
                await  swapContractInst.isRelayer(relayer1)
            ).to.be.true;

            const firstValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.first.priv)
            const secondValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.second.priv)
            const secondValidatorSignatureSliced = secondValidatorSignature.slice(2, secondValidatorSignature.length)
            const thirdValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.third.priv)
            const thirdValidatorSignatureSliced = thirdValidatorSignature.slice(2, thirdValidatorSignature.length)
            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    firstValidatorSignature, 
                    {from: relayer1}
                ),
                "swapContract: Not enough signatures passed"
            )
            
            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    firstValidatorSignature + secondValidatorSignatureSliced, 
                    {from: relayer1}
                ),
                "swapContract: Not enough signatures passed"
            )

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    firstValidatorSignature + secondValidatorSignatureSliced + thirdValidatorSignatureSliced, 
                    {from: relayer1}
                ),
                "swapContract: Validator address not in whitelist"
            )

        })

        it("#6 Should revert if validators not added to roles", async () => {
            await swapContractInst.grantRole(RELAYER_ROLE, relayer1, {from: swapContractOwner});

            expect(
                await  swapContractInst.isRelayer(relayer1)
            ).to.be.true;

            const firstValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.first.priv)
            const secondValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.second.priv)
            const secondValidatorSignatureSliced = secondValidatorSignature.slice(2, secondValidatorSignature.length)
            const thirdValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.third.priv)
            const thirdValidatorSignatureSliced = thirdValidatorSignature.slice(2, thirdValidatorSignature.length)
            const concatSignatures = firstValidatorSignature + secondValidatorSignatureSliced + thirdValidatorSignatureSliced

            expect(
                await  swapContractInst.isValidator(mockValidators.first.address)
            ).to.be.false;
            expect(
                await  swapContractInst.isValidator(mockValidators.second.address)
            ).to.be.false;
            expect(
                await  swapContractInst.isValidator(mockValidators.third.address)
            ).to.be.false;

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    concatSignatures, 
                    {from: relayer1}
                ),
                "swapContract: Validator address not in whitelist"
            )

            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.first.address, {from: swapContractOwner});

            expect(
                await  swapContractInst.isValidator(mockValidators.first.address)
            ).to.be.true;

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    concatSignatures, 
                    {from: relayer1}
                ),
                "swapContract: Validator address not in whitelist"
            )

            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.second.address, {from: swapContractOwner});

            expect(
                await  swapContractInst.isValidator(mockValidators.second.address)
            ).to.be.true;

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    concatSignatures, 
                    {from: relayer1}
                ),
                "swapContract: Validator address not in whitelist"
            )

            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.third.address, {from: swapContractOwner});

            expect(
                await  swapContractInst.isValidator(mockValidators.third.address)
            ).to.be.true;

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    concatSignatures, 
                    {from: relayer1}
                ),
                "TransferHelper::safeTransfer: transfer failed"
            )
        })

        it("#7 Should revert if validators are duplicate", async () => {
            await swapContractInst.grantRole(RELAYER_ROLE, relayer1, {from: swapContractOwner});

            expect(
                await  swapContractInst.isRelayer(relayer1)
            ).to.be.true;

            const firstValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.first.priv)
            const firstValidatorSignatureSliced = firstValidatorSignature.slice(2, firstValidatorSignature.length)
            const secondValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.second.priv)
            const secondValidatorSignatureSliced = secondValidatorSignature.slice(2, secondValidatorSignature.length)
            const thirdValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.third.priv)
            const thirdValidatorSignatureSliced = thirdValidatorSignature.slice(2, thirdValidatorSignature.length)

            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.first.address, {from: swapContractOwner});
            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.second.address, {from: swapContractOwner});
            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.third.address, {from: swapContractOwner});

            const dupFirstConcatSignatures = firstValidatorSignature + firstValidatorSignatureSliced + thirdValidatorSignatureSliced
            const dupSecondConcatSignatures = firstValidatorSignature + secondValidatorSignatureSliced + secondValidatorSignatureSliced
            const dupThirdConcatSignatures = firstValidatorSignature + secondValidatorSignatureSliced + firstValidatorSignatureSliced

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    dupFirstConcatSignatures, 
                    {from: relayer1}
                ),
                "swapContract: Validator address is duplicated"
            )

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    dupSecondConcatSignatures, 
                    {from: relayer1}
                ),
                "swapContract: Validator address is duplicated"
            )

            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user1,
                    minTokens,
                    MOCK_TX_HASH,
                    dupThirdConcatSignatures, 
                    {from: relayer1}
                ),
                "swapContract: Validator address is duplicated"
            )
        })

        it("#8 Should send tokens to user and save hash", async () => {
            await swapContractInst.grantRole(RELAYER_ROLE, relayer1, {from: swapContractOwner});

            expect(
                await  swapContractInst.isRelayer(relayer1)
            ).to.be.true;

            const firstValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.first.priv)
            const secondValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.second.priv)
            const secondValidatorSignatureSliced = secondValidatorSignature.slice(2, secondValidatorSignature.length)
            const thirdValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.third.priv)
            const thirdValidatorSignatureSliced = thirdValidatorSignature.slice(2, thirdValidatorSignature.length)
            const concatSignatures = firstValidatorSignature + secondValidatorSignatureSliced + thirdValidatorSignatureSliced

            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.first.address, {from: swapContractOwner});
            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.second.address, {from: swapContractOwner});
            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.third.address, {from: swapContractOwner});

            await testTokenInst.mint(swapContractInst.address, FIVE, {from: testTokenOwner})

            expect(
                await testTokenInst.balanceOf(swapContractInst.address)
            ).to.be.bignumber.equals(FIVE);
            
            await swapContractInst.transferToUserWithFee(
                user1,
                minTokens,
                MOCK_TX_HASH,
                concatSignatures, 
                {from: relayer1}
            )

            expect(
                await testTokenInst.balanceOf(user1)
            ).to.be.bignumber.equals(FIVE);

            const paramsHash = getTransferMessageHash(user1, minTokens, MOCK_TX_HASH);
            const savedHash = await swapContractInst.processedTransactions(MOCK_TX_HASH)
            expect(paramsHash).to.be.equals(savedHash);

            const isProcessed = await swapContractInst.isProcessedTransaction(MOCK_TX_HASH);
            expect(isProcessed.hashedParams).to.be.equals(paramsHash);
            expect(isProcessed.processed).to.be.true

        })

            
            
        it("#9 Should revert if trying other params with same original hash", async () => {
            await swapContractInst.grantRole(RELAYER_ROLE, relayer1, {from: swapContractOwner});

            expect(
                await  swapContractInst.isRelayer(relayer1)
            ).to.be.true;

            const firstValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.first.priv)
            const secondValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.second.priv)
            const secondValidatorSignatureSliced = secondValidatorSignature.slice(2, secondValidatorSignature.length)
            const thirdValidatorSignature = signTransferParameters(user1, minTokens, MOCK_TX_HASH, mockValidators.third.priv)
            const thirdValidatorSignatureSliced = thirdValidatorSignature.slice(2, thirdValidatorSignature.length)
            const concatSignatures = firstValidatorSignature + secondValidatorSignatureSliced + thirdValidatorSignatureSliced

            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.first.address, {from: swapContractOwner});
            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.second.address, {from: swapContractOwner});
            await swapContractInst.grantRole(VALIDATOR_ROLE, mockValidators.third.address, {from: swapContractOwner});

            await testTokenInst.mint(swapContractInst.address, TEN, {from: testTokenOwner})

            expect(
                await testTokenInst.balanceOf(swapContractInst.address)
            ).to.be.bignumber.equals(TEN);

            await swapContractInst.transferToUserWithFee(
                user1,
                minTokens,
                MOCK_TX_HASH,
                concatSignatures, 
                {from: relayer1}
            )

            expect(
                await testTokenInst.balanceOf(user1)
            ).to.be.bignumber.equals(FIVE);

            const isProcessed = await swapContractInst.isProcessedTransaction(MOCK_TX_HASH);
            expect(isProcessed.processed).to.be.true

            const firstValidatorSignatureDup = signTransferParameters(user2, minTokens, MOCK_TX_HASH, mockValidators.first.priv)
            const secondValidatorSignatureDup = signTransferParameters(user2, minTokens, MOCK_TX_HASH, mockValidators.second.priv)
            const secondValidatorSignatureDupSliced = secondValidatorSignatureDup.slice(2, secondValidatorSignatureDup.length)
            const thirdValidatorSignatureDup = signTransferParameters(user2, minTokens, MOCK_TX_HASH, mockValidators.third.priv)
            const thirdValidatorSignatureDupSliced = thirdValidatorSignatureDup.slice(2, thirdValidatorSignatureDup.length)
            const concatSignaturesDup = firstValidatorSignatureDup + secondValidatorSignatureDupSliced + thirdValidatorSignatureDupSliced
            
            
            await expectRevert(
                swapContractInst.transferToUserWithFee(
                    user2,
                    minTokens,
                    MOCK_TX_HASH,
                    concatSignaturesDup, 
                    {from: relayer1}
                ),
                "swapContract: Transaction already processed"
            )

        })

    }
)
