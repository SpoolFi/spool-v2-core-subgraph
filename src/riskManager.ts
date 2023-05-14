import { BigInt } from "@graphprotocol/graph-ts";
import {RiskScoresUpdated} from "../generated/RiskManager/RiskManagerContract";
import {StrategyRiskScore} from "../generated/schema";
import {ZERO_BD, ZERO_BI, getComposedId, logEventName, strategyRiskScoreToDecimal} from "./utils/helpers";

export function handleRiskScoresUpdated(event: RiskScoresUpdated): void {
    logEventName("handleRiskScoresUpdated", event);

    let strategies = event.params.strategies;
    let riskScores = event.params.riskScores;

    for (let i = 0; i < riskScores.length; i++) {
        let strategyRiskScore = getStrategyRiskScore(
            strategies[i].toHexString(),
            event.params.riskProvider.toHexString()
        );
        strategyRiskScore.riskScore = strategyRiskScoreToDecimal(BigInt.fromI32(riskScores[i]));
        strategyRiskScore.updatedOn = event.block.timestamp;
        strategyRiskScore.save();
    }
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
