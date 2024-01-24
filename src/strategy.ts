import { Transfer } from "../generated/StrategyRegistry/StrategyContract";
import { StrategyUser, StrategyUserStrategy } from "../generated/schema";
import { getStrategy } from "./strategyRegistry";
import { ZERO_ADDRESS, ZERO_BI, getComposedId, logEventName } from "./utils/helpers";

export function getStrategyUser(strategyUserAddress: string): StrategyUser {
    const id = strategyUserAddress;
    let strategyUser = StrategyUser.load(id);

    if (strategyUser == null) {
        // create new strategy user
        strategyUser = new StrategyUser(id);
        strategyUser.save();
    }

    return strategyUser;
}

export function getStrategyUserStrategy(strategyUserAddress: string, strategyAddress: string): StrategyUserStrategy {
    const id = getComposedId(strategyUserAddress, strategyAddress);
    let strategyUserStrategy = StrategyUserStrategy.load(id);

    if (strategyUserStrategy == null) {
        // create new strategy user strategy
        strategyUserStrategy = new StrategyUserStrategy(id);
        strategyUserStrategy.strategyUser = getStrategyUser(strategyUserAddress).id;
        strategyUserStrategy.strategy = getStrategy(strategyAddress).id;
        strategyUserStrategy.sstBalance = ZERO_BI;
        strategyUserStrategy.save();
    }

    return strategyUserStrategy;
}

export function handleTransfer(event: Transfer): void {
    logEventName("handleTransfer", event);

    let strategy = getStrategy(event.address.toHexString());

    let to = event.params.to.toHexString();
    let from = event.params.from.toHexString();
    let amount = event.params.value;

    // update transfer source
    if (from == ZERO_ADDRESS.toHexString()) {
        // tokens minted
        strategy.sstTotalSupply = strategy.sstTotalSupply.plus(amount);
    } else {
        // tokens transferred
        let fromUser = getStrategyUserStrategy(from, strategy.id);
        fromUser.sstBalance = fromUser.sstBalance.minus(amount);
        fromUser.save();
    }

    // update transfer destination
    if (to == ZERO_ADDRESS.toHexString()) {
        // tokens burned
        strategy.sstTotalSupply = strategy.sstTotalSupply.minus(amount);
    } else {
        // tokens transferred
        let toUser = getStrategyUserStrategy(to, strategy.id);
        toUser.sstBalance = toUser.sstBalance.plus(amount);
        toUser.save();
    }

    strategy.save();
}
