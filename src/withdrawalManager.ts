import {BigInt} from "@graphprotocol/graph-ts";

import {
    RedeemInitiated, WithdrawalClaimed
} from "../generated/WithdrawalManager/WithdrawalManagerContract";

import {
    SmartVault,
    SmartVaultFlush,
    SmartVaultWithdrawalNFT,
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
import { getSmartVaultFlush } from "./smartVaultManager";

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

    withdrawnVaultShares.shares = withdrawnVaultShares.shares.plus(shares);

    wNFT.save();
    withdrawnVaultShares.save();
}

export function handleWithdrawalClaimed(event: WithdrawalClaimed): void {
    logEventName("handleWithdrawalClaimed", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    burnNfts(smartVaultAddress, event.params.nftIds, event.params.nftAmounts);
}

export function handleFastRedeemInitiated(event: WithdrawalClaimed): void {
    logEventName("handleFastRedeemInitiated", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    burnNfts(smartVaultAddress, event.params.nftIds, event.params.nftAmounts);
}

function burnNfts(smartVaultAddress: string, nftIds: BigInt[], nftAmounts: BigInt[]): void {
    for (let i = 0; i < nftIds.length; i++) {
        let wNFT = getSmartVaultWithdrawalNFT(smartVaultAddress, nftIds[i]);

        wNFT.shares = wNFT.shares.minus(nftAmounts[i]);

        if (wNFT.shares.isZero()) {
            wNFT.isBurned = true;
        }

        wNFT.save();
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







