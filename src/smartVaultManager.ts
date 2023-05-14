import {Address, BigInt} from "@graphprotocol/graph-ts";
import {SmartVaultRegistered} from "../generated/SmartVaultManager/SmartVaultManagerContract";
import {SmartVaultContract} from "../generated/SmartVaultManager/SmartVaultContract";

import {SmartVault, SmartVaultFees, SmartVaultStrategy} from "../generated/schema";
import {
    ZERO_BD,
    ZERO_BI,
    logEventName,
    ZERO_ADDRESS,
    getComposedId,
    percenti32ToDecimal,
    getSmartVaultFees,
    getSmartVault,
} from "./utils/helpers";

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
