// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, euint128, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted range-reduction laboratory
/// @notice Research contract, not a production prize pool.
/// @dev Tests whether an encrypted random value can be safely mapped to [0, total).
contract EncryptedRangeReductionLab is ZamaEthereumConfig {
    euint64 private _total;
    euint64 private _lastRandom;
    euint64 private _lastTarget;
    ebool private _lastHadPositiveTotal;

    function setEncryptedTotal(externalEuint64 inputTotal, bytes calldata inputProof) external {
        _total = FHE.fromExternal(inputTotal, inputProof);
        FHE.allowThis(_total);
        FHE.allow(_total, msg.sender);
    }

    /// @notice Generates encrypted randomness and maps it to an encrypted total.
    /// @dev Computes floor(random * total / 2^64) in a widened euint128 product.
    /// This maps every input into [0, total) without encrypted division.
    function sampleByMultiplyHigh() external returns (euint64) {
        
        ebool hasPositiveTotal = FHE.gt(_total, FHE.asEuint64(0));
        euint64 randomValue = FHE.randEuint64();
        euint128 wideTotal = FHE.asEuint128(_total);
        euint128 product = FHE.mul(randomValue, wideTotal);
        euint128 scaled = FHE.shr(product, 64);
        euint64 reduced = FHE.asEuint64(scaled);
        euint64 target = FHE.select(hasPositiveTotal, reduced, FHE.asEuint64(0));

        _lastRandom = randomValue;
        _lastTarget = target;
        _lastHadPositiveTotal = hasPositiveTotal;

        FHE.allowThis(_lastRandom);
        FHE.allowThis(_lastTarget);
        FHE.allowThis(_lastHadPositiveTotal);
        FHE.allow(_lastTarget, msg.sender);
        FHE.allow(_lastHadPositiveTotal, msg.sender);
        return target;
    }

    function encryptedTotal() external view returns (euint64) {
        return _total;
    }

    function lastTarget() external view returns (euint64) {
        return _lastTarget;
    }

    function lastHadPositiveTotal() external view returns (ebool) {
        return _lastHadPositiveTotal;
    }
}
