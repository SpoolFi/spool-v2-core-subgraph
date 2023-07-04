import { BigInt } from "@graphprotocol/graph-ts";
import {TransferBatch, TransferSingle} from "../generated/SmartVaultManager/SmartVaultContract";

import { SmartVault } from "../generated/schema";
import {
    MAXIMAL_DEPOSIT_ID,
    ZERO_ADDRESS,
    getSmartVault,
    logEventName,
} from "./utils/helpers";
import {getSmartVaultDepositNFT} from "./depositManager";
import {getSmartVaultWithdrawalNFT} from "./withdrawalManager";

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
