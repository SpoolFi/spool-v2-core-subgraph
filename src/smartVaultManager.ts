import {Address, BigInt} from "@graphprotocol/graph-ts";
import {
    SmartVaultRegistered,
} from "../generated/SmartVaultManager/SmartVaultManagerContract";
import {SmartVaultContract} from "../generated/SmartVaultManager/SmartVaultContract";

import {SmartVault, SmartVaultFees, SmartVaultStrategy} from "../generated/schema";
import {ZERO_BD, ZERO_BI, logEventName, ZERO_ADDRESS, getComposedId, percenti32ToDecimal} from "./utils/helpers";

export function handleSmartVaultRegistered(event: SmartVaultRegistered): void {
    logEventName("handleSmartVaultRegistered", event);

    let smartVault = getSmartVault(event.params.smartVault.toHexString());

    smartVault.assetGroup = event.params.registrationForm.assetGroupId.toString();
    smartVault.createdOn = event.block.number;

    let strategiesArray = smartVault.smartVaultStrategies;

    let strategies = event.params.registrationForm.strategies;
    let strategyAllocation = event.params.registrationForm.strategyAllocation;

    let allocationMask = BigInt.fromI32(2 ** 16 - 1);
    for (let i = 0; i < strategies.length; i++) {
        strategiesArray.push(strategies[i].toHexString());

        let allocation = strategyAllocation.leftShift(u8(i * 16)).bitAnd(allocationMask);

        let smartVaultStrategy = getSmartVaultStrategy(smartVault.id, strategies[i].toHexString());
        smartVaultStrategy.allocation = allocation;
        smartVaultStrategy.save();
    }

    smartVault.smartVaultStrategies = strategiesArray;

    smartVault.save();

    let smartVaultFees = getSmartVaultFees(event.params.smartVault.toHexString());
    smartVaultFees.peformanceFeePercentage = percenti32ToDecimal(event.params.registrationForm.performanceFeePct);
    smartVaultFees.depositFeePercentage = percenti32ToDecimal(event.params.registrationForm.depositFeePct);
    smartVaultFees.managementFeePercentage = percenti32ToDecimal(event.params.registrationForm.managementFeePct);
    smartVaultFees.save();
}

function getSmartVault(smartVaultAddress: string): SmartVault {
    let smartVault = SmartVault.load(smartVaultAddress);

    if (smartVault == null) {
        let smartVaultContract = SmartVaultContract.bind(
            Address.fromString(smartVaultAddress)
        );

        let smartVaultFees = getSmartVaultFees(smartVaultAddress);

        smartVault = new SmartVault(smartVaultAddress);
        smartVault.name = smartVaultContract.vaultName();
        smartVault.riskTolerance = 0;
        smartVault.assetGroup = "1";
        smartVault.smartVaultCreator = ZERO_ADDRESS.toHexString();
        smartVault.smartVaultOwner = ZERO_ADDRESS.toHexString();
        smartVault.riskProvider = ZERO_ADDRESS.toHexString(); // NOTE: will probably fail if set as 0
        smartVault.createdOn = ZERO_BI;
        smartVault.smartVaultFees = smartVaultFees.id;
        smartVault.smartVaultStrategies = [];
        smartVault.save();
    }

    return smartVault;
}

function getSmartVaultFees(smartVaultAddress: string): SmartVaultFees {
    let smartVaultFees = SmartVaultFees.load(smartVaultAddress);

    if (smartVaultFees == null) {
        smartVaultFees = new SmartVaultFees(smartVaultAddress);
        smartVaultFees.peformanceFeePercentage = ZERO_BD;
        smartVaultFees.depositFeePercentage = ZERO_BD;
        smartVaultFees.managementFeePercentage = ZERO_BD;
        smartVaultFees.save();
    }

    return smartVaultFees;
}

function getSmartVaultStrategy(smartVaultAddress: string, strategyAddress: string): SmartVaultStrategy {
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
