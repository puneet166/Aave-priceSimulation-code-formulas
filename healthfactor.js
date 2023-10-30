const { typeOf } = require("mathjs");

// Function to calculate the health factor.
async function calculateHealthFactor(totalBorrowInETH, collateralArray, thresholdArray) {
    // Ensure that all values are in wei.
    let sum = 0;
    if (totalBorrowInETH == 0) {
        return 0; // If there is no borrowing, health factor is 0.
    }
    for (let i = 0; i < collateralArray.length; i++) {
        sum += collateralArray[i] * thresholdArray[i];
    }
    sum = sum / 100; // Convert the sum to a percentage.
    // 0.01 is fees, so calculate health factor.
    const health = sum / totalBorrowInETH;
    return health;
}

// Function to calculate the liquidation threshold.
async function calculateLiquidationThreshold(totalCollateralInETH, collateralArray, thresholdArray) {
    let sum = 0;
    for (let i = 0; i < collateralArray.length; i++) {
        sum += collateralArray[i] * thresholdArray[i];
    }
    return sum / totalCollateralInETH;
}

// Function to calculate Net Asset Value.
async function calculateNAV(totalValueOfAssets, totalDebt) {
    return totalValueOfAssets - totalDebt;
}

// Function to calculate Current Loan to Value (LTV).
async function calculateCurrentLTV(outstandingLoanAmount, collateralValue) {
    return (outstandingLoanAmount / collateralValue) * 100; // Multiply by 100 to get percentage.
}

// Function to calculate utilized borrowing power.
async function utilizedBorrowingPower(totalValueOfBorrowAssets, totalValueOfBorrowedAssets) {
    return (totalValueOfBorrowedAssets / totalValueOfBorrowAssets) * 100;
}

// Function to calculate the available amount to borrow.
async function calculateAvailableToBorrow(collateralBalance, ltvRatio, totalBorrow) {
    // Convert the LTV ratio to a decimal.
    const ltvRatioDecimal = ltvRatio / 100;
    // Calculate the Available to Borrow amount.
    const availableToBorrow = collateralBalance * ltvRatioDecimal;
    // Return the Available to Borrow amount, minus the total borrowing.
    return availableToBorrow - totalBorrow;
}

// Function to check if an account is eligible for liquidation based on health factor.
async function isEligibleForLiquidation(healthFactor) {
    return healthFactor <= 1 ? true : false;
}

// Function to check if an account is at risk for liquidation based on health factor.
async function isRiskForLiquidation(healthFactor) {
    return healthFactor < 1.5 ? true : false;
}

module.exports = {
    calculateHealthFactor,
    calculateLiquidationThreshold,
    calculateAvailableToBorrow,
    calculateNAV,
    calculateCurrentLTV,
    utilizedBorrowingPower,
    isEligibleForLiquidation,
    isRiskForLiquidation
}

