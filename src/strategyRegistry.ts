import {Address} from "@graphprotocol/graph-ts";
import {
    StrategyApyUpdated,
    StrategyRegistered,
    StrategyDhw as StrategyDhwEvent,
    StrategyRemoved,
    EcosystemFeeSet,
    TreasuryFeeSet,
    EcosystemFeeReceiverSet,
    TreasuryFeeReceiverSet,
    StrategySharesRedeemed,
    StrategySharesFastRedeemed
} from "../generated/StrategyRegistry/StrategyRegistryContract";
import {StrategyContract} from "../generated/StrategyRegistry/StrategyContract";

import {SSTRedemptionAsset, StrategyRegistry, Strategy, StrategyDHW, StrategyDHWAssetDeposit, Token, User, Global, StrategyFastRedeem, StrategyFastRedeemAsset} from "../generated/schema";
import {Strategy as StrategyTemplate} from "../generated/templates";
import {ZERO_BD, ZERO_BI, strategyApyToDecimal, logEventName, getComposedId, GHOST_STRATEGY_ADDRESS, ZERO_ADDRESS, getUser, createTokenEntity, percenti32ToDecimal, percentToDecimal} from "./utils/helpers";

import {getAssetGroup, getAssetGroupTokenById} from "./assetGroupRegistry";

export function handleStrategyRegistered(event: StrategyRegistered): void {
    logEventName("handleStrategyRegistered", event);

    let strategy = getStrategy(event.params.strategy.toHexString());

    strategy.lastDoHardWorkTime = event.block.timestamp;
    strategy.addedOn = event.block.timestamp;
    strategy.addedOnBlock = event.block.number;
    strategy.save();

    // create strategy template
    StrategyTemplate.create(event.params.strategy);
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
    strategyDhw.txHash = event.block.hash.toHexString();
    strategyDhw.apy = strategyApyToDecimal(event.params.dhwInfo.yieldPercentage);
    strategyDhw.ssts = event.params.dhwInfo.totalSstsAtDhw;
    strategyDhw.save();

    let strategy = getStrategy(event.params.strategy.toHexString());
    strategy.lastDoHardWorkTime = event.block.timestamp;
    strategy.lastDoHardWorkIndex = event.params.dhwIndex.toI32();
    strategy.lastDoHardWorkBlock = event.block.number.toI32();
    strategy.index = strategy.index + 1;
    strategy.save();

}


export function handleEcosystemFeeSet(event: EcosystemFeeSet): void {
    logEventName("handleEcosystemFeeSet", event);

    let _global = getGlobal();
    let strategyRegistry = getStrategyRegistry( event.address.toHexString());

    let fee = percentToDecimal(event.params.feePct);

    _global.ecosystemFee = fee;
    strategyRegistry.ecosystemFee = fee;

    _global.save();
    strategyRegistry.save();
}

export function handleTreasuryFeeSet(event: TreasuryFeeSet): void {
    logEventName("handleTreasuryFeeSet", event);

    let _global = getGlobal();
    let strategyRegistry = getStrategyRegistry( event.address.toHexString());

    let fee = percentToDecimal(event.params.feePct);

    _global.treasuryFee = fee;
    strategyRegistry.treasuryFee = fee;

    _global.save();
    strategyRegistry.save();

}

export function handleEcosystemFeeReceiverSet(event: EcosystemFeeReceiverSet): void {
    logEventName("handleEcosystemFeeReceiverSet", event);

    let strategyRegistry = getStrategyRegistry( event.address.toHexString());

    strategyRegistry.ecosystemFeeReceiver = getUser( event.params.ecosystemFeeReceiver.toHexString() ).id;

    strategyRegistry.save();
}

export function handleTreasuryFeeReceiverSet(event: TreasuryFeeReceiverSet): void {
    logEventName("handleTreasuryFeeReceiverSet", event);

    let strategyRegistry = getStrategyRegistry( event.address.toHexString());

    strategyRegistry.treasuryFeeReceiver = getUser( event.params.treasuryFeeReceiver.toHexString() ).id;

    strategyRegistry.save();
}

export function handleStrategySharesRedeemed(event: StrategySharesRedeemed): void {
    logEventName("handleStrategySharesRedeemed", event);

    let owner = getUser(event.params.owner.toHexString());
    let strategy = getStrategy(event.params.strategy.toHexString());
    let assetGroup = getAssetGroup(strategy.assetGroup);
    let assetAmounts = event.params.assetsWithdrawn;
    let assetGroupTokens = assetGroup.assetGroupTokens;

    for(let i = 0; i < assetGroupTokens.length; i++) {
        let assetGroupToken = getAssetGroupTokenById(assetGroupTokens[i]);
        let asset = createTokenEntity(assetGroupToken.token);

        let sstRedemptionAsset = getSSTRedemptionAsset(owner, asset);

        sstRedemptionAsset.claimed = sstRedemptionAsset.claimed.plus(assetAmounts[i].toBigDecimal());
        sstRedemptionAsset.save();
    }
}

export function handleStrategySharesFastRedeemed(event: StrategySharesFastRedeemed): void {
    logEventName("handleStrategySharesFastRedeemed", event);

    let strategy = getStrategy(event.params.strategy.toHexString());
    let strategyFastRedeem = getStrategyFastRedeem(strategy, strategy.fastRedeemCount);

    strategyFastRedeem.blockNumber = event.block.number;
    strategyFastRedeem.createdOn = event.block.timestamp;
    strategyFastRedeem.sstWithdrawn = event.params.shares;
    strategyFastRedeem.save();

    let assetGroup = getAssetGroup(strategy.assetGroup);
    let assetAmounts = event.params.assetsWithdrawn;
    let assetGroupTokens = assetGroup.assetGroupTokens;

    for(let i = 0; i < assetGroupTokens.length; i++) {
        let assetGroupToken = getAssetGroupTokenById(assetGroupTokens[i]);
        let asset = createTokenEntity(assetGroupToken.token);
        let strategyFastRedeemAsset = getStrategyFastRedeemAsset(strategyFastRedeem, asset);
        strategyFastRedeemAsset.claimed = assetAmounts[i].toBigDecimal();
        strategyFastRedeemAsset.save();
    }

    strategy.fastRedeemCount = strategy.fastRedeemCount + 1;
    strategy.save();
}

export function strategyContractExists(strategyAddress: string): boolean {
    let strategy = Strategy.load(strategyAddress);

    if (strategy == null) {
        let strategyContract = StrategyContract.bind(Address.fromString(strategyAddress));

        strategy = new Strategy(strategyAddress);
        let nameCall = strategyContract.try_strategyName();
        return !nameCall.reverted;
    }

    return true;
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
        strategy.lastDoHardWorkIndex = 0;
        strategy.lastDoHardWorkBlock = 0;
        strategy.isRemoved = false;
        strategy.isGhost = false;
        strategy.addedOn = ZERO_BI;
        strategy.addedOnBlock = ZERO_BI;
        strategy.sstTotalSupply = ZERO_BI;
        strategy.totalPlatformFeesCollected = ZERO_BI;
        strategy.fastRedeemCount = 0;
        strategy.save();
    }

    return strategy;
}


export function getGhostStrategy(): Strategy {
    let strategyAddress = GHOST_STRATEGY_ADDRESS.toHexString();
    let strategy = Strategy.load(strategyAddress);

    if (strategy == null) {
        strategy = new Strategy(strategyAddress);
        strategy.name = "Ghost strategy";
        strategy.assetGroup = getAssetGroup("0").id;
        strategy.apy = ZERO_BD;
        strategy.index = 1;
        strategy.lastDoHardWorkTime = ZERO_BI;
        strategy.lastDoHardWorkIndex = 0;
        strategy.lastDoHardWorkBlock = 0;
        strategy.isRemoved = false;
        strategy.isGhost = true;
        strategy.addedOn = ZERO_BI;
        strategy.addedOnBlock = ZERO_BI;
        strategy.sstTotalSupply = ZERO_BI;
        strategy.totalPlatformFeesCollected = ZERO_BI;
        strategy.fastRedeemCount = 0;
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
        strategyDhw.sharesRedeemed = ZERO_BI;
        strategyDhw.fastRedeemCount = 0;
        strategyDhw.reallocationCount = 0;
        strategyDhw.platformFeesCollected = ZERO_BI;
        strategyDhw.save();
    }

    return strategyDhw;
}

export function getStrategyDHWAssetDeposit(
    strategyDHW: StrategyDHW,
    asset: Token
): StrategyDHWAssetDeposit {

    let strategyDhwAssetDepositId = getComposedId(strategyDHW.id, asset.id);
    let strategyDhwAssetDeposit = StrategyDHWAssetDeposit.load(strategyDhwAssetDepositId);

    if (strategyDhwAssetDeposit == null) {
        strategyDhwAssetDeposit = new StrategyDHWAssetDeposit(strategyDhwAssetDepositId);
        strategyDhwAssetDeposit.strategyDHW = strategyDHW.id;
        strategyDhwAssetDeposit.asset = asset.id;
        strategyDhwAssetDeposit.amount = ZERO_BI;
        strategyDhwAssetDeposit.save();
    }

    return strategyDhwAssetDeposit;
}


export function getStrategyRegistry(strategyRegistryAddress: string): StrategyRegistry {
    let strategyRegistry = StrategyRegistry.load(strategyRegistryAddress);

    if (strategyRegistry == null) {
        strategyRegistry = new StrategyRegistry(strategyRegistryAddress);
        strategyRegistry.ecosystemFeeReceiver = ZERO_ADDRESS.toHexString();
        strategyRegistry.treasuryFeeReceiver = ZERO_ADDRESS.toHexString();
        strategyRegistry.ecosystemFee = ZERO_BD;
        strategyRegistry.treasuryFee = ZERO_BD;
        strategyRegistry.save();
    }

    return strategyRegistry;

}

export function getStrategyFastRedeem(strategy: Strategy, fastRedeemCount: i32): StrategyFastRedeem {

    let strategyFastRedeemId = getComposedId(strategy.id, fastRedeemCount.toString());

    let strategyFastRedeem = StrategyFastRedeem.load(strategyFastRedeemId);

    if (strategyFastRedeem == null) {
        strategyFastRedeem = new StrategyFastRedeem(strategyFastRedeemId);
        strategyFastRedeem.strategy = strategy.id;
        strategyFastRedeem.count = strategy.fastRedeemCount;
        strategyFastRedeem.blockNumber = ZERO_BI;
        strategyFastRedeem.createdOn = ZERO_BI;
        strategyFastRedeem.sstWithdrawn = ZERO_BI;
        strategyFastRedeem.save();
    }

    return strategyFastRedeem;
}

export function getStrategyFastRedeemAsset(strategyFastRedeem: StrategyFastRedeem, asset: Token): StrategyFastRedeemAsset {

    let strategyFastRedeemAssetId = getComposedId(strategyFastRedeem.id, asset.id);

    let strategyFastRedeemAsset = StrategyFastRedeemAsset.load(strategyFastRedeemAssetId);

    if (strategyFastRedeemAsset == null) {
        strategyFastRedeemAsset = new StrategyFastRedeemAsset(strategyFastRedeemAssetId);
        strategyFastRedeemAsset.strategyFastRedeem = strategyFastRedeem.id;
        strategyFastRedeemAsset.asset = asset.id;
        strategyFastRedeemAsset.claimed = ZERO_BD;
        strategyFastRedeemAsset.save();
    }

    return strategyFastRedeemAsset;
}

export function getSSTRedemptionAsset(user: User, asset: Token): SSTRedemptionAsset {
    let sstRedemptionAssetId = getComposedId(user.id, asset.id);
    let sstRedemptionAsset = SSTRedemptionAsset.load(sstRedemptionAssetId);

    if (sstRedemptionAsset == null) {
        sstRedemptionAsset = new SSTRedemptionAsset(sstRedemptionAssetId);
        sstRedemptionAsset.user = user.id;
        sstRedemptionAsset.asset = asset.id;
        sstRedemptionAsset.claimed = ZERO_BD;
        sstRedemptionAsset.save();
    }

    return sstRedemptionAsset;
}

export function getGlobal(): Global {
    let _global = Global.load("Global");

    if (_global == null) {
        _global = new Global("Global");
        _global.ecosystemFee = ZERO_BD;
        _global.treasuryFee = ZERO_BD;
        _global.save();
    }

    return _global;
}
