import {BigDecimal, Address, BigInt, ethereum, log} from "@graphprotocol/graph-ts";
import {SmartVault, SmartVaultFees, Token, User} from "../../generated/schema";
import {BTokenContract} from "../../generated/AssetGroupRegistry/BTokenContract";
import {BTokenBytesContract} from "../../generated/AssetGroupRegistry/BTokenBytesContract";
import {SmartVaultContract} from "../../generated/SmartVaultManager/SmartVaultContract";

export const ZERO_BD = BigDecimal.fromString("0");
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const ONE_BD = BigDecimal.fromString("1");
export const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");
export const APY_DECIMALS = 12;
export const RISK_SCORE_DECIMALS = 1;
export const PERCENTAGE_DECIMALS = 2;

export function logEventName(name: string, event: ethereum.Event): void {
    log.info("{}: tx={} block={}", [
        name,
        event.transaction.hash.toHexString(),
        event.block.number.toString(),
    ]);
}

export function integerToDecimal(amount: BigInt, decimals: i32): BigDecimal {
    let scale = BigInt.fromI32(10)
        .pow(decimals as u8)
        .toBigDecimal();
    return amount.toBigDecimal().div(scale);
}

export function createTokenEntity(address: string): Token {
    let token = Token.load(address);
    if (token == null) {
        let tokenContract = BTokenContract.bind(Address.fromString(address));
        let tokenBytes = BTokenBytesContract.bind(Address.fromString(address));
        let symbol = "";
        let name = "";
        let decimals = 0;
        let symbolCall = tokenContract.try_symbol();
        let nameCall = tokenContract.try_name();
        let decimalCall = tokenContract.try_decimals();
        if (symbolCall.reverted) {
            let symbolBytesCall = tokenBytes.try_symbol();
            if (!symbolBytesCall.reverted) {
                symbol = symbolBytesCall.value.toString();
            }
        } else {
            symbol = symbolCall.value;
        }
        if (nameCall.reverted) {
            let nameBytesCall = tokenBytes.try_name();
            if (!nameBytesCall.reverted) {
                name = nameBytesCall.value.toString();
            }
        } else {
            name = nameCall.value;
        }

        if (!decimalCall.reverted) {
            decimals = decimalCall.value;
        }
        token = new Token(address);
        token.name = name;
        token.symbol = symbol;
        token.decimals = decimals;

        token.save();
    }
    return token;
}

export function getSmartVault(smartVaultAddress: string): SmartVault {
    let smartVault = SmartVault.load(smartVaultAddress);

    if (smartVault == null) {
        let smartVaultFees = getSmartVaultFees(smartVaultAddress);

        smartVault = new SmartVault(smartVaultAddress);
        smartVault.name = "";
        smartVault.assetGroup = "0";
        smartVault.smartVaultCreator = ZERO_ADDRESS.toHexString();
        smartVault.smartVaultOwner = ZERO_ADDRESS.toHexString();
        smartVault.createdOn = ZERO_BI;
        smartVault.smartVaultFees = smartVaultFees.id;
        smartVault.smartVaultStrategies = [];
        smartVault.save();
    }

    return smartVault;
}

export function getSmartVaultFees(smartVaultAddress: string): SmartVaultFees {
    let smartVaultFees = SmartVaultFees.load(smartVaultAddress);

    if (smartVaultFees == null) {
        smartVaultFees = new SmartVaultFees(smartVaultAddress);
        smartVaultFees.peformanceFeePercentage = ZERO_BD;
        smartVaultFees.depositFeePercentage = ZERO_BD;
        smartVaultFees.managementFeePercentage = ZERO_BD;
        smartVaultFees.save();
    }

    return smartVaultFees;
}

export function getUser(userAddress: string): User {
    let user = User.load(userAddress);

    if (user == null) {
        user = new User(userAddress);
        user.save();
    }

    return user;
}

export function getComposedId(
    firstId: string,
    secondId: string,
    thirdId: string | null = null
): string {
    if (thirdId) {
        return `${firstId}-${secondId}-${thirdId}`;
    }

    return `${firstId}-${secondId}`;
}

export function strategyApyToDecimal(apy: BigInt): BigDecimal {
    return integerToDecimal(apy, APY_DECIMALS);
}

export function strategyRiskScoreToDecimal(riskScore: BigInt): BigDecimal {
    return integerToDecimal(riskScore, RISK_SCORE_DECIMALS);
}

export function percentToDecimal(percent: BigInt): BigDecimal {
    return integerToDecimal(percent, PERCENTAGE_DECIMALS);
}

export function percenti32ToDecimal(percent: i32): BigDecimal {
    return percentToDecimal(BigInt.fromI32(percent));
}

export function getTokenDecimalAmountFromAddress(amount: BigInt, token: string): BigDecimal {
    return getTokenDecimalAmount(amount, createTokenEntity(token));
}

export function getTokenDecimalAmount(amount: BigInt, token: Token): BigDecimal {
    return integerToDecimal(
        amount,
        token.decimals
    );
}
