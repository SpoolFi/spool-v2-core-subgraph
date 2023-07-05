import {getSmartVault, logEventName} from "./utils/helpers";

import { crypto, ByteArray } from "@graphprotocol/graph-ts";

import {
    GuardsInitialized
} from "../generated/GuardManager/GuardManagerContract";


export function handleGuardsInitialized(event: GuardsInitialized): void {
    logEventName("handleGuardsInitialized", event);

    //let smartVaultAddress = event.params.smartVault.toHexString();
    //let guardDefinitions = event.params.guards;
    //let requestTypes = event.params.requestTypes;
    //
    //// set guards initialized
    //let smartVault = getSmartVault(smartVaultAddress);
    //smartVault.guardsInitialized = true;
    //smartVault.save();

    //// set guards
    //for (let i = 0; i < guardDefinitions.length; i++) {
    //    let guards = guardDefinitions[i];
    //    let requestType = requestTypes[i].toHexString();

    //    for (let j = 0; j < guards.length; j++) {
    //        let contractAddress = guards[j].contractAddress.toHexString();
    //        let methodSignature = guards[j].methodSignature;
    //        let expectedValue = guards[j].expectedValue.toHexString();
    //        let operator = guards[j].operator.toHexString();
    //        let parameterTypes = guards[j].methodParamTypes;
    //        let methodParamValues = guards[j].methodParamValues;



    //        let hashData =
    //        smartVault.guards.push(guard.toHexString() + "-" + requestType.toHexString());
    //    }


    //    smartVault.guards.push(guard);
    //    smartVault.requestTypes.push(requestType);
    //}
}
