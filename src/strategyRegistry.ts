import {Address} from "@graphprotocol/graph-ts";
import {
    StrategyApyUpdated,
    StrategyRegistered,
} from "../generated/StrategyRegistry/StrategyRegistryContract";
import {StrategyContract} from "../generated/StrategyRegistry/StrategyContract";

import {Strategy} from "../generated/schema";
import {ZERO_BD, ZERO_BI, strategyApyToDecimal, logEventName} from "./utils/helpers";

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
