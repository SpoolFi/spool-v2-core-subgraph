import {ZERO_ADDRESS, ZERO_BI, getSmartVault, logEventName, logValue, getByteArray} from "./utils/helpers";

import { crypto } from "@graphprotocol/graph-ts";

import {
    GuardsInitialized
} from "../generated/GuardManager/GuardManagerContract";
import {Guard, GuardToParameter, Parameter, ParameterType, RequestType, SmartVault, SmartVaultToGuard} from "../generated/schema";

export function handleGuardsInitialized(event: GuardsInitialized): void {
    logEventName("handleGuardsInitialized", event);

    let smartVaultAddress = event.params.smartVault.toHexString();
    let guardDefinitions = event.params.guards;
    let requestTypes = event.params.requestTypes;
    
    // set guards initialized
    let smartVault = getSmartVault(smartVaultAddress);
    smartVault.guardsInitialized = true;
    smartVault.save();

    // set guards
    logValue("guardDefinitions.length", guardDefinitions.length);
    for (let i = 0; i < guardDefinitions.length; i++) {
        let guards = guardDefinitions[i];
        let requestType = getRequestType(requestTypes[i]);

        logValue("guards.length", guards.length);
        for (let j = 0; j < guards.length; j++) {
            let contractAddress = guards[j].contractAddress.toHexString();
            let methodSignature = guards[j].methodSignature;
            let expectedValue = guards[j].expectedValue.toHexString();
            let operator = guards[j].operator.toHexString();

            // initialize hash data
            let hashData = getByteArray(
                 contractAddress
                .concat(methodSignature)
                .concat(expectedValue)
                .concat(operator)
                .concat(requestType.id)
            );

            // handle parameters
            let parameterTypes = guards[j].methodParamTypes;
            logValue("parameterTypes.length", parameterTypes.length);
            for(let k = 0; k < parameterTypes.length; k++){
                let parameterType = getParameterType(parameterTypes[k]);
                parameterType.save();

                hashData.concat(getByteArray(parameterType.id));
            }
            
            // hash of all data for ID
            let hashID = crypto.keccak256(hashData).toHexString();
            
            // set guard
            let guard = getGuard(hashID);
            guard.contractAddress = contractAddress;
            guard.methodSignature = methodSignature;
            guard.expectedValue = guards[j].expectedValue;
            guard.operator = guards[j].operator.toI32();
            guard.requestType = requestType.id;
            guard.save();

            // set smart vault to guard
            getSmartVaultToGuard(smartVault, guard);
        }
    }
}

function getParameter(parameterTypeID: i32, parameterValue: string): Parameter {
    let parameterType = getParameterType(parameterTypeID);
    let parameter = Parameter.load(parameterType.id + "-" + parameterValue);
    if(parameter == null){
        parameter = new Parameter(parameterType.id + "-" + parameterValue);
        parameter.parameterType = parameterType.id;
        parameter.value = parameterValue;
        parameter.save();
    }
    return parameter;
}

function getParameterType(parameterTypeID: i32): ParameterType {
    let parameterType = ParameterType.load(parameterTypeID.toString());
    if(parameterType == null){
        parameterType = new ParameterType(parameterTypeID.toString());
        switch(parameterTypeID){
            case 0:
                parameterType.type = "vaultAddress";
                break;
            case 1:
                parameterType.type = "Executor";
                break;
            case 2:
                parameterType.type = "Receiver";
                break;
            case 3:
                parameterType.type = "Owner";
                break;
            case 4:
                parameterType.type = "Assets";
                break;
            case 5:
                parameterType.type = "Tokens";
                break;
            case 6:
                parameterType.type = "AssetGroup";
                break;
            case 7:
                parameterType.type = "CustomValue";
                break;
            case 8:
                parameterType.type = "DynamicCustomValue";
        }
        parameterType.save();
    }
    return parameterType;
}

function getRequestType(requestTypeID: i32): RequestType {
    let requestType = RequestType.load(requestTypeID.toString());
    if(requestType == null){
        requestType = new RequestType(requestTypeID.toString());
        switch(requestTypeID){
            case 0:
                requestType.type = "Deposit";
                break;
            case 1:
                requestType.type = "Withdrawal";
                break;
            case 2:
                requestType.type = "TransferNFT";
                break;
            case 3:
                requestType.type = "BurnNFT";
                break;
            case 4:
                requestType.type = "TransferSVTs";
                break;
        }
        requestType.save();
    }
    return requestType;
}

function getGuard(hashID: string): Guard {
    let guard = Guard.load(hashID);
    if(guard == null){
        guard = new Guard(hashID);

        guard.contractAddress = ZERO_ADDRESS.toHexString();
        guard.methodSignature = "";
        guard.expectedValue = ZERO_BI;
        guard.operator = 0;
        guard.requestType = "";

        guard.save();
    }
    return guard;
}

function getGuardToParameter(guard: Guard, parameter: Parameter): GuardToParameter {
    let guardToParameter = GuardToParameter.load(guard.id + "-" + parameter.id);
    if(guardToParameter == null){
        guardToParameter = new GuardToParameter(guard.id + "-" + parameter.id);
        guardToParameter.guard = guard.id;
        guardToParameter.parameter = parameter.id;
        guardToParameter.save();
    }
    return guardToParameter;
}

function getSmartVaultToGuard(smartVault: SmartVault, guard: Guard): SmartVaultToGuard {
    let smartVaultToGuard = SmartVaultToGuard.load(smartVault.id + "-" + guard.id);
    if(smartVaultToGuard == null){
        smartVaultToGuard = new SmartVaultToGuard(smartVault.id + "-" + guard.id);
        smartVaultToGuard.guard = guard.id;
        smartVaultToGuard.smartVault = smartVault.id;
        smartVaultToGuard.save();
    }
    return smartVaultToGuard;
}
