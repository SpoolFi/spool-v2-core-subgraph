import {BigInt} from "@graphprotocol/graph-ts";

import {
    DepositInitiated
} from "../generated/DepositManager/DepositManagerContract";

import {
    SmartVaultDepositNFT,
} from "../generated/schema";

import {
    logEventName,
    getComposedId,
    ZERO_BI,
    ZERO_ADDRESS,
    getUser,
} from "./utils/helpers";

// newly added or endTime was reached and new rewards were added
export function handleDepositInitiated(event: DepositInitiated): void {
    logEventName("handleDepositInitiated", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    let dNFT = getSmartVaultDepositNFT(smartVaultAddress, event.params.depositId);
    dNFT.user = getUser(event.params.receiver.toHexString()).id;
    dNFT.shares = BigInt.fromI32(1000000);
    dNFT.assets = event.params.assets;
    dNFT.flushIndex = event.params.flushIndex;
    dNFT.createdOn = event.block.timestamp;

    dNFT.save();
}

function getSmartVaultDepositNFT(smartVaultAddress: string, nftId: BigInt): SmartVaultDepositNFT {
    let smartVaultDepositNFTId = getComposedId(smartVaultAddress, nftId.toString());
    let dNFT = SmartVaultDepositNFT.load(smartVaultDepositNFTId);

    if (dNFT == null) {
        dNFT = new SmartVaultDepositNFT(smartVaultDepositNFTId);
        dNFT.smartVault = smartVaultAddress;
        dNFT.nftId = nftId;
        dNFT.user = ZERO_ADDRESS.toHexString();
        dNFT.shares = ZERO_BI;
        dNFT.assets = [];
        dNFT.flushIndex = ZERO_BI;
        dNFT.isBurned = false;
        dNFT.createdOn = ZERO_BI;

        dNFT.save();
    }

    return dNFT;
}
