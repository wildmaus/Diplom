// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./NonblockingLzApp.sol";
import "./IToken.sol";

contract SwapContractLZ is
    AccessControl,
    Pausable,
    ReentrancyGuard,
    NonblockingLzApp
{
    using SafeERC20 for IERC20;
    bytes32 public constant LAYER_ZERO = keccak256("LAYER_ZERO");
    uint256 public constant BASE = 1e6;

    IERC20 public immutable tokenAddress;
    address public immutable mintedTokenAddress;

    uint128 public numOfThisBlockchain;
    mapping(uint128 => bool) public existingOtherBlockchain;

    uint256 public constant SIGNATURE_LENGTH = 65;
    mapping(bytes32 => bytes32) public processedTransactions;

    uint256 public minConfirmationSignatures;
    uint256 public minConfirmationBlocks;
    uint128 public commissionPercent;
    uint256 public commissionCollected;

    event TransferFromOtherBlockchain(
        address user,
        uint256 amount,
        uint256 amountWithoutFee,
        bytes32 originalTxHash
    );
    event TransferToOtherBlockchain(
        uint128 blockchain,
        address user,
        uint256 amount,
        string newAddress
    );

    /**
     * @dev throws if transaction sender is not
     */
    modifier onlyLZ() {
        require(hasRole(LAYER_ZERO, _msgSender()), "only for LZ");
        _;
    }

    /**
     * @dev Constructor of contract
     * @param _tokenAddress address Address of token contract
     * @param _numOfThisBlockchain Number of blockchain where contract is deployed
     * @param _numsOfOtherBlockchains List of blockchain number that is supported by bridge
     * @param _minConfirmationSignatures Number of required signatures for token swap
     * @param _minConfirmationBlocks Minimal amount of blocks for confirmation on validator nodes
     */
    constructor(
        address _endpoint,
        IERC20 _tokenAddress,
        address _mintedTokenAddress,
        uint128 _numOfThisBlockchain,
        uint128[] memory _numsOfOtherBlockchains,
        uint128 _minConfirmationSignatures,
        uint256 _minConfirmationBlocks
    ) NonblockingLzApp(_endpoint) {
        tokenAddress = _tokenAddress;
        mintedTokenAddress = _mintedTokenAddress;
        for (uint256 i = 0; i < _numsOfOtherBlockchains.length; i++) {
            require(
                _numsOfOtherBlockchains[i] != _numOfThisBlockchain,
                "swapContract: Number of this blockchain is in array of other blockchains"
            );
            existingOtherBlockchain[_numsOfOtherBlockchains[i]] = true;
        }

        numOfThisBlockchain = _numOfThisBlockchain;
        minConfirmationSignatures = _minConfirmationSignatures;
        minConfirmationBlocks = _minConfirmationBlocks;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
     * @dev Transfers tokens from sender to the contract.
     * User calls this function when he wants to transfer tokens to another blockchain.
     * @param blockchain Number of blockchain
     * @param amount Amount of tokens
     * @param newAddress Address in the blockchain to which the user wants to transfer
     */
    function transferToOtherBlockchain(
        uint16 blockchain,
        uint256 amount,
        uint256 amountMinted,
        string memory newAddress
    ) external payable whenNotPaused nonReentrant {
        require(
            bytes(newAddress).length > 0,
            "swapContract: No destination address provided"
        );
        require(
            existingOtherBlockchain[blockchain] &&
                blockchain != numOfThisBlockchain,
            "swapContract: Wrong choose of blockchain"
        );
        require(amount > 0 || amountMinted > 0, "swapContract: Zero amount");
        require(
            tokenAddress.balanceOf(_msgSender()) >= amount &&
                IERC20(mintedTokenAddress).balanceOf(_msgSender()) >=
                amountMinted,
            "swapContract: Amount exceed balance"
        );
        tokenAddress.safeTransferFrom(_msgSender(), address(this), amount);
        IToken(mintedTokenAddress).burn(_msgSender(), amountMinted);
        _lzSend(blockchain, abi.encodePacked(_msgSender(), amount + amountMinted), payable(_msgSender()), address(0), bytes(""));
    }

    // OTHER BLOCKCHAIN MANAGEMENT
    /**
     * @dev Registers another blockchain for availability to swap
     * @param numOfOtherBlockchain number of blockchain
     */
    function addOtherBlockchain(uint128 numOfOtherBlockchain)
        external
        onlyOwner
    {
        require(
            numOfOtherBlockchain != numOfThisBlockchain,
            "swapContract: Cannot add this blockchain to array of other blockchains"
        );
        require(
            !existingOtherBlockchain[numOfOtherBlockchain],
            "swapContract: This blockchain is already added"
        );
        existingOtherBlockchain[numOfOtherBlockchain] = true;
    }

    /**
     * @dev Unregisters another blockchain for availability to swap
     * @param numOfOtherBlockchain number of blockchain
     */
    function removeOtherBlockchain(uint128 numOfOtherBlockchain)
        external
        onlyOwner
    {
        require(
            existingOtherBlockchain[numOfOtherBlockchain],
            "swapContract: This blockchain was not added"
        );
        existingOtherBlockchain[numOfOtherBlockchain] = false;
    }

    /**
     * @dev Change existing blockchain id
     * @param oldNumOfOtherBlockchain number of existing blockchain
     * @param newNumOfOtherBlockchain number of new blockchain
     */
    function changeOtherBlockchain(
        uint128 oldNumOfOtherBlockchain,
        uint128 newNumOfOtherBlockchain
    ) external onlyOwner {
        require(
            oldNumOfOtherBlockchain != newNumOfOtherBlockchain,
            "swapContract: Cannot change blockchains with same number"
        );
        require(
            newNumOfOtherBlockchain != numOfThisBlockchain,
            "swapContract: Cannot add this blockchain to array of other blockchains"
        );
        require(
            existingOtherBlockchain[oldNumOfOtherBlockchain],
            "swapContract: This blockchain was not added"
        );
        require(
            !existingOtherBlockchain[newNumOfOtherBlockchain],
            "swapContract: This blockchain is already added"
        );

        existingOtherBlockchain[oldNumOfOtherBlockchain] = false;
        existingOtherBlockchain[newNumOfOtherBlockchain] = true;
    }

    /**
     * @dev Changes fee values for blockchain
     * @param _commissionPercent Fee percent to transfer mul 1e6
     */
    function setFee(uint128 _commissionPercent) external onlyOwner {
        commissionPercent = _commissionPercent;
    }

    // VALIDATOR CONFIRMATIONS MANAGEMENT

    /**
     * @dev Changes requirement for minimal amount of signatures to validate on transfer
     * @param _minConfirmationSignatures Number of signatures to verify
     */
    function setMinConfirmationSignatures(uint256 _minConfirmationSignatures)
        external
        onlyOwner
    {
        require(
            _minConfirmationSignatures > 0,
            "swapContract: At least 1 confirmation can be set"
        );
        minConfirmationSignatures = _minConfirmationSignatures;
    }

    /**
     * @dev Changes requirement for minimal amount of block to consider tx confirmed on validator
     * @param _minConfirmationBlocks Amount of blocks
     */

    function setMinConfirmationBlocks(uint256 _minConfirmationBlocks)
        external
        onlyOwner
    {
        minConfirmationBlocks = _minConfirmationBlocks;
    }

    /**
     * @dev Pauses transfers of tokens on contract
     */
    function pauseExecution() external onlyOwner {
        _pause();
    }

    /**
     * @dev Resumes transfers of tokens on contract
     */
    function continueExecution() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Allow owner withdraw commission
     */
    function withdrawCommission() external onlyOwner nonReentrant {
        uint256 amount = commissionCollected;
        commissionCollected = 0;
        uint256 balance = tokenAddress.balanceOf(address(this));
        if (balance >= amount) {
            tokenAddress.safeTransfer(_msgSender(), amount);
        } else {
            if (balance > 0) {
                tokenAddress.safeTransfer(_msgSender(), balance);
            }
            IToken(mintedTokenAddress).mint(_msgSender(), amount - balance);
        }
    }

    /**
     * @dev Allow owner add liquidity
     */
    function addLiquidity(uint256 amount) external onlyOwner nonReentrant {
        require(
            tokenAddress.balanceOf(_msgSender()) >= amount,
            "swapContract: not enough liquidity"
        );
        tokenAddress.safeTransfer(_msgSender(), amount);
    }

    /**
     * @dev Allow owner collect tokens, EMERGENCY ONLY
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        require(
            tokenAddress.balanceOf(address(this)) >= amount,
            "swapContract: amount exced balance"
        );
        tokenAddress.transfer(_msgSender(), amount);
    }

    /**
     * @dev Allow users to swap minted tokens, if contract
     * has enough liquidity
     */
    function swapMintedTokens() external nonReentrant {
        uint256 amount = tokenAddress.balanceOf(address(this));
        require(amount > 0, "swapContract: do not any liquidity");
        uint256 mintBalance = IERC20(mintedTokenAddress).balanceOf(
            _msgSender()
        );
        require(mintBalance > 0, "swapContract: do not any minted tokens");
        if (amount >= mintBalance) {
            amount = mintBalance;
        }
        IToken(mintedTokenAddress).burn(_msgSender(), amount);
        tokenAddress.safeTransfer(_msgSender(), amount);
    }

    /**
     * @dev Function to check if transfer of tokens on previous
     * transaction from other blockchain was executed
     * @param originalTxHash Transaction hash to check
     */
    function isProcessedTransaction(bytes32 originalTxHash)
        public
        view
        returns (bool processed, bytes32 hashedParams)
    {
        hashedParams = processedTransactions[originalTxHash];
        processed = hashedParams != bytes32(0);
    }

    /**
     * @dev Calculates payment amount
     */
    function estimateSendFee(
        uint16 _dstChainId,
        bytes memory _user,
        uint256 _amount,
        bytes32 _txHash,
        bool _useZro,
        bytes memory _adapterParams
    ) public view virtual returns (uint256 nativeFee, uint256 zroFee) {
        bytes memory payload = abi.encode(_user, _amount, _txHash);
        return
            lzEndpoint.estimateFees(
                _dstChainId,
                address(this),
                payload,
                _useZro,
                _adapterParams
            );
    }

    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory _srcAddress, uint64 _nonce, bytes memory _payload) internal virtual override {
        // decode the user and amount
        (address user, uint amount) = abi.decode(_payload, (address, uint));

        _transferToUserWithFee(user, amount);
    }

    /**
     * @dev Transfers tokens to end user in current blockchain
     * @param user User address
     * @param amountWithFee Amount of tokens with included fees
     */
    function _transferToUserWithFee(
        address user,
        uint256 amountWithFee
    ) internal {
        require(
            user != address(0),
            "swapContract: Address cannot be zero address"
        );

        uint256 amount = (amountWithFee * commissionPercent) / BASE;
        commissionCollected += amount;
        amount = amountWithFee - amount;
        uint256 balance = tokenAddress.balanceOf(address(this));
        if (balance >= amount) {
            tokenAddress.safeTransfer(user, amount);
        } else {
            if (balance > 0) {
                tokenAddress.safeTransfer(user, balance);
            }
            IToken(mintedTokenAddress).mint(user, amount - balance);
        }
    }

}
