// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EntangleCoin is ERC20, ERC20Burnable, Ownable {
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10 ** 18; // 100M tokens
    uint256 public constant FOUNDER_ALLOCATION = (TOTAL_SUPPLY * 75) / 100; // 75%
    uint256 public constant REWARDS_ALLOCATION = (TOTAL_SUPPLY * 25) / 100; // 25%

    address public rewardsPool;
    uint256 public tokenValueBasisPoints; // Token value as basis points of share price (2500 = 25%)

    event RewardsDistributed(address indexed recipient, uint256 amount, uint256 rank);
    event TravelBooking(address indexed user, uint256 amount, string bookingType, string bookingId);
    event TokenValueUpdated(uint256 newValueBasisPoints);
    event RewardsPoolUpdated(address newPool);

    constructor(
        address _founder,
        address _rewardsPool
    ) ERC20("EntangleCoin", "ENTGL") Ownable(_founder) {
        rewardsPool = _rewardsPool;
        tokenValueBasisPoints = 2500; // 25% of share price

        _mint(_founder, FOUNDER_ALLOCATION);
        _mint(_rewardsPool, REWARDS_ALLOCATION);
    }

    function distributeReward(address recipient, uint256 amount, uint256 rank) external onlyOwner {
        require(balanceOf(rewardsPool) >= amount, "Insufficient rewards pool balance");
        _transfer(rewardsPool, recipient, amount);
        emit RewardsDistributed(recipient, amount, rank);
    }

    function batchDistributeRewards(
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256[] calldata ranks
    ) external onlyOwner {
        require(recipients.length == amounts.length && amounts.length == ranks.length, "Array length mismatch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(balanceOf(rewardsPool) >= totalAmount, "Insufficient rewards pool balance");

        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(rewardsPool, recipients[i], amounts[i]);
            emit RewardsDistributed(recipients[i], amounts[i], ranks[i]);
        }
    }

    function processBooking(address user, uint256 amount, string calldata bookingType, string calldata bookingId) external onlyOwner {
        require(balanceOf(user) >= amount, "Insufficient token balance");
        _burn(user, amount);
        emit TravelBooking(user, amount, bookingType, bookingId);
    }

    function setTokenValue(uint256 _newValueBasisPoints) external onlyOwner {
        require(_newValueBasisPoints > 0 && _newValueBasisPoints <= 10000, "Invalid basis points");
        tokenValueBasisPoints = _newValueBasisPoints;
        emit TokenValueUpdated(_newValueBasisPoints);
    }

    function setRewardsPool(address _newPool) external onlyOwner {
        require(_newPool != address(0), "Invalid address");
        rewardsPool = _newPool;
        emit RewardsPoolUpdated(_newPool);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function rewardsPoolBalance() external view returns (uint256) {
        return balanceOf(rewardsPool);
    }
}
