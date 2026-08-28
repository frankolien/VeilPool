// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, euint128, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VEIL Confidential Prize Pool
/// @notice Bounded confidential prize-linked savings pool for an ERC-7984 asset.
/// @dev Principal and prize liability are maintained in separate encrypted ledgers.
contract ConfidentialPrizePool is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    enum DrawState {
        Open,
        Ready
    }

    uint256 public constant MAX_PARTICIPANTS = 20;
    uint48 public constant MIN_DRAW_PERIOD = 5 minutes;

    IERC7984 public immutable asset;
    uint64 public immutable prizePerDraw;
    uint48 public immutable drawPeriod;

    mapping(address account => euint64 amount) private _principal;
    mapping(address account => euint64 amount) private _winnings;
    mapping(address account => bool value) public registered;
    mapping(address account => bool value) public prizeActive;
    mapping(address account => uint256 drawId) public eligibleFromDraw;
    address[] private _participants;

    euint64 private _totalPrincipal;
    euint64 private _eligibleTotalPrincipal;
    euint64 private _prizeReserve;
    uint256 public currentDrawId;
    uint48 public nextDrawAt;
    bool public depositsPaused;
    bool public drawsPaused;

    error ZeroAddress();
    error InvalidDrawPeriod(uint48 supplied, uint48 minimum);
    error ParticipantCapacityReached(uint256 maximum);
    error DepositsArePaused();
    error DrawsArePaused();
    error DrawNotReady(uint48 readyAt);

    event ParticipantRegistered(address indexed account, uint256 eligibleFromDraw);
    event DepositRecorded(address indexed account, uint256 indexed drawId, euint64 encryptedAmount);
    event WithdrawalRecorded(address indexed account, uint256 indexed drawId, euint64 encryptedAmount);
    event PrizeReserveFunded(address indexed funder, euint64 encryptedAmount);
    event DrawAwarded(uint256 indexed drawId, uint64 prize, uint256 participantCount);
    event WinningsSettled(address indexed account, euint64 encryptedAmount);
    event PauseStateChanged(bool depositsPaused, bool drawsPaused);

    constructor(IERC7984 asset_, uint64 prizePerDraw_, uint48 drawPeriod_, address owner_) Ownable(owner_) {
        if (address(asset_) == address(0) || owner_ == address(0)) revert ZeroAddress();
        if (drawPeriod_ < MIN_DRAW_PERIOD) revert InvalidDrawPeriod(drawPeriod_, MIN_DRAW_PERIOD);

        asset = asset_;
        prizePerDraw = prizePerDraw_;
        drawPeriod = drawPeriod_;
        currentDrawId = 1;
        nextDrawAt = uint48(block.timestamp) + drawPeriod_;
    }

    /// @notice Deposits an encrypted cUSDT amount after the user authorizes this pool as ERC-7984 operator.
    /// @dev Accounting uses the actual ciphertext returned by the token, not the requested amount.
    function deposit(externalEuint64 encryptedAmount, bytes calldata inputProof) external nonReentrant {
        if (depositsPaused) revert DepositsArePaused();
        _register(msg.sender);

        euint64 requested = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(requested, address(asset));
        euint64 transferred = asset.confidentialTransferFrom(msg.sender, address(this), requested);

        _principal[msg.sender] = FHE.add(_principal[msg.sender], transferred);
        _totalPrincipal = FHE.add(_totalPrincipal, transferred);
        if (prizeActive[msg.sender]) {
            _eligibleTotalPrincipal = FHE.add(_eligibleTotalPrincipal, transferred);
            FHE.allowThis(_eligibleTotalPrincipal);
        }
        _persistUserAmount(_principal[msg.sender], msg.sender);
        FHE.allowThis(_totalPrincipal);

        emit DepositRecorded(msg.sender, currentDrawId, transferred);
    }

    /// @notice Withdraws up to the caller's encrypted principal, never winnings.
    /// @dev Requests above principal resolve to an encrypted-zero transfer to avoid leaking the comparison.
    function withdraw(externalEuint64 encryptedAmount, bytes calldata inputProof) external nonReentrant {
        euint64 requested = FHE.fromExternal(encryptedAmount, inputProof);
        ebool valid = FHE.le(requested, _principal[msg.sender]);
        euint64 amount = FHE.select(valid, requested, FHE.asEuint64(0));

        _principal[msg.sender] = FHE.sub(_principal[msg.sender], amount);
        _totalPrincipal = FHE.sub(_totalPrincipal, amount);
        if (prizeActive[msg.sender]) {
            _eligibleTotalPrincipal = FHE.sub(_eligibleTotalPrincipal, amount);
            FHE.allowThis(_eligibleTotalPrincipal);
        }
        _persistUserAmount(_principal[msg.sender], msg.sender);
        FHE.allowThis(_totalPrincipal);

        FHE.allowTransient(amount, address(asset));
        euint64 transferred = asset.confidentialTransfer(msg.sender, amount);
        emit WithdrawalRecorded(msg.sender, currentDrawId, transferred);
    }

    /// @notice Adds confidential prize inventory. The funder must authorize the pool as token operator.
    function fundPrizeReserve(externalEuint64 encryptedAmount, bytes calldata inputProof) external nonReentrant {
        euint64 requested = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(requested, address(asset));
        euint64 transferred = asset.confidentialTransferFrom(msg.sender, address(this), requested);
        _prizeReserve = FHE.add(_prizeReserve, transferred);
        FHE.allowThis(_prizeReserve);
        emit PrizeReserveFunded(msg.sender, transferred);
    }

    /// @notice Permissionlessly awards the ready draw using encrypted weighted prefix intervals.
    /// @dev New participants become eligible on the draw after the one in which they register.
    function sealDraw() external nonReentrant {
        if (drawsPaused) revert DrawsArePaused();
        if (block.timestamp < nextDrawAt) revert DrawNotReady(nextDrawAt);

        euint64 total = _eligibleTotalPrincipal;
        ebool hasEligibleTotal = FHE.gt(total, FHE.asEuint64(0));
        ebool reserveSufficient = FHE.ge(_prizeReserve, FHE.asEuint64(prizePerDraw));
        ebool canAward = FHE.and(hasEligibleTotal, reserveSufficient);
        euint64 prize = FHE.select(canAward, FHE.asEuint64(prizePerDraw), FHE.asEuint64(0));

        euint64 target = _multiplyHighTarget(total);
        euint64 cumulative = FHE.asEuint64(0);
        ebool selected = FHE.asEbool(false);

        uint256 length = _participants.length;
        for (uint256 i = 0; i < length; ++i) {
            (cumulative, selected) = _scanParticipant(
                _participants[i], target, cumulative, selected, prize
            );
        }

        _prizeReserve = FHE.sub(_prizeReserve, prize);
        FHE.allowThis(_prizeReserve);

        uint256 awardedDraw = currentDrawId;
        currentDrawId = awardedDraw + 1;
        nextDrawAt = uint48(block.timestamp) + drawPeriod;
        emit DrawAwarded(awardedDraw, prizePerDraw, length);
    }

    /// @notice Confidentially transfers the caller's winnings and clears their internal liability.
    function claimWinnings() external nonReentrant {
        euint64 amount = _winnings[msg.sender];
        _winnings[msg.sender] = FHE.asEuint64(0);
        _persistUserAmount(_winnings[msg.sender], msg.sender);

        FHE.allowTransient(amount, address(asset));
        euint64 transferred = asset.confidentialTransfer(msg.sender, amount);
        emit WinningsSettled(msg.sender, transferred);
    }

    function encryptedPrincipalOf(address account) external view returns (euint64) {
        return _principal[account];
    }

    function encryptedWinningsOf(address account) external view returns (euint64) {
        return _winnings[account];
    }

    function encryptedTotalPrincipal() external view returns (euint64) {
        return _totalPrincipal;
    }

    function encryptedEligibleTotalPrincipal() external view returns (euint64) {
        return _eligibleTotalPrincipal;
    }

    function encryptedPrizeReserve() external view returns (euint64) {
        return _prizeReserve;
    }

    function participantCount() external view returns (uint256) {
        return _participants.length;
    }

    function participantAt(uint256 index) external view returns (address) {
        return _participants[index];
    }

    function drawState() external view returns (DrawState) {
        return block.timestamp >= nextDrawAt ? DrawState.Ready : DrawState.Open;
    }

    function setPauseState(bool pauseDeposits, bool pauseDraws) external onlyOwner {
        depositsPaused = pauseDeposits;
        drawsPaused = pauseDraws;
        emit PauseStateChanged(pauseDeposits, pauseDraws);
    }

    function _register(address account) private {
        if (registered[account]) return;
        uint256 count = _participants.length;
        if (count == MAX_PARTICIPANTS) revert ParticipantCapacityReached(MAX_PARTICIPANTS);
        registered[account] = true;
        eligibleFromDraw[account] = currentDrawId + 1;
        _participants.push(account);
        emit ParticipantRegistered(account, currentDrawId + 1);
    }

    function _multiplyHighTarget(euint64 total) private returns (euint64) {
        euint64 randomValue = FHE.randEuint64();
        euint128 product = FHE.mul(randomValue, FHE.asEuint128(total));
        return FHE.asEuint64(FHE.shr(product, 64));
    }

    function _scanParticipant(
        address participant,
        euint64 target,
        euint64 cumulative,
        ebool selected,
        euint64 prize
    ) private returns (euint64 nextCumulative, ebool nextSelected) {
        bool isActive = prizeActive[participant];
        euint64 weight = isActive ? _principal[participant] : FHE.asEuint64(0);
        nextCumulative = FHE.add(cumulative, weight);

        ebool inInterval = FHE.and(FHE.ge(target, cumulative), FHE.lt(target, nextCumulative));
        ebool wins = FHE.and(inInterval, FHE.not(selected));
        euint64 credit = FHE.select(wins, prize, FHE.asEuint64(0));
        _winnings[participant] = FHE.add(_winnings[participant], credit);
        _persistUserAmount(_winnings[participant], participant);
        nextSelected = FHE.or(selected, wins);

        if (!isActive && eligibleFromDraw[participant] == currentDrawId + 1) {
            prizeActive[participant] = true;
            _eligibleTotalPrincipal = FHE.add(_eligibleTotalPrincipal, _principal[participant]);
            FHE.allowThis(_eligibleTotalPrincipal);
        }
    }

    function _persistUserAmount(euint64 amount, address account) private {
        FHE.allowThis(amount);
        FHE.allow(amount, account);
    }
}
