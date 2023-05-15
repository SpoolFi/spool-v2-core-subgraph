import {dataSource} from "@graphprotocol/graph-ts";

import {
    RewardAdded,
    RewardExtended,
    RewardRemoved,
    RewardManagerContract
} from "../generated/RewardManager/RewardManagerContract";

import {
    SmartVault,
    SmartVaultRewardToken,
    SmartVaultRewardTokenUpdate,
} from "../generated/schema";

import {
    createTokenEntity,
    logEventName,
    getComposedId,
    getTokenDecimalAmountFromAddress,
    ZERO_BD,
    ZERO_BI,
    integerToDecimal,
} from "./utils/helpers";

const ADD_REWARD = "ADD_REWARD";
const EXTEND_REWARD = "EXTEND_REWARD";
const REMOVE_TOKEN = "REMOVE_TOKEN";

// newly added or endTime was reached and new rewards were added
export function handleRewardAdded(event: RewardAdded): void {
    logEventName("handleRewardAdded", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    let smartVaultRewardToken = getSmartVaultRewardToken(smartVaultAddress, event.params.token.toHexString());
    let smartVaultRewardTokenUpdate = getSmartVaultRewardTokenUpdate(
        smartVaultAddress,
        smartVaultRewardToken.token,
        smartVaultRewardToken.updatesCount
    );

    let vaultContract = RewardManagerContract.bind(event.address);
    let rewardToken = vaultContract.rewardConfiguration(event.params.smartVault, event.params.token);
    let tokenAmountAdded = getTokenDecimalAmountFromAddress(
        event.params.amount,
        smartVaultRewardToken.token
    );

    // SmartVaultRewardToken
    if (smartVaultRewardToken.startTime.isZero()) {
        smartVaultRewardToken.startTime = event.block.timestamp;
    }

    smartVaultRewardToken.updatedOn = event.block.timestamp;
    smartVaultRewardToken.endTime = rewardToken.value1;
    smartVaultRewardToken.totalAmount = tokenAmountAdded;
    smartVaultRewardToken.rewardRate = rewardToken.value2;
    smartVaultRewardToken.isRemoved = false;
    smartVaultRewardToken.updatesCount++;
    smartVaultRewardToken.save();

    // SmartVaultRewardTokenUpdate
    smartVaultRewardTokenUpdate.createdOn = event.block.timestamp;
    smartVaultRewardTokenUpdate.amount = tokenAmountAdded;
    smartVaultRewardTokenUpdate.leftoverAmount = ZERO_BD;
    smartVaultRewardTokenUpdate.endTime = rewardToken.value1;
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
    smartVaultRewardTokenUpdate.updateType = EXTEND_REWARD;
    smartVaultRewardTokenUpdate.endTime = event.params.periodFinish;
    smartVaultRewardTokenUpdate.amount = tokenAmountAdded;
    smartVaultRewardTokenUpdate.leftoverAmount = integerToDecimal(
        event.params.leftover,
        createTokenEntity(smartVaultRewardToken.token).decimals + 18 // add 18 decimals to token decimals as it includes REWARD_ACCURACY multiplier
    );

    let vaultContract = RewardManagerContract.bind(event.address);

    let rewardToken = vaultContract.rewardConfiguration(event.params.smartVault, event.params.token);

    // SmartVaultRewardToken
    smartVaultRewardToken.updatedOn = event.block.timestamp;
    smartVaultRewardToken.endTime = event.params.periodFinish;
    smartVaultRewardToken.totalAmount = smartVaultRewardToken.totalAmount.plus(tokenAmountAdded);
    smartVaultRewardToken.rewardRate = rewardToken.value2;
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
    smartVaultRewardTokenUpdate.endTime = event.block.timestamp;
    smartVaultRewardTokenUpdate.updateType = REMOVE_TOKEN;

    smartVaultRewardTokenUpdate.save();
    smartVaultRewardToken.save();
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

        smartVaultRewardToken.save();
    }

    return smartVaultRewardToken;
}

export function getSmartVaultByAddress(address: string): SmartVault {
    return SmartVault.load(address)!;
}
