import {getSmartVault, logEventName} from "./utils/helpers";

import {
    GuardsInitialized
} from "../generated/GuardManager/GuardManagerContract";


export function handleGuardsInitialized(event: GuardsInitialized): void {
    logEventName("handleGuardsInitialized", event);

    let smartVaultAddress = event.params.smartVault.toHexString();
    let guards = event.params.guards;
    let requestTypes = event.params.requestTypes;

    let smartVault = getSmartVault(event.address.toHexString());
    smartVault.guardsInitialized = true;
    smartVault.save();
}
