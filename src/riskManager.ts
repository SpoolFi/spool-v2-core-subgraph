import {BigInt} from "@graphprotocol/graph-ts";
import {
    RiskScoresUpdated,
    AllocationProviderSet,
    RiskProviderSet,
    RiskToleranceSet,
} from "../generated/RiskManager/RiskManagerContract";
import {StrategyRiskScore} from "../generated/schema";
import {
    ZERO_BD,
    ZERO_BI,
    getComposedId,
    getSmartVault,
    logEventName,
    strategyRiskScoreToDecimal,
} from "./utils/helpers";
import {getStrategy} from "./strategyRegistry";

export function handleRiskScoresUpdated(event: RiskScoresUpdated): void {
    logEventName("handleRiskScoresUpdated", event);

    let strategies = event.params.strategies;
    let riskScores = event.params.riskScores;

    for (let i = 0; i < riskScores.length; i++) {
        let strategy = getStrategy(strategies[i].toHexString());
        let strategyRiskScore = getStrategyRiskScore(
            strategy.id,
            event.params.riskProvider.toHexString()
        );
        strategyRiskScore.riskScore = strategyRiskScoreToDecimal(BigInt.fromI32(riskScores[i]));
        strategyRiskScore.updatedOn = event.block.timestamp;
        strategyRiskScore.save();
    }
}

export function handleAllocationProviderSet(event: AllocationProviderSet): void {
    let smartVault = getSmartVault(event.params.smartVault.toHexString());
    smartVault.allocationProvider = event.params.allocationProvider.toHexString();
    smartVault.save();
}

export function handleRiskProviderSet(event: RiskProviderSet): void {
    let smartVault = getSmartVault(event.params.smartVault.toHexString());
    smartVault.riskProvider = event.params.riskProvider.toHexString();
    smartVault.save();
}

export function handleRiskToleranceSet(event: RiskToleranceSet): void {
    let smartVault = getSmartVault(event.params.smartVault.toHexString());
    smartVault.riskTolerance = event.params.riskTolerance;
    smartVault.save();
}

function getStrategyRiskScore(
    strategyAddress: string,
    riskProviderAddress: string
): StrategyRiskScore {
    let strategyRiskScoreId = getComposedId(strategyAddress, riskProviderAddress);
    let strategyRiskScore = StrategyRiskScore.load(strategyRiskScoreId);

    if (strategyRiskScore == null) {
        strategyRiskScore = new StrategyRiskScore(strategyRiskScoreId);
        strategyRiskScore.strategy = strategyAddress;
        strategyRiskScore.riskProvider = riskProviderAddress;
        strategyRiskScore.riskScore = ZERO_BD;
        strategyRiskScore.updatedOn = ZERO_BI;
        strategyRiskScore.save();
    }

    return strategyRiskScore;
}
