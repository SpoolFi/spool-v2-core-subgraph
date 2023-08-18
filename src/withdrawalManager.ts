import {BigInt} from "@graphprotocol/graph-ts";

import {
    FastRedeemInitiated,
    RedeemInitiated, WithdrawalClaimed
} from "../generated/WithdrawalManager/WithdrawalManagerContract";

import {
    FastRedeem,
    SmartVault,
    SmartVaultFastRedeem,
    SmartVaultFlush,
    SmartVaultStrategy,
    SmartVaultWithdrawalNFT,
    StrategyDHW,
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
} from "./utils/helpers";
import { getSmartVaultFlush, getSmartVaultStrategy } from "./smartVaultManager";
import {getStrategy, getStrategyDHW} from "./strategyRegistry";
import {getSmartVaultDepositNFT} from "./depositManager";

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

    withdrawnVaultShares.shares = withdrawnVaultShares.shares.plus(shares);

    wNFT.save();
    withdrawnVaultShares.save();
}

export function handleWithdrawalClaimed(event: WithdrawalClaimed): void {
    logEventName("handleWithdrawalClaimed", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    burnWithdrawalNfts(smartVaultAddress, event.params.nftIds, event.params.nftAmounts);
}

export function handleFastRedeemInitiated(event: FastRedeemInitiated): void {
    logEventName("handleFastRedeemInitiated", event);
    let smartVaultAddress = event.params.smartVault.toHexString();
    let user = event.params.redeemer.toHexString();
    let shares = event.params.shares;

    burnDepositNfts(smartVaultAddress, event.params.nftIds, event.params.nftAmounts);
    let smartVault = getSmartVault(smartVaultAddress);
    let smartVaultStrategies = smartVault.smartVaultStrategies;

    for (let i = 0; i < smartVaultStrategies.length; i++) {
       let smartVaultStrategy = SmartVaultStrategy.load(smartVaultStrategies[i])!;
       let strategy = getStrategy(smartVaultStrategy.strategy);

       let strategyDHW = getStrategyDHW(strategy.id, strategy.lastDoHardWorkIndex);

       let fastRedeem = getFastRedeem(strategyDHW);
       fastRedeem.blockNumber = event.block.number.toI32();
       fastRedeem.user = getUser(user).id;
       fastRedeem.smartVault = getSmartVault(smartVaultAddress).id;
       fastRedeem.createdOn = event.block.timestamp.toI32();
       fastRedeem.save();

       strategyDHW.fastRedeemCount = strategyDHW.fastRedeemCount + 1;
       strategyDHW.save();

    }
    
    let smartVaultFastRedeem = getSmartVaultFastRedeem(smartVault);
    smartVaultFastRedeem.blockNumber = event.block.number.toI32();
    smartVaultFastRedeem.user = getUser(user).id;
    smartVaultFastRedeem.smartVault = getSmartVault(smartVaultAddress).id;
    smartVaultFastRedeem.createdOn = event.block.timestamp.toI32();
    smartVaultFastRedeem.svtWithdrawn = shares;
    smartVaultFastRedeem.save();

    smartVault.fastRedeemCount = smartVault.fastRedeemCount + 1;
    smartVault.save();

}

function burnWithdrawalNfts(smartVaultAddress: string, nftIds: BigInt[], nftAmounts: BigInt[]): void {
    for (let i = 0; i < nftIds.length; i++) {
        let wNFT = getSmartVaultWithdrawalNFT(smartVaultAddress, nftIds[i]);

        wNFT.shares = wNFT.shares.minus(nftAmounts[i]);

        if (wNFT.shares.isZero()) {
            wNFT.isBurned = true;
        }

        wNFT.save();
    }
}


function burnDepositNfts(smartVaultAddress: string, nftIds: BigInt[], nftAmounts: BigInt[]): void {
    for (let i = 0; i < nftIds.length; i++) {
        let dNFT = getSmartVaultDepositNFT(smartVaultAddress, nftIds[i]);

        dNFT.shares = dNFT.shares.minus(nftAmounts[i]);

        if (dNFT.shares.isZero()) {
            dNFT.isBurned = true;
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

        wNFT.save();
    }

    return wNFT;
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





