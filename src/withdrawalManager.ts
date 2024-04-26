import {BigDecimal, BigInt} from "@graphprotocol/graph-ts";

import {
    FastRedeemInitiated,
    RedeemInitiated, WithdrawalClaimed
} from "../generated/WithdrawalManager/WithdrawalManagerContract";

import {
    FastRedeem,
    SmartVault,
    SmartVaultFastRedeem,
    SmartVaultFastRedeemAsset,
    SmartVaultFlush,
    SmartVaultStrategy,
    SmartVaultWithdrawalNFT,
    SmartVaultWithdrawalNFTAsset,
    StrategyDHW,
    Token,
    WithdrawnVaultShares,
} from "../generated/schema";

import {
    logEventName,
    getComposedId,
    ZERO_BI,
    ZERO_ADDRESS,
    getUser,
    NFT_INITIAL_SHARES,
    getSmartVault,
    createTokenEntity, 
    getTokenDecimalAmountFromAddress, 
    ZERO_BD
} from "./utils/helpers";
import { getSmartVaultFlush } from "./smartVaultManager";
import {getSSTRedemptionAsset, getStrategy, getStrategyDHW, getStrategyFastRedeem, getStrategyFastRedeemAsset} from "./strategyRegistry";
import {getSmartVaultDepositNFT} from "./depositManager";
import {getAssetGroup, getAssetGroupTokenById} from "./assetGroupRegistry";
import {setAnalyticsUserClaim, setAnalyticsUserFastRedeem, setAnalyticsUserRedeem, setAnalyticsUserWithdrawalNFTBurn} from "./analyticsUser";

// newly added or endTime was reached and new rewards were added
export function handleRedeemInitiated(event: RedeemInitiated): void {
    logEventName("handleRedeemInitiated", event);

    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    let wNFT = getSmartVaultWithdrawalNFT(smartVault.id, event.params.redeemId);
    let smartVaultFlush = getSmartVaultFlush(smartVault.id, event.params.flushIndex);
    let withdrawnVaultShares = getWithdrawnVaultShares(smartVault, smartVaultFlush);
    let user = getUser(event.params.receiver.toHexString());

    let shares = event.params.shares;

    wNFT.user = user.id;
    wNFT.owner = user.id;
    wNFT.smartVaultFlush = smartVaultFlush.id;
    wNFT.createdOn = event.block.timestamp;
    wNFT.svtWithdrawn = shares;
    wNFT.blockNumber = event.block.number.toI32();
    wNFT.txHash = event.transaction.hash.toHexString();

    withdrawnVaultShares.shares = withdrawnVaultShares.shares.plus(shares);

    wNFT.save();
    withdrawnVaultShares.save();

    setAnalyticsUserRedeem(event);
}

export function handleWithdrawalClaimed(event: WithdrawalClaimed): void {
    logEventName("handleWithdrawalClaimed", event);
    burnWithdrawalNfts(event);
    setAnalyticsUserClaim(event);

}

export function handleFastRedeemInitiated(event: FastRedeemInitiated): void {
    logEventName("handleFastRedeemInitiated", event);
    let smartVaultAddress = event.params.smartVault.toHexString();
    let user = getUser( event.params.redeemer.toHexString() );
    let shares = event.params.shares;

    let assetsWithdrawn = event.params.assetsWithdrawn;

    // burnDepositNfts(smartVaultAddress, event.params.nftIds, event.params.nftAmounts, event.block.timestamp.toI32());
    let smartVault = getSmartVault(smartVaultAddress);
    let smartVaultStrategies = smartVault.smartVaultStrategies;

    for (let i = 0; i < smartVaultStrategies.length; i++) {
       let smartVaultStrategy = SmartVaultStrategy.load(smartVaultStrategies[i])!;
       let strategy = getStrategy(smartVaultStrategy.strategy);

       let strategyDHW = getStrategyDHW(strategy.id, strategy.lastDoHardWorkIndex);

       let fastRedeem = getFastRedeem(strategyDHW);
       fastRedeem.blockNumber = event.block.number.toI32();
       fastRedeem.user = user.id;
       fastRedeem.smartVault = getSmartVault(smartVaultAddress).id;
       fastRedeem.createdOn = event.block.timestamp.toI32();
       fastRedeem.save();

       strategyDHW.fastRedeemCount = strategyDHW.fastRedeemCount + 1;
       strategyDHW.save();

       // add  user to strategyFastRedeem (StrategySharesRedeemed does not emit user, but this event follows it, and it does emit user).
        let strategyFastRedeem = getStrategyFastRedeem(strategy, strategy.fastRedeemCount - 1);
        strategyFastRedeem.user = user.id;
        strategyFastRedeem.save();
        
        // add fast redeemed assets to total sst redemption assets
        let assetGroup = getAssetGroup(strategy.assetGroup);
        let assetGroupTokens = assetGroup.assetGroupTokens;
        for(let i = 0; i < assetGroupTokens.length; i++) {
            let assetGroupToken = getAssetGroupTokenById(assetGroupTokens[i]);
            let asset = createTokenEntity(assetGroupToken.token);
            let sstRedemptionAsset = getSSTRedemptionAsset(user, asset);
            let strategyFastRedeemAsset = getStrategyFastRedeemAsset(strategyFastRedeem, asset);

            sstRedemptionAsset.claimed = sstRedemptionAsset.claimed.plus(strategyFastRedeemAsset.claimed);
            sstRedemptionAsset.save();
        }
    }
    
    let smartVaultFastRedeem = getSmartVaultFastRedeem(smartVault);
    smartVaultFastRedeem.blockNumber = event.block.number.toI32();
    smartVaultFastRedeem.user = user.id;
    smartVaultFastRedeem.smartVault = getSmartVault(smartVaultAddress).id;
    smartVaultFastRedeem.createdOn = event.block.timestamp.toI32();
    smartVaultFastRedeem.svtWithdrawn = shares;
    smartVaultFastRedeem.save();

    let assetGroup = getAssetGroup(smartVault.assetGroup);
    let assetGroupTokens = assetGroup.assetGroupTokens;
    for(let i = 0; i < assetGroupTokens.length; i++) {
        let assetGroupToken = getAssetGroupTokenById(assetGroupTokens[i]);
        let asset = createTokenEntity(assetGroupToken.token);
        let smartVaultFastRedeemAsset = getSmartVaultFastRedeemAsset(smartVaultFastRedeem, asset);

        smartVaultFastRedeemAsset.claimed = smartVaultFastRedeemAsset.claimed.plus(assetsWithdrawn[i].toBigDecimal());
        smartVaultFastRedeemAsset.save();
    }

    smartVault.fastRedeemCount = smartVault.fastRedeemCount + 1;
    smartVault.save();

    setAnalyticsUserFastRedeem(event);

}

function burnWithdrawalNfts(event: WithdrawalClaimed): void {

    let smartVaultAddress = event.params.smartVault.toHexString();
    let nftIds = event.params.nftIds;
    let nftAmounts = event.params.nftAmounts;
    let timestamp = event.block.timestamp.toI32();
    let withdrawnAssets = event.params.withdrawnAssets; 
    let assetGroup = getAssetGroup(event.params.assetGroupId.toString()); 
    let assetGroupTokens = assetGroup.assetGroupTokens;
    
    let totalSvts = ZERO_BD;
    let cumulativeAmounts = new Array<BigDecimal>();

    // count total nft amounts
    for (let i = 0; i < nftIds.length; i++) {
        let wNFT = getSmartVaultWithdrawalNFT(smartVaultAddress, nftIds[i]);
        totalSvts = totalSvts.plus(wNFT.svtWithdrawn.toBigDecimal());
    }

    for(let i = 0; i < assetGroupTokens.length; i++) {
        let token = createTokenEntity(assetGroupTokens[i].split("-")[1]);
        let amount = getTokenDecimalAmountFromAddress(withdrawnAssets[i], token.id);
        cumulativeAmounts.push(amount);
    }

    for (let i = 0; i < nftIds.length; i++) {
        let wNFT = getSmartVaultWithdrawalNFT(smartVaultAddress, nftIds[i]);

        wNFT.shares = wNFT.shares.minus(nftAmounts[i]);

        if (wNFT.shares.isZero()) {
            wNFT.isBurned = true;
            wNFT.burnedOn = timestamp;
            setAnalyticsUserWithdrawalNFTBurn(event, wNFT);
        }

        wNFT.save();

        for(let j = 0; j < assetGroupTokens.length; j++) {
            // second part of the id is the token address
            let token = createTokenEntity(assetGroupTokens[j].split("-")[1]);
            let wNFTAsset = getSmartVaultWithdrawalNFTAsset(wNFT, token);

            let amount = getTokenDecimalAmountFromAddress(withdrawnAssets[j], token.id);

            if(amount.equals(ZERO_BD)) continue;

            // calculate proportional asset amount based on svtWithdrawn and totalSvts
            let proportionalAmount = amount.times(wNFT.svtWithdrawn.toBigDecimal()).div(totalSvts);
            if(i == (nftIds.length - 1)) {
                proportionalAmount = cumulativeAmounts[j];
            }

            cumulativeAmounts[j] = cumulativeAmounts[j].minus(proportionalAmount);

            wNFTAsset.amount = wNFTAsset.amount.plus(proportionalAmount);
            wNFTAsset.save();
        }
    }
}


function burnDepositNfts(smartVaultAddress: string, nftIds: BigInt[], nftAmounts: BigInt[], timestamp: i32): void {
    for (let i = 0; i < nftIds.length; i++) {
        let dNFT = getSmartVaultDepositNFT(smartVaultAddress, nftIds[i]);

        dNFT.shares = dNFT.shares.minus(nftAmounts[i]);

        if (dNFT.shares.isZero()) {
            dNFT.isBurned = true;
            dNFT.burnedOn = timestamp;
        }

        dNFT.save();
    }
}

export function getSmartVaultWithdrawalNFT(smartVaultAddress: string, nftId: BigInt): SmartVaultWithdrawalNFT {
    let smartVaultDepositNFTId = getComposedId(smartVaultAddress, nftId.toString());
    let wNFT = SmartVaultWithdrawalNFT.load(smartVaultDepositNFTId);

    if (wNFT == null) {
        wNFT = new SmartVaultWithdrawalNFT(smartVaultDepositNFTId);
        wNFT.smartVault = smartVaultAddress;
        wNFT.nftId = nftId;
        wNFT.user = ZERO_ADDRESS.toHexString();
        wNFT.owner = ZERO_ADDRESS.toHexString();
        wNFT.shares = NFT_INITIAL_SHARES;
        wNFT.svtWithdrawn = ZERO_BI;
        wNFT.smartVaultFlush = "";
        wNFT.isBurned = false;
        wNFT.transferCount = 0;
        wNFT.createdOn = ZERO_BI;
        wNFT.blockNumber = 0;
        wNFT.txHash = "";
        wNFT.burnedOn = 0;

        wNFT.save();
    }

    return wNFT;
}

export function getSmartVaultWithdrawalNFTAsset(smartVaultWithdrawalNFT: SmartVaultWithdrawalNFT, asset: Token): SmartVaultWithdrawalNFTAsset {
    let id = getComposedId(smartVaultWithdrawalNFT.id, asset.id);
    let wNFTAsset = SmartVaultWithdrawalNFTAsset.load(id);

    if (wNFTAsset == null) {
        wNFTAsset = new SmartVaultWithdrawalNFTAsset(id);
        wNFTAsset.smartVaultWithdrawalNFT = smartVaultWithdrawalNFT.id;
        wNFTAsset.asset = asset.id;
        wNFTAsset.amount = ZERO_BD;

        wNFTAsset.save();
    }

    return wNFTAsset;
}


export function getWithdrawnVaultShares(smartVault: SmartVault, smartVaultFlush: SmartVaultFlush): WithdrawnVaultShares {
    let withdrawnVaultSharesId = getComposedId(smartVault.id, smartVaultFlush.id);
    let withdrawnVaultShares = WithdrawnVaultShares.load(withdrawnVaultSharesId);

    if (withdrawnVaultShares == null) {
        withdrawnVaultShares = new WithdrawnVaultShares(withdrawnVaultSharesId);
        withdrawnVaultShares.smartVault = smartVault.id;
        withdrawnVaultShares.smartVaultFlush = smartVaultFlush.id;
        withdrawnVaultShares.shares = ZERO_BI;

        withdrawnVaultShares.save();
    }

    return withdrawnVaultShares;
}

function getFastRedeem(strategyDHW: StrategyDHW): FastRedeem {
    let fastRedeemId = getComposedId(strategyDHW.id, strategyDHW.fastRedeemCount.toString());
    let fastRedeem = FastRedeem.load(fastRedeemId);

    if (fastRedeem == null) {
        fastRedeem = new FastRedeem(fastRedeemId);
        fastRedeem.strategyDHW = strategyDHW.id;
        fastRedeem.count = strategyDHW.fastRedeemCount;
        fastRedeem.blockNumber = 0;
        fastRedeem.user = "";
        fastRedeem.smartVault = "";
        fastRedeem.createdOn = 0;

        fastRedeem.save();
    }

    return fastRedeem;
}


function getSmartVaultFastRedeem(smartVault: SmartVault): SmartVaultFastRedeem {
    let smartVaultFastRedeemId = getComposedId(smartVault.id, smartVault.fastRedeemCount.toString());
    let smartVaultFastRedeem = SmartVaultFastRedeem.load(smartVaultFastRedeemId);

    if (smartVaultFastRedeem == null) {
        smartVaultFastRedeem = new SmartVaultFastRedeem(smartVaultFastRedeemId);
        smartVaultFastRedeem.smartVault = smartVault.id;
        smartVaultFastRedeem.count = smartVault.fastRedeemCount;
        smartVaultFastRedeem.blockNumber = 0;
        smartVaultFastRedeem.user = "";
        smartVaultFastRedeem.smartVault = "";
        smartVaultFastRedeem.createdOn = 0;
        smartVaultFastRedeem.svtWithdrawn = ZERO_BI;

        smartVaultFastRedeem.save();
    }

    return smartVaultFastRedeem;
}

function getSmartVaultFastRedeemAsset(smartVaultFastRedeem: SmartVaultFastRedeem, asset: Token): SmartVaultFastRedeemAsset {
    let id = getComposedId(smartVaultFastRedeem.id, asset.id);
    let smartVaultFastRedeemAsset = SmartVaultFastRedeemAsset.load(id);

    if (smartVaultFastRedeemAsset == null) {
        smartVaultFastRedeemAsset = new SmartVaultFastRedeemAsset(id);
        smartVaultFastRedeemAsset.smartVaultFastRedeem = smartVaultFastRedeem.id;
        smartVaultFastRedeemAsset.asset = asset.id;
        smartVaultFastRedeemAsset.claimed = ZERO_BD;

        smartVaultFastRedeemAsset.save();
    }

    return smartVaultFastRedeemAsset;
}

