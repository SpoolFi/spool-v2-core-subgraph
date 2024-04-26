import {BigDecimal, Address, BigInt, ethereum, log, ByteArray} from "@graphprotocol/graph-ts";
import {
    ClaimAnalyticsUserType, 
    DepositNFTBurnAnalyticsUserType, 
    DepositNFTTransferAnalyticsUserType, 
    DepositAnalyticsUserType, 
    FastRedeemAnalyticsUserType, 
    RedeemAnalyticsUserType, 
    SVTTransferAnalyticsUserType, 
    SmartVault, 
    SmartVaultFees, 
    Token, 
    User, 
    AnalyticsUser, 
    AnalyticsUserTypeToken, 
    WithdrawalNFTBurnAnalyticsUserType, 
    WithdrawalNFTTransferAnalyticsUserType, 
    RewardClaimAnalyticsUserType
} from "../../generated/schema";
import {BTokenContract} from "../../generated/AssetGroupRegistry/BTokenContract";
import {BTokenBytesContract} from "../../generated/AssetGroupRegistry/BTokenBytesContract";


export let SECONDS_IN_HOUR = 3600;
export let WEEKS_IN_YEAR = 52;
export let SECONDS_IN_DAY = SECONDS_IN_HOUR * 24;
export let SECONDS_IN_WEEK = SECONDS_IN_DAY * 7;
export let SECONDS_IN_YEAR = SECONDS_IN_WEEK * WEEKS_IN_YEAR;
export let SECONDS_IN_MONTH = SECONDS_IN_YEAR / 12;

export const ZERO_BD = BigDecimal.fromString("0");
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const ONE_BD = BigDecimal.fromString("1");
export const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");
export const APY_DECIMALS = 12;
export const RISK_SCORE_DECIMALS = 1;
export const PERCENTAGE_DECIMALS = 2;
export const NFT_INITIAL_SHARES = BigInt.fromI32(1000000);
const MASK_16_BIT = BigInt.fromU32(65_535);
// 2^255
export const MAXIMAL_DEPOSIT_ID = BigInt.fromString("57896044618658097711785492504343953926634992332820282019728792003956564819968");
export const GHOST_STRATEGY_ADDRESS = Address.fromString('{{ ghostStrategy }}');
export const STRATEGY_REGISTRY_ADDRESS = Address.fromString('{{ strategyRegistry }}');

export function logEventName(name: string, event: ethereum.Event): void {
    log.info("{}: tx={} block={}", [
        name,
        event.transaction.hash.toHexString(),
        event.block.number.toString(),
    ]);
}


export function logValue(name: string, value: i32): void {
    log.info("{}: value: {}", [
        name,
        value.toString()
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
        smartVault.symbol = "";
        smartVault.assetGroup = "0";
        smartVault.lastRebalanceTime = ZERO_BI;
        smartVault.rebalanceCount = 0;
        smartVault.fastRedeemCount = 0;
        smartVault.smartVaultOwner = ZERO_ADDRESS.toHexString();
        smartVault.createdOn = ZERO_BI;
        smartVault.svtTotalSupply = ZERO_BD;
        smartVault.guardsInitialized = false;
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
        smartVaultFees.performanceFeePercentage = ZERO_BD;
        smartVaultFees.depositFeePercentage = ZERO_BD;
        smartVaultFees.managementFeePercentage = ZERO_BD;
        smartVaultFees.performanceFeeMinted = ZERO_BI;
        smartVaultFees.depositFeeMinted = ZERO_BI;
        smartVaultFees.managementFeeMinted = ZERO_BI;
        smartVaultFees.save();
    }

    return smartVaultFees;
}

export function getUser(userAddress: string): User {
    let user = User.load(userAddress);

    if (user == null) {
        user = new User(userAddress);
        user.transactionCount = 0;
        user.save();
    }

    return user;
}

export function getAnalyticsUser(userAddress: string, transactionCount: i32): AnalyticsUser {
    let id = getComposedId(userAddress, transactionCount.toString());
    let userTransaction = AnalyticsUser.load(id);

    if (userTransaction == null) {
        userTransaction = new AnalyticsUser(id);
        userTransaction.user = userAddress;
        userTransaction.count = transactionCount;
        userTransaction.timestamp = 0;
        userTransaction.blockNumber = 0;
        userTransaction.txHash = "";
        userTransaction.smartVault = "";
        userTransaction.type = "";
        userTransaction.save();
    }

    return userTransaction;
}

export function getDepositAnalyticsUserType(userTransaction: AnalyticsUser): DepositAnalyticsUserType {
    let id = getComposedId(userTransaction.id, "DEPOSIT");
    let depositAnalyticsUserType = DepositAnalyticsUserType.load(id);

    if (depositAnalyticsUserType == null) {
        depositAnalyticsUserType = new DepositAnalyticsUserType(id);
        depositAnalyticsUserType.type = "DEPOSIT";
        depositAnalyticsUserType.tokenData = [];
        depositAnalyticsUserType.smartVaultFlush = "";
        depositAnalyticsUserType.dNFT = "";
        depositAnalyticsUserType.save();
    }

    return depositAnalyticsUserType;
}


export function getRedeemAnalyticsUserType(userTransaction: AnalyticsUser): RedeemAnalyticsUserType {
    let id = getComposedId(userTransaction.id, "REDEEM");
    let redeemAnalyticsUserType = RedeemAnalyticsUserType.load(id);

    if (redeemAnalyticsUserType == null) {
        redeemAnalyticsUserType = new RedeemAnalyticsUserType(id);
        redeemAnalyticsUserType.type = "REDEEM";
        redeemAnalyticsUserType.smartVaultFlush = "";
        redeemAnalyticsUserType.svts = ZERO_BD;
        redeemAnalyticsUserType.wNFT = "";
        redeemAnalyticsUserType.save();
    }

    return redeemAnalyticsUserType;
}

export function getClaimAnalyticsUserType(userTransaction: AnalyticsUser): ClaimAnalyticsUserType {
    let id = getComposedId(userTransaction.id, "CLAIM");
    let claimAnalyticsUserType = ClaimAnalyticsUserType.load(id);

    if (claimAnalyticsUserType == null) {
        claimAnalyticsUserType = new ClaimAnalyticsUserType(id);
        claimAnalyticsUserType.type = "CLAIM";
        claimAnalyticsUserType.tokenData = [];
        claimAnalyticsUserType.wNFTs = [];
        claimAnalyticsUserType.save();
    }

    return claimAnalyticsUserType;
}

export function getFastRedeemAnalyticsUserType(userTransaction: AnalyticsUser): FastRedeemAnalyticsUserType {
    let id = getComposedId(userTransaction.id, "FAST_REDEEM");
    let fastRedeemAnalyticsUserType = FastRedeemAnalyticsUserType.load(id);

    if (fastRedeemAnalyticsUserType == null) {
        fastRedeemAnalyticsUserType = new FastRedeemAnalyticsUserType(id);
        fastRedeemAnalyticsUserType.type = "FAST_REDEEM";
        fastRedeemAnalyticsUserType.tokenData = [];
        fastRedeemAnalyticsUserType.save();
    }

    return fastRedeemAnalyticsUserType;
}

export function getSVTTransferAnalyticsUserType(userTransaction: AnalyticsUser): SVTTransferAnalyticsUserType {
    let id = getComposedId(userTransaction.id, "SVT_TRANSFER");
    let svtTransferAnalyticsUserType = SVTTransferAnalyticsUserType.load(id);

    if (svtTransferAnalyticsUserType == null) {
        svtTransferAnalyticsUserType = new SVTTransferAnalyticsUserType(id);
        svtTransferAnalyticsUserType.type = "SVT_TRANSFER";
        svtTransferAnalyticsUserType.to = "";
        svtTransferAnalyticsUserType.amount = ZERO_BD;
        svtTransferAnalyticsUserType.save();
    }

    return svtTransferAnalyticsUserType;
}

export function getDepositNFTTransferAnalyticsUserType(userTransaction: AnalyticsUser): DepositNFTTransferAnalyticsUserType {
    let id = getComposedId(userTransaction.id, "DEPOSIT_NFT_TRANSFER");
    let depositNFTTransferAnalyticsUserType = DepositNFTTransferAnalyticsUserType.load(id);

    if (depositNFTTransferAnalyticsUserType == null) {
        depositNFTTransferAnalyticsUserType = new DepositNFTTransferAnalyticsUserType(id);
        depositNFTTransferAnalyticsUserType.type = "DEPOSIT_NFT_TRANSFER";
        depositNFTTransferAnalyticsUserType.smartVaultDepositNFTTransfer = "";
        depositNFTTransferAnalyticsUserType.save();
    }

    return depositNFTTransferAnalyticsUserType;
}

export function getWithdrawalNFTTransferAnalyticsUserType(userTransaction: AnalyticsUser): WithdrawalNFTTransferAnalyticsUserType {
    let id = getComposedId(userTransaction.id, "WITHDRAWAL_NFT_TRANSFER");
    let withdrawalNFTTransferAnalyticsUserType = WithdrawalNFTTransferAnalyticsUserType.load(id);

    if (withdrawalNFTTransferAnalyticsUserType == null) {
        withdrawalNFTTransferAnalyticsUserType = new WithdrawalNFTTransferAnalyticsUserType(id);
        withdrawalNFTTransferAnalyticsUserType.type = "WITHDRAWAL_NFT_TRANSFER";
        withdrawalNFTTransferAnalyticsUserType.smartVaultWithdrawalNFTTransfer = "";
        withdrawalNFTTransferAnalyticsUserType.save();
    }

    return withdrawalNFTTransferAnalyticsUserType;
}

export function getDepositNFTBurnAnalyticsUserType(userTransaction: AnalyticsUser): DepositNFTBurnAnalyticsUserType {
    let id = getComposedId(userTransaction.id, "DEPOSIT_NFT_BURN");
    let depositNFTBurnAnalyticsUserType = DepositNFTBurnAnalyticsUserType.load(id);

    if (depositNFTBurnAnalyticsUserType == null) {
        depositNFTBurnAnalyticsUserType = new DepositNFTBurnAnalyticsUserType(id);
        depositNFTBurnAnalyticsUserType.type = "DEPOSIT_NFT_BURN";
        depositNFTBurnAnalyticsUserType.dNFTBurned = "";
        depositNFTBurnAnalyticsUserType.save();
    }

    return depositNFTBurnAnalyticsUserType;
}

export function getWithdrawalNFTBurnAnalyticsUserType(userTransaction: AnalyticsUser): WithdrawalNFTBurnAnalyticsUserType {
    let id = getComposedId(userTransaction.id, "WITHDRAWAL_NFT_BURN");
    let withdrawalNFTBurnAnalyticsUserType = WithdrawalNFTBurnAnalyticsUserType.load(id);

    if (withdrawalNFTBurnAnalyticsUserType == null) {
        withdrawalNFTBurnAnalyticsUserType = new WithdrawalNFTBurnAnalyticsUserType(id);
        withdrawalNFTBurnAnalyticsUserType.type = "WITHDRAWAL_NFT_BURN";
        withdrawalNFTBurnAnalyticsUserType.wNFTBurned = "";
        withdrawalNFTBurnAnalyticsUserType.save();
    }

    return withdrawalNFTBurnAnalyticsUserType;
}

export function getRewardClaimAnalyticsUserType(userTransaction: AnalyticsUser): RewardClaimAnalyticsUserType {
    let id = getComposedId(userTransaction.id, "REWARD_CLAIM");
    let rewardClaimAnalyticsUserType = RewardClaimAnalyticsUserType.load(id);

    if (rewardClaimAnalyticsUserType == null) {
        rewardClaimAnalyticsUserType = new RewardClaimAnalyticsUserType(id);
        rewardClaimAnalyticsUserType.type = "REWARD_CLAIM";
        rewardClaimAnalyticsUserType.rewardData = "";
        rewardClaimAnalyticsUserType.save();
    }

    return rewardClaimAnalyticsUserType;
}


export function getAnalyticsUserTypeToken(userTransactionType: string, token: Token): AnalyticsUserTypeToken {
    let id = getComposedId(userTransactionType, token.id);
    let userTransactionTypeToken = AnalyticsUserTypeToken.load(id);

    if (userTransactionTypeToken == null) {
        userTransactionTypeToken = new AnalyticsUserTypeToken(id);
        userTransactionTypeToken.token = token.id;
        userTransactionTypeToken.amount = ZERO_BD;
        userTransactionTypeToken.save();
    }

    return userTransactionTypeToken;
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

export function getArrayFromUint16a16(uint16a16: BigInt, arrayLength: i32): i32[] {
    let values: i32[] = [];

    for (let i = 0; i < arrayLength; i++) {
        let value = uint16a16.bitAnd(MASK_16_BIT);

        values[i] = value.toI32();

        uint16a16 = uint16a16.rightShift(16);
    }

    return values;
}

export function getByteArray(value: string): ByteArray {

    if(value.length % 2 != 0){
        value = value + "0";
    }
    let byteArray = ByteArray.fromHexString(value);
    return byteArray;
}

