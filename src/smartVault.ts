import { BigInt } from "@graphprotocol/graph-ts";
import {Transfer, TransferBatch, TransferSingle} from "../generated/SmartVaultManager/SmartVaultContract";

import { SmartVault, SmartVaultDepositNFTTransfer, SmartVaultDepositNFT, SmartVaultWithdrawalNFT, SmartVaultWithdrawalNFTTransfer } from "../generated/schema";
import {
    MAXIMAL_DEPOSIT_ID,
    ZERO_ADDRESS,
    getSmartVault,
    getUser,
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
    let from = event.params.from.toHexString();
    let to = event.params.to.toHexString();
    let timestamp = event.block.timestamp.toI32();
    let id = event.params.id;

    _updateNFT(smartVault, from, to, id);

    // add transfer
    if(id <= MAXIMAL_DEPOSIT_ID){

        let smartVaultDepositNFT = getSmartVaultDepositNFT(smartVault.id, id);
        let transferCount = smartVaultDepositNFT.transferCount;

        let smartVaultDepositNFTTransfer = getSmartVaultDepositNFTTransfer(
            smartVaultDepositNFT, transferCount
        );

        smartVaultDepositNFTTransfer.from = from;
        smartVaultDepositNFTTransfer.to = to;
        smartVaultDepositNFTTransfer.timestamp = timestamp;
        smartVaultDepositNFTTransfer.save();

        smartVaultDepositNFT.transferCount = transferCount + 1;
        smartVaultDepositNFT.save();
    }else {

        let smartVaultWithdrawalNFT = getSmartVaultWithdrawalNFT(smartVault.id, id);
        let transferCount = smartVaultWithdrawalNFT.transferCount;

        let smartVaultWithdrawalNFTTransfer = getSmartVaultWithdrawalNFTTransfer(
            smartVaultWithdrawalNFT, transferCount
        );

        smartVaultWithdrawalNFTTransfer.from = from;
        smartVaultWithdrawalNFTTransfer.to = to;
        smartVaultWithdrawalNFTTransfer.timestamp = timestamp;
        smartVaultWithdrawalNFTTransfer.save();
        
        smartVaultWithdrawalNFT.transferCount = transferCount + 1;
        smartVaultWithdrawalNFT.save();
    }

}

export function handleTransferBatch(event: TransferBatch): void {
    logEventName("handleTransferBatch", event);

    let smartVault = getSmartVault( event.address.toHexString() );
    let from = event.params.from.toHexString();
    let to = event.params.to.toHexString();

    for (let i = 0; i < event.params.ids.length; i++) {
        let id = event.params.ids[i];
        _updateNFT(smartVault, from, to, id);
    }
}

function _updateNFT(smartVault: SmartVault, from: string, to: string, id: BigInt): void {
    let isCreated = (from == ZERO_ADDRESS.toHexString()) ? true : false;
    let isBurned = (to == ZERO_ADDRESS.toHexString()) ? true : false;
    let fromUser = getUser(from).id;
    let toUser = getUser(to).id;
    if(id <= MAXIMAL_DEPOSIT_ID){
        let smartVaultDepositNFT = getSmartVaultDepositNFT(smartVault.id, id);
        if(isCreated) smartVaultDepositNFT.user = fromUser;
        if(!isBurned) smartVaultDepositNFT.owner = toUser;
        smartVaultDepositNFT.isBurned = isBurned;
        smartVaultDepositNFT.save();
    } else {
        let smartVaultWithdrawalNFT = getSmartVaultWithdrawalNFT(smartVault.id, id);
        if(isCreated) smartVaultWithdrawalNFT.user = fromUser;
        if(!isBurned) smartVaultWithdrawalNFT.owner = toUser;
        smartVaultWithdrawalNFT.isBurned = isBurned;
        smartVaultWithdrawalNFT.save();
    }
}

export function getSmartVaultDepositNFTTransfer(dNFT: SmartVaultDepositNFT, transferId: i32): SmartVaultDepositNFTTransfer {

    let id = dNFT.id + "-" + transferId.toString();
    let smartVaultDepositNFTTransfer = SmartVaultDepositNFTTransfer.load(id);

    if (smartVaultDepositNFTTransfer == null) {
        smartVaultDepositNFTTransfer = new SmartVaultDepositNFTTransfer(id);
        smartVaultDepositNFTTransfer.dNFT = dNFT.id;
        smartVaultDepositNFTTransfer.transferId = transferId;
        smartVaultDepositNFTTransfer.from = ZERO_ADDRESS.toHexString();
        smartVaultDepositNFTTransfer.to = ZERO_ADDRESS.toHexString();
        smartVaultDepositNFTTransfer.timestamp = 0;

        smartVaultDepositNFTTransfer.save();
    }

    return smartVaultDepositNFTTransfer;
}


export function getSmartVaultWithdrawalNFTTransfer(wNFT: SmartVaultWithdrawalNFT, transferId: i32): SmartVaultWithdrawalNFTTransfer {

    let id = wNFT.id + "-" + transferId.toString();
    let smartVaultWithdrawalNFTTransfer = SmartVaultWithdrawalNFTTransfer.load(id);

    if (smartVaultWithdrawalNFTTransfer == null) {
        smartVaultWithdrawalNFTTransfer = new SmartVaultWithdrawalNFTTransfer(id);
        smartVaultWithdrawalNFTTransfer.wNFT = wNFT.id;
        smartVaultWithdrawalNFTTransfer.transferId = transferId;
        smartVaultWithdrawalNFTTransfer.from = ZERO_ADDRESS.toHexString();
        smartVaultWithdrawalNFTTransfer.to = ZERO_ADDRESS.toHexString();
        smartVaultWithdrawalNFTTransfer.timestamp = 0;

        smartVaultWithdrawalNFTTransfer.save();
    }

    return smartVaultWithdrawalNFTTransfer;
}
