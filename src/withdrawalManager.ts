import {BigInt} from "@graphprotocol/graph-ts";

import {
    RedeemInitiated
} from "../generated/WithdrawalManager/WithdrawalManagerContract";

import {
    SmartVaultWithdrawalNFT,
} from "../generated/schema";

import {
    logEventName,
    getComposedId,
    ZERO_BI,
    ZERO_ADDRESS,
    getUser,
    NFT_INITIAL_SHARES,
} from "./utils/helpers";
import { getSmartVaultFlush } from "./smartVaultManager";

// newly added or endTime was reached and new rewards were added
export function handleRedeemInitiated(event: RedeemInitiated): void {
    logEventName("handleRedeemInitiated", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    let wNFT = getSmartVaultWithdrawalNFT(smartVaultAddress, event.params.redeemId);
    wNFT.user = getUser(event.params.receiver.toHexString()).id;
    wNFT.smartVaultFlush = getSmartVaultFlush(smartVaultAddress, event.params.flushIndex).id;
    wNFT.createdOn = event.block.timestamp;
    wNFT.svtWithdrawn = event.params.shares;

    wNFT.save();
}

function getSmartVaultWithdrawalNFT(smartVaultAddress: string, nftId: BigInt): SmartVaultWithdrawalNFT {
    let smartVaultDepositNFTId = getComposedId(smartVaultAddress, nftId.toString());
    let wNFT = SmartVaultWithdrawalNFT.load(smartVaultDepositNFTId);

    if (wNFT == null) {
        wNFT = new SmartVaultWithdrawalNFT(smartVaultDepositNFTId);
        wNFT.smartVault = smartVaultAddress;
        wNFT.nftId = nftId;
        wNFT.user = ZERO_ADDRESS.toHexString();
        wNFT.shares = NFT_INITIAL_SHARES;
        wNFT.svtWithdrawn = ZERO_BI;
        wNFT.smartVaultFlush = "";
        wNFT.isBurned = false;
        wNFT.createdOn = ZERO_BI;

        wNFT.save();
    }

    return wNFT;
}
