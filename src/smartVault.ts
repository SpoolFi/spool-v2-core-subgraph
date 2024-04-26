import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {Transfer, TransferBatch, TransferSingle} from "../generated/SmartVaultManager/SmartVaultContract";

import { SmartVaultDepositNFTTransfer, SmartVaultDepositNFT, SmartVaultWithdrawalNFT, SmartVaultWithdrawalNFTTransfer, SVTTransfer, Transaction, User } from "../generated/schema";
import {
    MAXIMAL_DEPOSIT_ID,
    ZERO_ADDRESS,
    ZERO_BD,
    ZERO_BI,
    getSmartVault,
    getUser,
    logEventName,
} from "./utils/helpers";
import {getSmartVaultDepositNFT} from "./depositManager";
import {getSmartVaultWithdrawalNFT} from "./withdrawalManager";
import {getUserSmartVault} from "./rewardManager";
import {setAnalyticsUserDepositNFTTransfer, setAnalyticsUserSVTTransfer, setAnalyticsUserWithdrawalNFTTransfer} from "./analyticsUser";


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

    let transaction = getTransaction( event.transaction.hash.toHexString() );
    let svtTransfer =  getSVTTransfer(transaction, transaction.transferCount);

    transaction.transferCount = transaction.transferCount + 1;
    
    svtTransfer.smartVault = smartVault.id;
    svtTransfer.from = from;
    svtTransfer.to = to;
    svtTransfer.amount = amount;
    svtTransfer.timestamp = event.block.timestamp.toI32();
    svtTransfer.blockNumber = event.block.number.toI32();
    
    transaction.save();
    svtTransfer.save();

    setAnalyticsUserSVTTransfer(event, svtTransfer);
}

export function handleTransferSingle(event: TransferSingle): void {
    logEventName("handleTransferSingle", event);

    let id = event.params.id;
    let from = getUser( event.params.from.toHexString() );
    let to = getUser( event.params.to.toHexString() );
    _updateNFT(event, from, to, id);
}

export function handleTransferBatch(event: TransferBatch): void {
    logEventName("handleTransferBatch", event);

    for (let i = 0; i < event.params.ids.length; i++) {
        let id = event.params.ids[i];
        let from = getUser( event.params.from.toHexString() );
        let to = getUser( event.params.to.toHexString() );
        _updateNFT(event, from, to, id);
    }
}

function _updateNFT(event: ethereum.Event, from: User, to: User, id: BigInt): void {

    let smartVault = getSmartVault( event.address.toHexString() );
    let timestamp = event.block.timestamp.toI32();
    let isBurned = to.id == ZERO_ADDRESS.toHexString();

    // add transfer
    if(id.le(MAXIMAL_DEPOSIT_ID)){

        let smartVaultDepositNFT = getSmartVaultDepositNFT(smartVault.id, id);
        if(!isBurned) smartVaultDepositNFT.owner = to.id;
        let transferCount = smartVaultDepositNFT.transferCount;

        let smartVaultDepositNFTTransfer = getSmartVaultDepositNFTTransfer(
            smartVaultDepositNFT, transferCount
        );

        smartVaultDepositNFTTransfer.from = from.id;
        smartVaultDepositNFTTransfer.to = to.id;
        smartVaultDepositNFTTransfer.timestamp = timestamp;
        smartVaultDepositNFTTransfer.blockNumber = event.block.number.toI32();
        smartVaultDepositNFTTransfer.amount = smartVaultDepositNFT.shares;
        smartVaultDepositNFTTransfer.save();

        smartVaultDepositNFT.transferCount = transferCount + 1;
        smartVaultDepositNFT.save();

        setAnalyticsUserDepositNFTTransfer(event, smartVaultDepositNFTTransfer);
    }else {

        let smartVaultWithdrawalNFT = getSmartVaultWithdrawalNFT(smartVault.id, id);
        if(!isBurned) smartVaultWithdrawalNFT.owner = to.id;
        let transferCount = smartVaultWithdrawalNFT.transferCount;

        let smartVaultWithdrawalNFTTransfer = getSmartVaultWithdrawalNFTTransfer(
            smartVaultWithdrawalNFT, transferCount
        );

        smartVaultWithdrawalNFTTransfer.from = from.id;
        smartVaultWithdrawalNFTTransfer.to = to.id;
        smartVaultWithdrawalNFTTransfer.timestamp = timestamp;
        smartVaultWithdrawalNFTTransfer.blockNumber = event.block.number.toI32();
        smartVaultWithdrawalNFTTransfer.amount = smartVaultWithdrawalNFT.shares;
        smartVaultWithdrawalNFTTransfer.save();
        
        smartVaultWithdrawalNFT.transferCount = transferCount + 1;
        smartVaultWithdrawalNFT.save();

        setAnalyticsUserWithdrawalNFTTransfer(event, smartVaultWithdrawalNFTTransfer);
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
        smartVaultDepositNFTTransfer.blockNumber = 0;
        smartVaultDepositNFTTransfer.amount = ZERO_BI;

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
        smartVaultWithdrawalNFTTransfer.blockNumber = 0;
        smartVaultWithdrawalNFTTransfer.amount = ZERO_BI;

        smartVaultWithdrawalNFTTransfer.save();
    }

    return smartVaultWithdrawalNFTTransfer;
}


export function getTransaction(transactionId: string): Transaction {

    let smartVaultTransaction = Transaction.load(transactionId);

    if (smartVaultTransaction == null) {
        smartVaultTransaction = new Transaction(transactionId);

        smartVaultTransaction.transferCount = 0;

        smartVaultTransaction.save();
    }

    return smartVaultTransaction;
}

export function getSVTTransfer(transaction: Transaction, index: i32): SVTTransfer {

    let id = transaction.id + "-" + index.toString();
    let smartVaultTransfer = SVTTransfer.load(id);

    if (smartVaultTransfer == null) {
        smartVaultTransfer = new SVTTransfer(id);

        smartVaultTransfer.transaction = transaction.id;
        smartVaultTransfer.index = index;
        smartVaultTransfer.smartVault = "";
        smartVaultTransfer.from = ZERO_ADDRESS.toHexString();
        smartVaultTransfer.to = ZERO_ADDRESS.toHexString();
        smartVaultTransfer.amount = ZERO_BD;
        smartVaultTransfer.timestamp = 0;
        smartVaultTransfer.blockNumber = 0;

        smartVaultTransfer.save();
    }

    return smartVaultTransfer;
}
