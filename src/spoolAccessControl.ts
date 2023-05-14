import {Bytes} from "@graphprotocol/graph-ts";
import {RoleGranted, RoleRevoked} from "../generated/SpoolAccessControl/SpoolAccessControlContract";
import {RiskProvider} from "../generated/schema";
import {ZERO_BI, logEventName} from "./utils/helpers";

const ROLE_RISK_PROVIDER = Bytes.fromHexString(
    "0xbad5650587693118f88d1a4c7b6b5fc6cc7f1580672205b666e9e91389df9f66"
);

export function handleRoleGranted(event: RoleGranted): void {
    logEventName("handleRoleGranted", event);
    if (event.params.role.equals(ROLE_RISK_PROVIDER)) {
        let riskProvider = getRiskProvider(event.params.account.toHexString());
        riskProvider.isRemoved = false;
        riskProvider.addedOn = event.block.timestamp;
        riskProvider.save();
    }
}

export function handleRoleRevoked(event: RoleRevoked): void {
    logEventName("handleRoleRevoked", event);
    if (event.params.role.equals(ROLE_RISK_PROVIDER)) {
        let riskProvider = getRiskProvider(event.params.account.toHexString());
        riskProvider.isRemoved = true;
        riskProvider.save();
    }
}

function getRiskProvider(riskProviderAddress: string): RiskProvider {
    let riskProvider = RiskProvider.load(riskProviderAddress);

    if (riskProvider == null) {
        riskProvider = new RiskProvider(riskProviderAddress);
        riskProvider.isRemoved = false;
        riskProvider.addedOn = ZERO_BI;
        riskProvider.save();
    }

    return riskProvider;
}
