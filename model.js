const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userAccountDataSchema = new Schema(
    {
        walletAddress: { type: String },
        totalCollateralBase: { type: Number },
        totalDebtBase: { type: Number },
        availableBorrowsBase: { type: Number },
        currentLiquidationThreshold: { type: Number },
        ltv: { type: Number },
        healthFactor: { type: Number },
    },
    { timestamps: true }
);

module.exports = mongoose.model("userAccount", userAccountDataSchema);

