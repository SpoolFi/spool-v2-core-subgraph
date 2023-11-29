import {DepositInitiated, SmartVaultTokensClaimed} from "../generated/DepositManager/DepositManagerContract";
import {RewardsClaimed} from "../generated/RewardManager/RewardManagerContract";
import {Transfer, TransferSingle} from "../generated/SmartVaultManager/SmartVaultContract";
import {FastRedeemInitiated, RedeemInitiated, WithdrawalClaimed} from "../generated/WithdrawalManager/WithdrawalManagerContract";
import {AssetGroup, SVTTransfer, SmartVault, SmartVaultDepositNFT, SmartVaultDepositNFTTransfer, SmartVaultWithdrawalNFT, SmartVaultWithdrawalNFTTransfer, User, AnalyticsUser} from "../generated/schema";
import {getSmartVaultDepositNFT} from "./depositManager";
import {getSmartVaultFlush} from "./smartVaultManager";
import {createTokenEntity, getClaimAnalyticsUserType, getDepositAnalyticsUserType, getFastRedeemAnalyticsUserType, getRedeemAnalyticsUserType, getSmartVault, getTokenDecimalAmountFromAddress, getUser, getAnalyticsUser, getAnalyticsUserTypeToken, getDepositNFTTransferAnalyticsUserType, getSVTTransferAnalyticsUserType, getWithdrawalNFTTransferAnalyticsUserType, getDepositNFTBurnAnalyticsUserType, getWithdrawalNFTBurnAnalyticsUserType, getRewardClaimAnalyticsUserType, integerToDecimal} from "./utils/helpers";
import {getSmartVaultWithdrawalNFT} from "./withdrawalManager";

import { ethereum } from "@graphprotocol/graph-ts";

export function setAnalyticsUserDeposit(event: DepositInitiated): void {
    // set user analytics
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    let user = getUser(event.params.receiver.toHexString());
    let smartVaultFlush = getSmartVaultFlush(smartVault.id, event.params.flushIndex);
    const assetGroup = AssetGroup.load(smartVault.assetGroup)!;
    let dNFT = getSmartVaultDepositNFT(smartVault.id, event.params.depositId);

    let analyticsUser = getAnalyticsUserDefault(user, event, smartVault);

    let depositAnalyticsUserType = getDepositAnalyticsUserType(analyticsUser);
    depositAnalyticsUserType.smartVaultFlush = smartVaultFlush.id;
    depositAnalyticsUserType.dNFT = dNFT.id;
    depositAnalyticsUserType.save();

    let tokenData = depositAnalyticsUserType.tokenData;
    for (let i = 0; i < assetGroup.assetGroupTokens.length; i++) {
        // second part of the id is the token address
        let token = createTokenEntity(assetGroup.assetGroupTokens[i].split("-")[1]);

        let amount = getTokenDecimalAmountFromAddress(event.params.assets[i], token.id);
        let analyticsUserTypeToken = getAnalyticsUserTypeToken(depositAnalyticsUserType.id, token);

        analyticsUserTypeToken.amount = amount;
        analyticsUserTypeToken.token = token.id;
        analyticsUserTypeToken.save();

        tokenData.push(analyticsUserTypeToken.id);
    }

    depositAnalyticsUserType.tokenData = tokenData;
    depositAnalyticsUserType.save();

    analyticsUser.type = depositAnalyticsUserType.id;
    analyticsUser.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}


export function setAnalyticsUserRedeem(event: RedeemInitiated): void {
    // set user analytics
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    let user = getUser(event.params.receiver.toHexString());
    let smartVaultFlush = getSmartVaultFlush(smartVault.id, event.params.flushIndex);
    let wNFT = getSmartVaultWithdrawalNFT(smartVault.id, event.params.redeemId);

    let analyticsUser = getAnalyticsUserDefault(user, event, smartVault);

    let redeemAnalyticsUserType = getRedeemAnalyticsUserType(analyticsUser);
    redeemAnalyticsUserType.smartVaultFlush = smartVaultFlush.id;
    redeemAnalyticsUserType.svts = integerToDecimal(event.params.shares, 18);
    redeemAnalyticsUserType.wNFT = wNFT.id;
    redeemAnalyticsUserType.save();

    analyticsUser.type = redeemAnalyticsUserType.id;
    analyticsUser.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}

export function setAnalyticsUserClaim(event: WithdrawalClaimed): void {
    // set user analytics
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    const assetGroup = AssetGroup.load(smartVault.assetGroup)!;
    let user = getUser(event.params.claimer.toHexString());
    let wNFTs = event.params.nftIds;

    let analyticsUser = getAnalyticsUserDefault(user, event, smartVault);

    let claimAnalyticsUserType = getClaimAnalyticsUserType(analyticsUser);
    for(let i = 0; i < wNFTs.length; i++) {
        let wNFT = getSmartVaultWithdrawalNFT(smartVault.id, wNFTs[i]);
        claimAnalyticsUserType.wNFTs.push(wNFT.id);
    }
    claimAnalyticsUserType.save();

    let tokenData = claimAnalyticsUserType.tokenData;
    for (let i = 0; i < assetGroup.assetGroupTokens.length; i++) {
        // second part of the id is the token address
        let token = createTokenEntity(assetGroup.assetGroupTokens[i].split("-")[1]);

        let amount = getTokenDecimalAmountFromAddress(event.params.withdrawnAssets[i], token.id);
        let analyticsUserTypeToken = getAnalyticsUserTypeToken(claimAnalyticsUserType.id, token);

        analyticsUserTypeToken.amount = amount;
        analyticsUserTypeToken.token = token.id;
        analyticsUserTypeToken.save();

        tokenData.push(analyticsUserTypeToken.id);
    }

    claimAnalyticsUserType.tokenData = tokenData;
    claimAnalyticsUserType.save();

    analyticsUser.type = claimAnalyticsUserType.id;
    analyticsUser.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}

export function setAnalyticsUserFastRedeem(event: FastRedeemInitiated): void {
    // set user analytics
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    const assetGroup = AssetGroup.load(smartVault.assetGroup)!;
    let user = getUser(event.params.redeemer.toHexString());

    let analyticsUser = getAnalyticsUserDefault(user, event, smartVault);

    let fastRedeemAnalyticsUserType = getFastRedeemAnalyticsUserType(analyticsUser);

    let tokenData = fastRedeemAnalyticsUserType.tokenData;
    for (let i = 0; i < assetGroup.assetGroupTokens.length; i++) {
        // second part of the id is the token address
        let token = createTokenEntity(assetGroup.assetGroupTokens[i].split("-")[1]);

        let amount = getTokenDecimalAmountFromAddress(event.params.assetsWithdrawn[i], token.id);
        let analyticsUserTypeToken = getAnalyticsUserTypeToken(fastRedeemAnalyticsUserType.id, token);

        analyticsUserTypeToken.amount = amount;
        analyticsUserTypeToken.token = token.id;
        analyticsUserTypeToken.save();

        tokenData.push(analyticsUserTypeToken.id);
    }

    fastRedeemAnalyticsUserType.tokenData = tokenData;
    fastRedeemAnalyticsUserType.save();

    analyticsUser.type = fastRedeemAnalyticsUserType.id;
    analyticsUser.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}

export function setAnalyticsUserSVTTransfer(event: Transfer, svtTransfer: SVTTransfer): void {
    // set user analytics
    let smartVault = getSmartVault( svtTransfer.smartVault );
    let user = getUser(event.params.from.toHexString());

    let analyticsUser = getAnalyticsUserDefault(user, event, smartVault);

    let svtTransferAnalyticsUserType = getSVTTransferAnalyticsUserType(analyticsUser);

    svtTransferAnalyticsUserType.to = event.params.to.toHexString();
    svtTransferAnalyticsUserType.amount = integerToDecimal(event.params.value, 18);
    svtTransferAnalyticsUserType.save();

    analyticsUser.type = svtTransferAnalyticsUserType.id;
    analyticsUser.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}

export function setAnalyticsUserDepositNFTTransfer(event: TransferSingle, smartVaultDepositNFTTransfer: SmartVaultDepositNFTTransfer): void {
    // set user analytics
    let smartVault = getSmartVault( event.address.toHexString() );
    let user = getUser(event.params.from.toHexString());

    let analyticsUser = getAnalyticsUserDefault(user, event, smartVault);

    let depositNFTTransferAnalyticsUserType = getDepositNFTTransferAnalyticsUserType(analyticsUser);

    depositNFTTransferAnalyticsUserType.smartVaultDepositNFTTransfer = smartVaultDepositNFTTransfer.id;
    depositNFTTransferAnalyticsUserType.save();

    analyticsUser.type = depositNFTTransferAnalyticsUserType.id;
    analyticsUser.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}

export function setAnalyticsUserWithdrawalNFTTransfer(event: TransferSingle, smartVaultWithdrawalNFTTransfer: SmartVaultWithdrawalNFTTransfer): void {
    // set user analytics
    let smartVault = getSmartVault( event.address.toHexString() );
    let user = getUser(event.params.from.toHexString());

    let analyticsUser = getAnalyticsUserDefault(user, event, smartVault);

    let withdrawalNFTTransferAnalyticsUserType = getWithdrawalNFTTransferAnalyticsUserType(analyticsUser);

    withdrawalNFTTransferAnalyticsUserType.smartVaultWithdrawalNFTTransfer = smartVaultWithdrawalNFTTransfer.id;
    withdrawalNFTTransferAnalyticsUserType.save();

    analyticsUser.type = withdrawalNFTTransferAnalyticsUserType.id;
    analyticsUser.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}

export function setAnalyticsUserDepositNFTBurn(event: SmartVaultTokensClaimed, smartVaultDepositNFT: SmartVaultDepositNFT): void {
    // set user analytics
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    let user = getUser(event.params.claimer.toHexString());

    let analyticsUser = getAnalyticsUserDefault(user, event, smartVault);

    let depositNFTBurnAnalyticsUserType = getDepositNFTBurnAnalyticsUserType(analyticsUser);

    depositNFTBurnAnalyticsUserType.dNFTBurned = smartVaultDepositNFT.id;
    depositNFTBurnAnalyticsUserType.save();

    analyticsUser.type = depositNFTBurnAnalyticsUserType.id;
    analyticsUser.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}

export function setAnalyticsUserWithdrawalNFTBurn(event: WithdrawalClaimed, smartVaultWithdrawalNFT: SmartVaultWithdrawalNFT): void {
    // set user analytics
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    let user = getUser(event.params.claimer.toHexString());

    let analyticsUser = getAnalyticsUserDefault(user, event, smartVault);

    let withdrawalNFTBurnAnalyticsUserType = getWithdrawalNFTBurnAnalyticsUserType(analyticsUser);

    withdrawalNFTBurnAnalyticsUserType.wNFTBurned = smartVaultWithdrawalNFT.id;
    withdrawalNFTBurnAnalyticsUserType.save();

    analyticsUser.type = withdrawalNFTBurnAnalyticsUserType.id;
    analyticsUser.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}

export function setAnalyticsUserRewardClaim(event: RewardsClaimed): void {
    // set user analytics
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    let user = getUser(event.params.user.toHexString());

    let analyticsUser = getAnalyticsUserDefault(user, event, smartVault);

    let rewardClaimAnalyticsUserType = getRewardClaimAnalyticsUserType(analyticsUser);

    let token = createTokenEntity(event.params.token.toHexString());
    let amount = getTokenDecimalAmountFromAddress(event.params.amount, token.id);
    let rewardData = getAnalyticsUserTypeToken(rewardClaimAnalyticsUserType.id, token);

    rewardData.amount = amount;
    rewardData.save();

    rewardClaimAnalyticsUserType.rewardData = rewardData.id;
    rewardClaimAnalyticsUserType.save();

    analyticsUser.type = rewardClaimAnalyticsUserType.id;
    analyticsUser.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}

function getAnalyticsUserDefault(user: User, event: ethereum.Event, smartVault: SmartVault): AnalyticsUser {

    let analyticsUser = getAnalyticsUser(user.id, user.transactionCount);

    analyticsUser.timestamp = event.block.timestamp.toI32();
    analyticsUser.blockNumber = event.block.number.toI32();
    analyticsUser.txHash = event.transaction.hash.toHexString();
    analyticsUser.smartVault = smartVault.id;

    analyticsUser.save();

    return analyticsUser;
}
