import {getSmartVault, logEventName} from "./utils/helpers";

import {SmartVaultDeployed} from "../generated/SmartVaultFactoryHpf/SmartVaultFactoryHpfContract";

export function handleSmartVaultDeployed(event: SmartVaultDeployed): void {
    logEventName("handleSmartVaultDeployed", event);

    let smartVault = getSmartVault(event.params.smartVault.toHexString());
    let deployer = event.params.deployer.toHexString();

    smartVault.smartVaultOwner = deployer;

    smartVault.save();
}
