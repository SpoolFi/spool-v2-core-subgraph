import {
    RewardAdded,
    RewardExtended,
    RewardRemoved,
    RewardsClaimed,
    PoolRootAdded,
    PoolRootUpdated,
} from "../generated/RewardManager/RewardManagerContract";

import {
    Cycle,
    SmartVault,
    SmartVaultRewardToken,
    SmartVaultRewardTokenUpdate,
    UserSmartVault,
    UserSmartVaultRewardToken,
    UserSmartVaultRewardTokenCycle,
} from "../generated/schema";
import {setAnalyticsUserRewardClaim} from "./analyticsUser";

import {
    createTokenEntity,
    logEventName,
    getComposedId,
    getTokenDecimalAmountFromAddress,
    ZERO_BD,
    ZERO_BI,
    integerToDecimal,
    getUser,
    getSmartVault,
} from "./utils/helpers";

const ADD_REWARD = "ADD_REWARD";
const EXTEND_REWARD = "EXTEND_REWARD";
const REMOVE_TOKEN = "REMOVE_TOKEN";

// newly added or endTime was reached and new rewards were added
export function handleRewardAdded(event: RewardAdded): void {
    logEventName("handleRewardAdded", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    let periodFinish = event.block.timestamp.plus(event.params.duration);

    let smartVaultRewardToken = getSmartVaultRewardToken(smartVaultAddress, event.params.token.toHexString());
    let smartVaultRewardTokenUpdate = getSmartVaultRewardTokenUpdate(
        smartVaultAddress,
        smartVaultRewardToken.token,
        smartVaultRewardToken.updatesCount
    );

    let tokenAmountAdded = getTokenDecimalAmountFromAddress(
        event.params.amount,
        smartVaultRewardToken.token
    );

    // SmartVaultRewardToken
    if (smartVaultRewardToken.startTime.isZero()) {
        smartVaultRewardToken.startTime = event.block.timestamp;
    }

    smartVaultRewardToken.updatedOn = event.block.timestamp;
    smartVaultRewardToken.endTime = periodFinish;
    smartVaultRewardToken.totalAmount = tokenAmountAdded;
    smartVaultRewardToken.rewardRate = event.params.rewardRate;
    smartVaultRewardToken.isRemoved = false;
    smartVaultRewardToken.updatesCount++;
    smartVaultRewardToken.save();

    // SmartVaultRewardTokenUpdate
    smartVaultRewardTokenUpdate.createdOn = event.block.timestamp;
    smartVaultRewardTokenUpdate.blockNumber = event.block.number;
    smartVaultRewardTokenUpdate.amount = tokenAmountAdded;
    smartVaultRewardTokenUpdate.leftoverAmount = ZERO_BD;
    smartVaultRewardTokenUpdate.endTime = periodFinish;
    smartVaultRewardTokenUpdate.rewardRate = event.params.rewardRate;
    smartVaultRewardTokenUpdate.updateType = ADD_REWARD;

    smartVaultRewardTokenUpdate.save();
}

export function handleRewardExtended(event: RewardExtended): void {
    logEventName("handleRewardExtended", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    let smartVaultRewardToken = getSmartVaultRewardToken(smartVaultAddress, event.params.token.toHexString());
    let smartVaultRewardTokenUpdate = getSmartVaultRewardTokenUpdate(
        smartVaultAddress,
        smartVaultRewardToken.token,
        smartVaultRewardToken.updatesCount
    );

    let tokenAmountAdded = getTokenDecimalAmountFromAddress(
        event.params.amount,
        smartVaultRewardToken.token
    );

    // SmartVaultRewardTokenUpdate
    smartVaultRewardTokenUpdate.createdOn = event.block.timestamp;
    smartVaultRewardTokenUpdate.blockNumber = event.block.number;
    smartVaultRewardTokenUpdate.updateType = EXTEND_REWARD;
    smartVaultRewardTokenUpdate.endTime = event.params.periodFinish;
    smartVaultRewardTokenUpdate.amount = tokenAmountAdded;
    smartVaultRewardTokenUpdate.rewardRate = event.params.rewardRate;
    smartVaultRewardTokenUpdate.leftoverAmount = integerToDecimal(
        event.params.leftover,
        createTokenEntity(smartVaultRewardToken.token).decimals + 18 // add 18 decimals to token decimals as it includes REWARD_ACCURACY multiplier
    );

    // SmartVaultRewardToken
    smartVaultRewardToken.updatedOn = event.block.timestamp;
    smartVaultRewardToken.endTime = event.params.periodFinish;
    smartVaultRewardToken.totalAmount = smartVaultRewardToken.totalAmount.plus(tokenAmountAdded);
    smartVaultRewardToken.rewardRate = event.params.rewardRate;
    smartVaultRewardToken.updatesCount++;

    smartVaultRewardTokenUpdate.save();
    smartVaultRewardToken.save();
}

export function handleRewardRemoved(event: RewardRemoved): void {
    logEventName("handleRewardRemoved", event);

    let smartVaultAddress = event.params.smartVault.toHexString();
    let smartVaultRewardToken = getSmartVaultRewardToken(smartVaultAddress, event.params.token.toHexString());

    // SmartVaultRewardToken
    smartVaultRewardToken.updatedOn = event.block.timestamp;
    smartVaultRewardToken.rewardRate = ZERO_BI;
    smartVaultRewardToken.isRemoved = true;
    smartVaultRewardToken.updatesCount++;

    // SmartVaultRewardTokenUpdate
    let smartVaultRewardTokenUpdate = getSmartVaultRewardTokenUpdate(
        smartVaultAddress,
        smartVaultRewardToken.token,
        smartVaultRewardToken.updatesCount
    );
    smartVaultRewardTokenUpdate.createdOn = event.block.timestamp;
    smartVaultRewardTokenUpdate.blockNumber = event.block.number;
    smartVaultRewardTokenUpdate.endTime = event.block.timestamp;
    smartVaultRewardTokenUpdate.rewardRate = ZERO_BI;
    smartVaultRewardTokenUpdate.updateType = REMOVE_TOKEN;

    smartVaultRewardTokenUpdate.save();
    smartVaultRewardToken.save();
}

export function handleRewardsClaimed(event: RewardsClaimed): void {
    logEventName("handleRewardsClaimed", event);

    let smartVaultAddress = event.params.smartVault.toHexString();
    let userAddress = event.params.user.toHexString();
    let rewardTokenAddress = event.params.token.toHexString();
    let cycleId = event.params.cycle.toI32();
    let claimed = getTokenDecimalAmountFromAddress(event.params.amount, rewardTokenAddress);

    getUserSmartVault(userAddress, smartVaultAddress);

    let smartVaultRewardToken = getSmartVaultRewardToken(smartVaultAddress, rewardTokenAddress);
    let userSmartVaultRewardToken = getUserSmartVaultRewardToken(userAddress, smartVaultAddress, rewardTokenAddress);
    let cycle = getCycle(cycleId);
    let userSmartVaultRewardTokenCycle = getUserSmartVaultRewardTokenCycle(userSmartVaultRewardToken.id, cycle);

    smartVaultRewardToken.claimed = smartVaultRewardToken.claimed.plus(claimed);
    userSmartVaultRewardToken.claimed = userSmartVaultRewardToken.claimed.plus(claimed);
    userSmartVaultRewardTokenCycle.claimed = claimed;

    smartVaultRewardToken.save();
    userSmartVaultRewardToken.save();
    userSmartVaultRewardTokenCycle.save();

    setAnalyticsUserRewardClaim(event);
}

export function handlePoolRootAdded(event: PoolRootAdded): void {
    logEventName("handlePoolRootAdded", event);

    let cycle = getCycle(event.params.cycle.toI32());

    cycle.root = event.params.root.toHexString();

    cycle.save();
}

export function handlePoolRootUpdated(event: PoolRootUpdated): void {
    logEventName("handlePoolRootUpdated", event);

    let cycle = getCycle(event.params.cycle.toI32());

    cycle.root = event.params.newRoot.toHexString();
    cycle.previousRoots.push(event.params.previousRoot.toHexString());

    cycle.save();
}

function getSmartVaultRewardTokenUpdate(
    smartVaultAddress: string,
    tokenAddress: string,
    updateId: i32
): SmartVaultRewardTokenUpdate {
    let smartVaultRewardTokenUpdate = SmartVaultRewardTokenUpdate.load(
        getComposedId(smartVaultAddress, tokenAddress, updateId.toString())
    );

    if (!smartVaultRewardTokenUpdate) {
        smartVaultRewardTokenUpdate = new SmartVaultRewardTokenUpdate(
            getComposedId(smartVaultAddress, tokenAddress, updateId.toString())
        );
        smartVaultRewardTokenUpdate.smartVaultRewardToken = getComposedId(smartVaultAddress, tokenAddress);
        smartVaultRewardTokenUpdate.updateId = updateId;
    }

    return smartVaultRewardTokenUpdate;
}

function getSmartVaultRewardToken(smartVaultAddress: string, rewardTokenAddress: string): SmartVaultRewardToken {
    let smartVaultRewardToken = SmartVaultRewardToken.load(getComposedId(smartVaultAddress, rewardTokenAddress));

    if (smartVaultRewardToken == null) {
        smartVaultRewardToken = new SmartVaultRewardToken(getComposedId(smartVaultAddress, rewardTokenAddress));
        smartVaultRewardToken.smartVault = smartVaultAddress;
        let token = createTokenEntity(rewardTokenAddress);
        smartVaultRewardToken.token = token.id;

        smartVaultRewardToken.updatedOn = ZERO_BI;
        smartVaultRewardToken.startTime = ZERO_BI;
        smartVaultRewardToken.endTime = ZERO_BI;
        smartVaultRewardToken.totalAmount = ZERO_BD;
        smartVaultRewardToken.isRemoved = false;
        smartVaultRewardToken.rewardRate = ZERO_BI;
        smartVaultRewardToken.updatesCount = 0;
        smartVaultRewardToken.claimed = ZERO_BD;

        smartVaultRewardToken.save();
    }

    return smartVaultRewardToken;
}


export function getSmartVaultByAddress(address: string): SmartVault {
    return SmartVault.load(address)!;
}


export function getUserSmartVault(userAddress: string, smartVaultAddress: string): UserSmartVault {
    const id = getComposedId(userAddress, smartVaultAddress);
    let userSmartVault = UserSmartVault.load(id);

    if (userSmartVault == null) {
        userSmartVault = new UserSmartVault(id);
        userSmartVault.user = getUser(userAddress).id;
        userSmartVault.smartVault = getSmartVault(smartVaultAddress).id;
        userSmartVault.svtBalance = ZERO_BD;
        
        userSmartVault.save();
    }

    return userSmartVault;
}

function getUserSmartVaultRewardToken(userAddress: string, smartVaultAddress: string, rewardTokenAddress: string): UserSmartVaultRewardToken {
    const id = getComposedId(userAddress, smartVaultAddress, rewardTokenAddress);
    let userSmartVaultReward = UserSmartVaultRewardToken.load(id);

    if (userSmartVaultReward == null) {
        userSmartVaultReward = new UserSmartVaultRewardToken(id);
        userSmartVaultReward.userSmartVault = getComposedId(userAddress, smartVaultAddress);
        userSmartVaultReward.smartVaultRewardToken = getSmartVaultRewardToken(smartVaultAddress, rewardTokenAddress).id;
        userSmartVaultReward.claimed = ZERO_BD;

        userSmartVaultReward.save();
    }

    return userSmartVaultReward;
}


function getUserSmartVaultRewardTokenCycle(userSmartVaultRewardTokenId: string, cycle: Cycle): UserSmartVaultRewardTokenCycle {
    const id = getComposedId(userSmartVaultRewardTokenId, cycle.id.toString());
    let userSmartVaultRewardTokenCycle = UserSmartVaultRewardTokenCycle.load(id);

    if (userSmartVaultRewardTokenCycle == null) {
        userSmartVaultRewardTokenCycle = new UserSmartVaultRewardTokenCycle(id);
        userSmartVaultRewardTokenCycle.userSmartVaultRewardToken = userSmartVaultRewardTokenId;
        userSmartVaultRewardTokenCycle.cycle = cycle.id;
        userSmartVaultRewardTokenCycle.claimed = ZERO_BD;

        userSmartVaultRewardTokenCycle.save();
    }

    return userSmartVaultRewardTokenCycle;
}

function getCycle(cycleId: i32): Cycle {
    let cycle = Cycle.load(cycleId.toString());

    if (cycle == null) {
        cycle = new Cycle(cycleId.toString());
        cycle.previousRoots = [];
        cycle.cycleCount = 0;
        cycle.root = "";

        cycle.save();
    }

    return cycle;
}








