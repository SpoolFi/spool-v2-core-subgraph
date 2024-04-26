import {BigInt} from "@graphprotocol/graph-ts";

import {
    DepositInitiated, SmartVaultFeesMinted, SmartVaultTokensClaimed
} from "../generated/DepositManager/DepositManagerContract";

import {
    AssetGroup,
    SmartVault,
    SmartVaultDepositNFT,
    SmartVaultFlush,
    Token,
    VaultDeposits
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
    ZERO_BD,
    getSmartVaultFees
} from "./utils/helpers";
import { getSmartVaultFlush } from "./smartVaultManager";
import {getUserSmartVault} from "./rewardManager";
import {setAnalyticsUserDeposit, setAnalyticsUserDepositNFTBurn} from "./analyticsUser";
import {updateVaultAnalytics} from "./analyticsVault";

export function handleDepositInitiated(event: DepositInitiated): void {
    logEventName("handleDepositInitiated", event);
    let smartVault = getSmartVault( event.params.smartVault.toHexString() );

    let dNFT = getSmartVaultDepositNFT(smartVault.id, event.params.depositId);
    let smartVaultFlush = getSmartVaultFlush(smartVault.id, event.params.flushIndex);
    let user = getUser(event.params.receiver.toHexString());

    dNFT.user = user.id;
    dNFT.owner = user.id;
    dNFT.smartVaultFlush = smartVaultFlush.id;
    dNFT.createdOn = event.block.timestamp;
    dNFT.blockNumber = event.block.number.toI32();
    dNFT.txHash = event.transaction.hash.toHexString();

    const assetGroup = AssetGroup.load(smartVault.assetGroup)!;


    let assets = dNFT.assets;
    for (let i = 0; i < assetGroup.assetGroupTokens.length; i++) {
        // second part of the id is the token address
        let token = createTokenEntity(assetGroup.assetGroupTokens[i].split("-")[1]);

        let amount = getTokenDecimalAmountFromAddress(event.params.assets[i], token.id);

        assets.push(amount);

        let vaultDeposits = getVaultDeposits(smartVault, smartVaultFlush, token);
        vaultDeposits.amount = vaultDeposits.amount.plus(amount);
        vaultDeposits.save();
        
    }
    dNFT.assets = assets;

    dNFT.save();
    
    setAnalyticsUserDeposit(event);

    getUserSmartVault(user.id, smartVault.id);
}

export function handleSmartVaultTokensClaimed(event: SmartVaultTokensClaimed): void {
    logEventName("handleSmartVaultTokensClaimed", event);
    let smartVaultAddress = event.params.smartVault.toHexString();

    for (let i = 0; i < event.params.nftIds.length; i++) {
        let dNFT = getSmartVaultDepositNFT(smartVaultAddress, event.params.nftIds[i]);

        dNFT.shares = dNFT.shares.minus(event.params.nftAmounts[i]);

        if (dNFT.shares.isZero()) {
            dNFT.isBurned = true;
            dNFT.burnedOn = event.block.timestamp.toI32();
            setAnalyticsUserDepositNFTBurn(event, dNFT);
        }

        dNFT.save();
    }
}

export function handleSmartVaultFeesMinted(event: SmartVaultFeesMinted): void {
    logEventName("handleSmartVaultFeesMinted", event);

    let smartVaultFees = getSmartVaultFees(event.params.smartVault.toHexString());

    let feesCollected = event.params.smartVaultFeesCollected;
    let timestamp = event.block.timestamp.toI32();
    let smartVault = getSmartVault(event.params.smartVault.toHexString());

    smartVaultFees.depositFeeMinted = smartVaultFees.depositFeeMinted.plus(feesCollected.depositFees);
    updateVaultAnalytics(smartVault, timestamp, "depositFees", feesCollected.depositFees);

    smartVaultFees.performanceFeeMinted = smartVaultFees.performanceFeeMinted.plus(feesCollected.performanceFees);
    updateVaultAnalytics(smartVault, timestamp, "performanceFees", feesCollected.performanceFees);

    smartVaultFees.managementFeeMinted = smartVaultFees.managementFeeMinted.plus(feesCollected.managementFees);
    updateVaultAnalytics(smartVault, timestamp, "managementFees", feesCollected.managementFees);

    smartVaultFees.save();
}



export function getSmartVaultDepositNFT(smartVaultAddress: string, nftId: BigInt): SmartVaultDepositNFT {
    let smartVaultDepositNFTId = getComposedId(smartVaultAddress, nftId.toString());
    let dNFT = SmartVaultDepositNFT.load(smartVaultDepositNFTId);

    if (dNFT == null) {
        dNFT = new SmartVaultDepositNFT(smartVaultDepositNFTId);
        dNFT.smartVault = smartVaultAddress;
        dNFT.nftId = nftId;
        dNFT.user = ZERO_ADDRESS.toHexString();
        dNFT.owner = ZERO_ADDRESS.toHexString();
        dNFT.shares = NFT_INITIAL_SHARES;
        dNFT.assets = [];
        dNFT.smartVaultFlush = "";
        dNFT.isBurned = false;
        dNFT.transferCount = 0;
        dNFT.createdOn = ZERO_BI;
        dNFT.blockNumber = 0;
        dNFT.txHash = "";
        dNFT.burnedOn = 0;

        dNFT.save();
    }

    return dNFT;
}



export function getVaultDeposits(smartVault: SmartVault, smartVaultFlush: SmartVaultFlush, token: Token): VaultDeposits {
    let vaultDepositsId = getComposedId(smartVault.id, smartVaultFlush.id, token.id);
    let vaultDeposits = VaultDeposits.load(vaultDepositsId);

    if (vaultDeposits == null) {
        vaultDeposits = new VaultDeposits(vaultDepositsId);
        vaultDeposits.smartVault = smartVault.id;
        vaultDeposits.smartVaultFlush = smartVaultFlush.id;
        vaultDeposits.token = token.id;
        vaultDeposits.amount = ZERO_BD;

        vaultDeposits.save();
    }

    return vaultDeposits;

}
