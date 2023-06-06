import {BigInt} from "@graphprotocol/graph-ts";

import {
    DepositInitiated, SmartVaultTokensClaimed
} from "../generated/DepositManager/DepositManagerContract";

import {
    AssetGroup,
    AssetGroupToken,
    SmartVaultDepositNFT,
} from "../generated/schema";

import {
    logEventName,
    getComposedId,
    ZERO_BI,
    ZERO_ADDRESS,
    getUser,
    getSmartVault,
    createTokenEntity,
    getTokenDecimalAmountFromAddress,
    NFT_INITIAL_SHARES,
} from "./utils/helpers";
import { getSmartVaultFlush } from "./smartVaultManager";

export function handleDepositInitiated(event: DepositInitiated): void {
    logEventName("handleDepositInitiated", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    let dNFT = getSmartVaultDepositNFT(smartVaultAddress, event.params.depositId);
    dNFT.user = getUser(event.params.receiver.toHexString()).id;
    dNFT.smartVaultFlush = getSmartVaultFlush(smartVaultAddress, event.params.flushIndex).id;
    dNFT.createdOn = event.block.timestamp;

    const assetGroup = AssetGroup.load(getSmartVault(smartVaultAddress).assetGroup)!;

    let assets = dNFT.assets;
    for (let i = 0; i < assetGroup.assetGroupTokens.length; i++) {
        // second part of the id is the token address
        let tokenAddress = assetGroup.assetGroupTokens[i].split("-")[1];

        let amount = getTokenDecimalAmountFromAddress(event.params.assets[i], tokenAddress);

        assets.push(amount);
    }
    dNFT.assets = assets;

    dNFT.save();
}

export function handleSmartVaultTokensClaimed(event: SmartVaultTokensClaimed): void {
    logEventName("handleSmartVaultTokensClaimed", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    for (let i = 0; i < event.params.nftIds.length; i++) {
        let dNFT = getSmartVaultDepositNFT(smartVaultAddress, event.params.nftIds[i]);

        dNFT.shares = dNFT.shares.minus(event.params.nftAmounts[i]);

        if (dNFT.shares.isZero()) {
            dNFT.isBurned = true;
        }

        dNFT.save();
    }
}

function getSmartVaultDepositNFT(smartVaultAddress: string, nftId: BigInt): SmartVaultDepositNFT {
    let smartVaultDepositNFTId = getComposedId(smartVaultAddress, nftId.toString());
    let dNFT = SmartVaultDepositNFT.load(smartVaultDepositNFTId);

    if (dNFT == null) {
        dNFT = new SmartVaultDepositNFT(smartVaultDepositNFTId);
        dNFT.smartVault = smartVaultAddress;
        dNFT.nftId = nftId;
        dNFT.user = ZERO_ADDRESS.toHexString();
        dNFT.shares = NFT_INITIAL_SHARES;
        dNFT.assets = [];
        dNFT.smartVaultFlush = "";
        dNFT.isBurned = false;
        dNFT.createdOn = ZERO_BI;

        dNFT.save();
    }

    return dNFT;
}
