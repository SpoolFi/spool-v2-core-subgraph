import { BigInt } from "@graphprotocol/graph-ts";
import {Transfer, TransferBatch, TransferSingle} from "../generated/SmartVaultManager/SmartVaultContract";

import { SmartVault } from "../generated/schema";
import {
    MAXIMAL_DEPOSIT_ID,
    ZERO_ADDRESS,
    getSmartVault,
    logEventName,
} from "./utils/helpers";
import {getSmartVaultDepositNFT} from "./depositManager";
import {getSmartVaultWithdrawalNFT} from "./withdrawalManager";
import {getUserSmartVault} from "./rewardManager";


export function handleTransfer(event: Transfer): void {
    logEventName("handleTransfer", event);

    let smartVault = getSmartVault( event.address.toHexString() );

    let to = event.params.to.toHexString();
    let from = event.params.from.toHexString();
    let amount = event.params.value.toBigDecimal();

    // tokens minted
    if(from == ZERO_ADDRESS.toHexString()){
        smartVault.svtTotalSupply = smartVault.svtTotalSupply.plus(amount);
    } else {
        let fromUser = getUserSmartVault(from, smartVault.id);
        fromUser.svtBalance = fromUser.svtBalance.minus(amount);
        fromUser.save();
    }

    // tokens burned
    if(to == ZERO_ADDRESS.toHexString()){
        smartVault.svtTotalSupply = smartVault.svtTotalSupply.minus(amount);
    } else {
        let toUser = getUserSmartVault(to, smartVault.id);
        toUser.svtBalance = toUser.svtBalance.plus(amount);
        toUser.save();
    }

    smartVault.save();
}

export function handleTransferSingle(event: TransferSingle): void {
    logEventName("handleTransferSingle", event);

    let smartVault = getSmartVault( event.address.toHexString() );
    let to = event.params.to.toHexString();
    let id = event.params.id;

    _updateNFT(smartVault, to, id);
}

export function handleTransferBatch(event: TransferBatch): void {
    logEventName("handleTransferBatch", event);

    let smartVault = getSmartVault( event.address.toHexString() );
    let to = event.params.to.toHexString();

    for (let i = 0; i < event.params.ids.length; i++) {
        let id = event.params.ids[i];
        _updateNFT(smartVault, to, id);
    }
}

function _updateNFT(smartVault: SmartVault, to: string, id: BigInt): void {
    let isBurned = (to == ZERO_ADDRESS.toHexString()) ? true : false;
    if(id <= MAXIMAL_DEPOSIT_ID){
        let smartVaultDepositNFT = getSmartVaultDepositNFT(smartVault.id, id);
        smartVaultDepositNFT.user = to;
        smartVaultDepositNFT.isBurned = isBurned;
        smartVaultDepositNFT.save();
    } else {
        let smartVaultWithdrawalNFT = getSmartVaultWithdrawalNFT(smartVault.id, id);
        smartVaultWithdrawalNFT.user = to;
        smartVaultWithdrawalNFT.isBurned = isBurned;
        smartVaultWithdrawalNFT.save();
    }
}
