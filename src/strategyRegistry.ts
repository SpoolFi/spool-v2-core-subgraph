import {Address} from "@graphprotocol/graph-ts";
import {
    StrategyApyUpdated,
    StrategyRegistered,
    StrategyDhw as StrategyDhwEvent,
    StrategyRemoved
} from "../generated/StrategyRegistry/StrategyRegistryContract";
import {StrategyContract} from "../generated/StrategyRegistry/StrategyContract";

import {Strategy, StrategyDHW} from "../generated/schema";
import {ZERO_BD, ZERO_BI, strategyApyToDecimal, logEventName, getComposedId, GHOST_STRATEGY_ADDRESS} from "./utils/helpers";

export function handleStrategyRegistered(event: StrategyRegistered): void {
    logEventName("handleStrategyRegistered", event);

    let strategy = getStrategy(event.params.strategy.toHexString());

    strategy.lastDoHardWorkTime = event.block.number;
    strategy.addedOn = event.block.number;
    strategy.save();
}

export function handleStrategyRemoved(event: StrategyRemoved): void {
    logEventName("handleStrategyRemoved", event);

    let strategy = getStrategy(event.params.strategy.toHexString());

    strategy.isRemoved = true;
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

    let strategyDhw = getStrategyDHW(event.params.strategy.toHexString(), event.params.dhwIndex.toI32());

    strategyDhw.isExecuted = true;
    strategyDhw.timestamp = event.block.timestamp;
    strategyDhw.blockNumber = event.block.number;
    strategyDhw.apy = strategyApyToDecimal(event.params.dhwInfo.yieldPercentage);
    strategyDhw.ssts = event.params.dhwInfo.totalSstsAtDhw;
    strategyDhw.save();
}

export function getStrategy(strategyAddress: string): Strategy {
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
        strategy.isGhost = false;
        strategy.addedOn = ZERO_BI;
        strategy.save();
    }

    return strategy;
}


export function getGhostStrategy(): Strategy {
    let strategyAddress = GHOST_STRATEGY_ADDRESS.toHexString();
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
        strategy.isGhost = true;
        strategy.addedOn = ZERO_BI;
        strategy.save();
    }

    return strategy;
}

export function getStrategyDHW(
    strategyAddress: string,
    strategyindex: i32
): StrategyDHW {
    let strategyDhwId = getComposedId(strategyAddress, strategyindex.toString());
    let strategyDhw = StrategyDHW.load(strategyDhwId);

    if (strategyDhw == null) {
        strategyDhw = new StrategyDHW(strategyDhwId);
        strategyDhw.strategy = strategyAddress;
        strategyDhw.strategyDHWIndex = strategyindex;
        strategyDhw.isExecuted = false;
        strategyDhw.save();
    }

    return strategyDhw;
}
