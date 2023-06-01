import {Address} from "@graphprotocol/graph-ts";
import {
    StrategyApyUpdated,
    StrategyRegistered,
    StrategyDhw as StrategyDhwEvent
} from "../generated/StrategyRegistry/StrategyRegistryContract";
import {StrategyContract} from "../generated/StrategyRegistry/StrategyContract";

import {Strategy, StrategyDhw} from "../generated/schema";
import {ZERO_BD, ZERO_BI, strategyApyToDecimal, logEventName, getComposedId} from "./utils/helpers";

export function handleStrategyRegistered(event: StrategyRegistered): void {
    logEventName("handleStrategyRegistered", event);

    let strategy = getStrategy(event.params.strategy.toHexString());

    strategy.lastDoHardWorkTime = event.block.number;
    strategy.addedOn = event.block.number;
    strategy.save();
}

export function handleStrategyApyUpdated(event: StrategyApyUpdated): void {
    logEventName("handleStrategyApyUpdated", event);

    let strategy = getStrategy(event.params.strategy.toHexString());

    strategy.apy = strategyApyToDecimal(event.params.apy);
    strategy.save();
}

export function handleStrategyDhw(event: StrategyDhwEvent): void {
    logEventName("handleStrategyDhw", event);

    let strategyDhw = getStrategyDhw(event.params.strategy.toHexString(), event.params.dhwIndex.toI32());

    strategyDhw.timestamp = event.block.timestamp;
    strategyDhw.blockNumber = event.block.number;
    strategyDhw.apy = strategyApyToDecimal(event.params.dhwInfo.yieldPercentage);
    strategyDhw.ssts = event.params.dhwInfo.totalSstsAtDhw;
}

function getStrategy(strategyAddress: string): Strategy {
    let strategy = Strategy.load(strategyAddress);

    if (strategy == null) {
        let strategyContract = StrategyContract.bind(Address.fromString(strategyAddress));

        strategy = new Strategy(strategyAddress);
        strategy.name = strategyContract.strategyName();
        strategy.assetGroup = strategyContract.assetGroupId().toString();
        strategy.apy = ZERO_BD;
        strategy.index = 1;
        strategy.lastDoHardWorkTime = ZERO_BI;
        strategy.isRemoved = false;
        strategy.addedOn = ZERO_BI;
        strategy.save();
    }

    return strategy;
}

function getStrategyDhw(strategyAddress: string, strategyDwhIndex: i32): StrategyDhw {
    let strategyDhwId = getComposedId(strategyAddress, strategyDwhIndex.toString());

    let strategyDhw = StrategyDhw.load(strategyDhwId);

    if (strategyDhw == null) {
        strategyDhw = new StrategyDhw(strategyDhwId);
        strategyDhw.strategy = strategyAddress;
        strategyDhw.index = strategyDwhIndex;
        strategyDhw.timestamp = ZERO_BI;
        strategyDhw.blockNumber = ZERO_BI;
        strategyDhw.apy = ZERO_BD;
        strategyDhw.ssts = ZERO_BI;
        strategyDhw.save();
    }

    return strategyDhw;
}
