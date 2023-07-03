import {BigInt} from "@graphprotocol/graph-ts";
import {SmartVaultFlushed, SmartVaultManagerContract, SmartVaultRegistered} from "../generated/SmartVaultManager/SmartVaultManagerContract";
import {SmartVaultContract} from "../generated/SmartVaultManager/SmartVaultContract";

import {SmartVaultFlush, SmartVaultStrategy} from "../generated/schema";
import {
    ZERO_BI,
    logEventName,
    getComposedId,
    percenti32ToDecimal,
    getSmartVaultFees,
    getSmartVault,
    getArrayFromUint16a16,
} from "./utils/helpers";
import { getStrategyDHW } from "./strategyRegistry";

export function handleSmartVaultRegistered(event: SmartVaultRegistered): void {
    logEventName("handleSmartVaultRegistered", event);

    let smartVault = getSmartVault(event.params.smartVault.toHexString());

    let smartVaultContract = SmartVaultContract.bind(event.params.smartVault);

    smartVault.name = smartVaultContract.vaultName();

    smartVault.assetGroup = event.params.registrationForm.assetGroupId.toString();
    smartVault.createdOn = event.block.number;

    let strategiesArray = smartVault.smartVaultStrategies;

    let strategies = event.params.registrationForm.strategies;
    let strategyAllocation = event.params.registrationForm.strategyAllocation;

    let allocationMask = BigInt.fromI32(2 ** 16 - 1);
    for (let i = 0; i < strategies.length; i++) {
        let smartVaultStrategy = getSmartVaultStrategy(smartVault.id, strategies[i].toHexString());

        let allocation = strategyAllocation.rightShift(u8(i * 16)).bitAnd(allocationMask);
        smartVaultStrategy.allocation = allocation;

        smartVaultStrategy.save();

        strategiesArray.push(smartVaultStrategy.id);
    }

    smartVault.smartVaultStrategies = strategiesArray;

    smartVault.save();

    let smartVaultFees = getSmartVaultFees(event.params.smartVault.toHexString());
    smartVaultFees.peformanceFeePercentage = percenti32ToDecimal(
        event.params.registrationForm.performanceFeePct
    );
    smartVaultFees.depositFeePercentage = percenti32ToDecimal(
        event.params.registrationForm.depositFeePct
    );
    smartVaultFees.managementFeePercentage = percenti32ToDecimal(
        event.params.registrationForm.managementFeePct
    );
    smartVaultFees.save();
}

export function handleSmartVaultFlushed(event: SmartVaultFlushed): void {
    logEventName("handleSmartVaultFlushed", event);

    let smartVaultFlush = getSmartVaultFlush(event.params.smartVault.toHexString(), event.params.flushIndex);
    smartVaultFlush.isExecuted = true;

    // get strategy DHWs
    let smartVault = getSmartVault(event.params.smartVault.toHexString());
    const smartVaultStrategies = smartVault.smartVaultStrategies;
    let smartVaultManagerContract = SmartVaultManagerContract.bind(event.address);
    let uint16a16Indexes = smartVaultManagerContract.dhwIndexes(event.params.smartVault, event.params.flushIndex);
    let flushIndexes: i32[] = getArrayFromUint16a16(uint16a16Indexes, smartVaultStrategies.length);

    let flushStrategyDhws: string[] = [];
    for (let i = 0; i < smartVaultStrategies.length; i++) {
        let strategyDHW = getStrategyDHW(SmartVaultStrategy.load(smartVaultStrategies[i])!.strategy, flushIndexes[i]);

        flushStrategyDhws.push(strategyDHW.id);
    }

    smartVaultFlush.strategyDHWs = flushStrategyDhws;
    smartVaultFlush.timestamp = event.block.timestamp;
    smartVaultFlush.blockNumber = event.block.number;

    smartVaultFlush.save();
}

export function getSmartVaultFlush(
    smartVaultAddress: string,
    flushId: BigInt
): SmartVaultFlush {
    let smartVaultFlushId = getComposedId(smartVaultAddress, flushId.toString());
    let smartVaultFlush = SmartVaultFlush.load(smartVaultFlushId);

    if (smartVaultFlush == null) {
        smartVaultFlush = new SmartVaultFlush(smartVaultFlushId);
        smartVaultFlush.smartVault = smartVaultAddress;
        smartVaultFlush.flushId = flushId;
        smartVaultFlush.isExecuted = false;
        smartVaultFlush.save();
    }

    return smartVaultFlush;
}

function getSmartVaultStrategy(
    smartVaultAddress: string,
    strategyAddress: string
): SmartVaultStrategy {
    let smartVaultStrategyId = getComposedId(smartVaultAddress, strategyAddress);
    let smartVaultStrategy = SmartVaultStrategy.load(smartVaultStrategyId);

    if (smartVaultStrategy == null) {
        smartVaultStrategy = new SmartVaultStrategy(smartVaultStrategyId);
        smartVaultStrategy.smartVault = smartVaultAddress;
        smartVaultStrategy.strategy = strategyAddress;
        smartVaultStrategy.allocation = ZERO_BI;
        smartVaultStrategy.save();
    }

    return smartVaultStrategy;
}
