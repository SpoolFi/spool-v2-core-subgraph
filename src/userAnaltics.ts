import {DepositInitiated} from "../generated/DepositManager/DepositManagerContract";
import {RedeemInitiated, WithdrawalClaimed} from "../generated/WithdrawalManager/WithdrawalManagerContract";
import {AssetGroup} from "../generated/schema";
import {getSmartVaultFlush} from "./smartVaultManager";
import {createTokenEntity, getClaimUserTransactionType, getDepositUserTransactionType, getRedeemUserTransactionType, getSmartVault, getTokenDecimalAmountFromAddress, getUser, getUserTransaction, getUserTransactionTypeToken} from "./utils/helpers";

export function setUserTransactionDeposit(event: DepositInitiated): void {
    // set user analytics
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    let user = getUser(event.params.receiver.toHexString());
    let smartVaultFlush = getSmartVaultFlush(smartVault.id, event.params.flushIndex);
    const assetGroup = AssetGroup.load(smartVault.assetGroup)!;
    let userTransaction = getUserTransaction(user.id, user.transactionCount);

    userTransaction.timestamp = event.block.timestamp.toI32();
    userTransaction.txHash = event.transaction.hash.toHexString();
    userTransaction.smartVault = smartVault.id;
    userTransaction.save();

    let depositUserTransactionType = getDepositUserTransactionType(userTransaction);
    depositUserTransactionType.smartVaultFlush = smartVaultFlush.id;
    depositUserTransactionType.save();

    let tokenData = depositUserTransactionType.tokenData;
    for (let i = 0; i < assetGroup.assetGroupTokens.length; i++) {
        // second part of the id is the token address
        let token = createTokenEntity(assetGroup.assetGroupTokens[i].split("-")[1]);

        let amount = getTokenDecimalAmountFromAddress(event.params.assets[i], token.id);
        let userTransactionTypeToken = getUserTransactionTypeToken(depositUserTransactionType.id, token);

        userTransactionTypeToken.amount = amount;
        userTransactionTypeToken.token = token.id;
        userTransactionTypeToken.save();

        tokenData.push(userTransactionTypeToken.id);
    }

    depositUserTransactionType.tokenData = tokenData;
    depositUserTransactionType.save();

    userTransaction.type = depositUserTransactionType.id;
    userTransaction.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}


export function setUserTransactionRedeem(event: RedeemInitiated): void {
    // set user analytics
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    let user = getUser(event.params.receiver.toHexString());
    let smartVaultFlush = getSmartVaultFlush(smartVault.id, event.params.flushIndex);
    let userTransaction = getUserTransaction(user.id, user.transactionCount);

    userTransaction.timestamp = event.block.timestamp.toI32();
    userTransaction.txHash = event.transaction.hash.toHexString();
    userTransaction.smartVault = smartVault.id;
    userTransaction.save();

    let redeemUserTransactionType = getRedeemUserTransactionType(userTransaction);
    redeemUserTransactionType.smartVaultFlush = smartVaultFlush.id;

    redeemUserTransactionType.svts = event.params.shares.toBigDecimal();
    redeemUserTransactionType.save();

    userTransaction.type = redeemUserTransactionType.id;
    userTransaction.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}

export function setUserTransactionClaim(event: WithdrawalClaimed): void {
    // set user analytics
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );
    const assetGroup = AssetGroup.load(smartVault.assetGroup)!;
    let user = getUser(event.params.claimer.toHexString());
    let userTransaction = getUserTransaction(user.id, user.transactionCount);

    userTransaction.timestamp = event.block.timestamp.toI32();
    userTransaction.txHash = event.transaction.hash.toHexString();
    userTransaction.smartVault = smartVault.id;
    userTransaction.save();

    let claimUserTransactionType = getClaimUserTransactionType(userTransaction);
    claimUserTransactionType.save();

    let tokenData = claimUserTransactionType.tokenData;
    for (let i = 0; i < assetGroup.assetGroupTokens.length; i++) {
        // second part of the id is the token address
        let token = createTokenEntity(assetGroup.assetGroupTokens[i].split("-")[1]);

        let amount = getTokenDecimalAmountFromAddress(event.params.withdrawnAssets[i], token.id);
        let userTransactionTypeToken = getUserTransactionTypeToken(claimUserTransactionType.id, token);

        userTransactionTypeToken.amount = amount;
        userTransactionTypeToken.token = token.id;
        userTransactionTypeToken.save();

        tokenData.push(userTransactionTypeToken.id);
    }

    claimUserTransactionType.tokenData = tokenData;
    claimUserTransactionType.save();

    userTransaction.type = claimUserTransactionType.id;
    userTransaction.save();

    user.transactionCount = user.transactionCount + 1;
    user.save();
}
