import {BigInt} from "@graphprotocol/graph-ts";
import {AnalyticsVault, SmartVault} from "../generated/schema";
import {SECONDS_IN_DAY, SECONDS_IN_HOUR, SECONDS_IN_MONTH, SECONDS_IN_WEEK, SECONDS_IN_YEAR} from "./utils/helpers";

export function updateVaultAnalytics(smartVault: SmartVault, timestamp: i32, key: string, value: BigInt): void {
    // Update Analytics, done individually because assembly script doesn't support for loops
    let total = getTotalAnalyticsVault(smartVault);
    total.setBigInt(key + "Total", total.getBigInt(key + "Total").plus(value));
    total.save();
    let totalValue = total.getBigInt(key + "Total");

    let hourly = getAnalyticsVault(smartVault, timestamp, "HOURLY");
    hourly.setBigInt(key, hourly.getBigInt(key).plus(value));
    hourly.setBigInt(key + "Total", totalValue);
    hourly.save();

    let daily = getAnalyticsVault(smartVault, timestamp, "DAILY");
    daily.setBigInt(key, daily.getBigInt(key).plus(value));
    daily.setBigInt(key + "Total", totalValue);
    daily.save();

    let weekly = getAnalyticsVault(smartVault, timestamp, "WEEKLY");
    weekly.setBigInt(key, weekly.getBigInt(key).plus(value));
    weekly.setBigInt(key + "Total", totalValue);
    weekly.save();

    let monthly = getAnalyticsVault(smartVault, timestamp, "MONTHLY");
    monthly.setBigInt(key, monthly.getBigInt(key).plus(value));
    monthly.setBigInt(key + "Total", totalValue);
    monthly.save();

    let yearly = getAnalyticsVault(smartVault, timestamp, "YEARLY");
    yearly.setBigInt(key, yearly.getBigInt(key).plus(value));
    yearly.setBigInt(key + "Total", totalValue);
    yearly.save();
}

export function getAnalyticsVault(smartVault: SmartVault, timestamp: i32, periodType: string): AnalyticsVault {
    let startTimestamp = getPeriodStartTimestamp(timestamp, periodType);
    let id = smartVault.id.concat(periodType + "-" + startTimestamp.toString());
    let dataPoint = AnalyticsVault.load(id);
    if (dataPoint == null) {
        dataPoint = new AnalyticsVault(id);
        let total = getTotalAnalyticsVault(smartVault);
        
        dataPoint.smartVault = smartVault.id;
        dataPoint.startTimestamp = startTimestamp;
        dataPoint.periodType = periodType;
        dataPoint.performanceFees = BigInt.fromI32(0);
        dataPoint.performanceFeesTotal = total.performanceFeesTotal;
        dataPoint.depositFees = BigInt.fromI32(0);
        dataPoint.depositFeesTotal = total.depositFeesTotal;
        dataPoint.managementFees = BigInt.fromI32(0);
        dataPoint.managementFeesTotal = total.managementFeesTotal;

        dataPoint.save();
    }
    return dataPoint;
}

export function getTotalAnalyticsVault(smartVault: SmartVault): AnalyticsVault {
    let id = smartVault.id.concat("TOTAL");
    let dataPoint = AnalyticsVault.load(id);
    if (dataPoint == null) {
        dataPoint = new AnalyticsVault(id);

        dataPoint.smartVault = smartVault.id;
        dataPoint.startTimestamp = 0;
        dataPoint.periodType = "TOTAL";
        dataPoint.performanceFees = BigInt.fromI32(0);
        dataPoint.performanceFeesTotal = BigInt.fromI32(0);
        dataPoint.depositFees = BigInt.fromI32(0);
        dataPoint.depositFeesTotal = BigInt.fromI32(0);
        dataPoint.managementFees = BigInt.fromI32(0);
        dataPoint.managementFeesTotal = BigInt.fromI32(0);

        dataPoint.save();
    }
    return dataPoint;
}

function roundTimestamp(timestamp: i32, periodLength: i32): i32 {
    return timestamp - (timestamp % periodLength);
}

function getPeriodStartTimestamp(timestamp: i32, periodType: string): i32 {
    if (periodType == "HOURLY") {
        return roundTimestamp(timestamp, SECONDS_IN_HOUR);
    }
    if (periodType == "DAILY") {
        return roundTimestamp(timestamp, SECONDS_IN_DAY);
    }
    if (periodType == "WEEKLY") {
        return roundTimestamp(timestamp, SECONDS_IN_WEEK);
    }
    if (periodType == "MONTHLY") {
        return roundTimestamp(timestamp, SECONDS_IN_MONTH);
    }
    if (periodType == "YEARLY") {
        return roundTimestamp(timestamp, SECONDS_IN_YEAR);
    }
    return 0; // periodType == "TOTAL"
}
