// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakingVault
 * @dev A staking contract for Hacked ATM Token with referral system and locking period
 */
contract StakingVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Staking token (HATM)
    IERC20 public stakingToken;
    
    // Staking parameters
    uint256 public lockDuration = 7 days; // 7-day lock period
    uint256 public earlyWithdrawalPenalty = 1000; // 10% penalty (in basis points, 10000 = 100%)
    uint256 public referralRewardRate = 300; // 3% reward (in basis points)
    uint256 public rewardRate = 1200; // 12% APY (in basis points)
    
    // User staking information
    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 lastClaimAt;
        uint256 pendingRewards;
        address referrer;
        bool isRegistered;
    }
    
    // Mapping of user address to staking info
    mapping(address => StakeInfo) public userStakes;
    
    // Tracking referrals
    mapping(address => address[]) public referrals;
    mapping(address => uint256) public totalReferralRewards;
    
    // Global stats
    uint256 public totalStaked;
    uint256 public totalReferrals;
    uint256 public stakersCount;
    
    // Addresses that have been registered
    mapping(address => bool) public registeredUsers;
    
    // Events
    event UserRegistered(address indexed user, address indexed referrer);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 penalty);
    event RewardClaimed(address indexed user, uint256 amount);
    event ReferralRewardPaid(address indexed referrer, address indexed referred, uint256 amount);

    /**
     * @dev Constructor sets the token and owner
     * @param _stakingToken Address of the staking token (HATM)
     * @param initialOwner Address of contract owner
     */
    constructor(address _stakingToken, address initialOwner) Ownable(initialOwner) {
        stakingToken = IERC20(_stakingToken);
    }

    /**
     * @dev Register a user before they can stake
     * @param referrer Optional referrer address
     */
    function registerUser(address referrer) external {
        require(!registeredUsers[msg.sender], "User already registered");
        
        if (referrer != address(0) && referrer != msg.sender) {
            // Make sure referrer is already registered
            require(registeredUsers[referrer], "Referrer not registered");
            
            // Add referrer to user's staking info
            userStakes[msg.sender].referrer = referrer;
            
            // Add referred user to referrer's list
            referrals[referrer].push(msg.sender);
            totalReferrals++;
        }
        
        // Mark user as registered
        registeredUsers[msg.sender] = true;
        userStakes[msg.sender].isRegistered = true;
        userStakes[msg.sender].lastClaimAt = block.timestamp;
        
        emit UserRegistered(msg.sender, referrer);
    }

    /**
     * @dev Stake tokens into the vault
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant {
        require(registeredUsers[msg.sender], "User not registered");
        require(amount > 0, "Cannot stake 0");
        
        // Calculate and update rewards before changing stake
        updateRewards(msg.sender);
        
        // Transfer tokens from user to the contract
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update user's staking info
        StakeInfo storage userStake = userStakes[msg.sender];
        
        // If this is user's first stake, increment stakers count
        if (userStake.amount == 0) {
            stakersCount++;
        }
        
        userStake.amount += amount;
        userStake.stakedAt = block.timestamp;
        
        // Update total staked
        totalStaked += amount;
        
        // Pay referral rewards if applicable
        address referrer = userStake.referrer;
        if (referrer != address(0)) {
            uint256 referralReward = (amount * referralRewardRate) / 10000;
            
            // Update referrer's rewards
            userStakes[referrer].pendingRewards += referralReward;
            totalReferralRewards[referrer] += referralReward;
            
            emit ReferralRewardPaid(referrer, msg.sender, referralReward);
        }
        
        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Unstake tokens from the vault
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage userStake = userStakes[msg.sender];
        require(userStake.amount >= amount, "Not enough staked");
        
        // Calculate and update rewards before changing stake
        updateRewards(msg.sender);
        
        uint256 penalty = 0;
        uint256 amountToReturn = amount;
        
        // Check if within lock period
        if (block.timestamp < userStake.stakedAt + lockDuration) {
            // Apply early unstaking penalty
            penalty = (amount * earlyWithdrawalPenalty) / 10000;
            amountToReturn = amount - penalty;
            
            // 80% of penalty burned, 20% to marketing (owner)
            uint256 burnAmount = penalty * 80 / 100;
            uint256 marketingAmount = penalty - burnAmount;
            
            // Send tokens to owner for marketing
            stakingToken.safeTransfer(owner(), marketingAmount);
            
            // Burn tokens by sending to dead address
            stakingToken.safeTransfer(address(0x000000000000000000000000000000000000dEaD), burnAmount);
        }
        
        // Update user's staking info
        userStake.amount -= amount;
        
        // If user unstaked everything, decrement stakers count
        if (userStake.amount == 0) {
            stakersCount--;
        }
        
        // Update total staked
        totalStaked -= amount;
        
        // Transfer tokens back to user
        stakingToken.safeTransfer(msg.sender, amountToReturn);
        
        emit Unstaked(msg.sender, amount, penalty);
    }

    /**
     * @dev Claim pending rewards
     */
    function claimRewards() external nonReentrant {
        // Calculate and update rewards
        updateRewards(msg.sender);
        
        StakeInfo storage userStake = userStakes[msg.sender];
        uint256 rewards = userStake.pendingRewards;
        
        require(rewards > 0, "No rewards to claim");
        
        // Reset pending rewards
        userStake.pendingRewards = 0;
        userStake.lastClaimAt = block.timestamp;
        
        // Transfer rewards to user
        stakingToken.safeTransfer(msg.sender, rewards);
        
        emit RewardClaimed(msg.sender, rewards);
    }

    /**
     * @dev Calculate and update pending rewards for a user
     * @param user User address to update rewards for
     */
    function updateRewards(address user) internal {
        StakeInfo storage userStake = userStakes[user];
        
        // Skip if user has no stake
        if (userStake.amount == 0) {
            return;
        }
        
        // Calculate time elapsed since last claim
        uint256 timeElapsed = block.timestamp - userStake.lastClaimAt;
        
        // Calculate rewards based on staked amount, time elapsed, and APY
        // Formula: amount * (APY / 100) * (timeElapsed / 365 days)
        uint256 newRewards = (userStake.amount * rewardRate * timeElapsed) / (10000 * 365 days);
        
        // Add to pending rewards
        userStake.pendingRewards += newRewards;
        
        // Update last claim time
        userStake.lastClaimAt = block.timestamp;
    }

    /**
     * @dev Get user staking info
     * @param user User address to get info for
     * @return Staking info struct
     */
    function getStakingInfo(address user) external view returns (
        uint256 amountStaked,
        uint256 pendingRewards,
        uint256 stakedAt,
        uint256 lastClaimAt,
        address referrer,
        bool isRegistered
    ) {
        StakeInfo storage userStake = userStakes[user];
        
        // Calculate current rewards (without updating state)
        uint256 calculatedRewards = userStake.pendingRewards;
        
        if (userStake.amount > 0) {
            uint256 timeElapsed = block.timestamp - userStake.lastClaimAt;
            uint256 newRewards = (userStake.amount * rewardRate * timeElapsed) / (10000 * 365 days);
            calculatedRewards += newRewards;
        }
        
        return (
            userStake.amount,
            calculatedRewards,
            userStake.stakedAt,
            userStake.lastClaimAt,
            userStake.referrer,
            userStake.isRegistered
        );
    }

    /**
     * @dev Get user's referrals
     * @param user User address to get referrals for
     * @return Array of addresses referred by user
     */
    function getUserReferrals(address user) external view returns (address[] memory) {
        return referrals[user];
    }

    /**
     * @dev Get user's referral count
     * @param user User address to get referral count for
     * @return Number of referrals
     */
    function getReferralCount(address user) external view returns (uint256) {
        return referrals[user].length;
    }

    /**
     * @dev Check if an address is unlocked for unstaking
     * @param user User address to check
     * @return Whether user can unstake without penalty
     */
    function isUnlocked(address user) external view returns (bool) {
        return block.timestamp >= userStakes[user].stakedAt + lockDuration;
    }

    /**
     * @dev Get time remaining until user can unstake without penalty
     * @param user User address to check
     * @return Time remaining in seconds, 0 if already unlocked
     */
    function timeUntilUnlock(address user) external view returns (uint256) {
        uint256 unlockTime = userStakes[user].stakedAt + lockDuration;
        if (block.timestamp >= unlockTime) {
            return 0;
        }
        return unlockTime - block.timestamp;
    }

    /**
     * @dev Update staking parameters (onlyOwner)
     * @param _lockDuration New lock duration
     * @param _earlyWithdrawalPenalty New early withdrawal penalty
     * @param _referralRewardRate New referral reward rate
     * @param _rewardRate New reward rate (APY)
     */
    function updateParameters(
        uint256 _lockDuration,
        uint256 _earlyWithdrawalPenalty,
        uint256 _referralRewardRate,
        uint256 _rewardRate
    ) external onlyOwner {
        lockDuration = _lockDuration;
        earlyWithdrawalPenalty = _earlyWithdrawalPenalty;
        referralRewardRate = _referralRewardRate;
        rewardRate = _rewardRate;
    }

    /**
     * @dev Emergency function to recover tokens sent to this contract by mistake
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        require(token != address(stakingToken), "Cannot withdraw staking token");
        IERC20(token).safeTransfer(owner(), amount);
    }
}