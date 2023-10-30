const express = require('express');
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const { Web3 } = require('web3');
const config = require('./config');

const DBConnection = require("./dbconnection");


const app = express();
const port = 3000; // You can use any port you prefer

// Replace these with your contract ABI and address
const abi = config.ABI; // Your contract ABI
const contractAddress = config.contractAddress; // Your contract address

app.use(express.json());

DBConnection.init();  // DB Connection established

var swaggerDefinition = {
    info: {
        title: "Wallet Project",
        version: "1.0.0",
        description: "Documentation of Wallet Application",
    },
    host: `localhost:${port}`,
    basePath: "/",
};
var options1 = {
    swaggerDefinition: swaggerDefinition,
    apis: ["*.js"],
};

var swaggerSpec = swaggerJSDoc(options1);

app.get("/swagger.json", function (req, res) {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

// initialize swagger-jsdoc
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//****************************** Services ****************************************/

const userService = require("./service")
const { createData, getUserData, updateData } = userService;
//********************************************************************************/
const { calculateHealthFactor,
    calculateLiquidationThreshold,
    calculateAvailableToBorrow,
    calculateNAV,
    calculateCurrentLTV,
    utilizedBorrowingPower,
    isEligibleForLiquidation,
    isRiskForLiquidation } = require('./healthfactor');



/**
 * @swagger
 * /getUserAccountData:
 *   get:
 *     tags:
 *       - USERS
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: address
 *         description: address
 *         in: query
 *         required: true
 *     responses:
 *       200:
 *         description: Data found successfully.
 *       404:
 *         description: Data not found.
 *       500:
 *         description: Internal Server Error
 */

app.get('/getUserAccountData', async (req, res) => {
    try {

        // Get the address from the request
        const userAddress = req.query.address; // Assuming the address is passed in the request

        // Initialize a Web3 instance with your provider
        const web3 = new Web3(config.url);

        // Create a contract instance
        const contract = new web3.eth.Contract(abi, contractAddress);

        // Define the method you want to call
        const methodName = 'getUserAccountData';

        // Call the method using await
        const result = await contract.methods[methodName](userAddress).call();

        // Parse the string results to numbers
        const formattedResult = {
            walletAddress: userAddress,
            totalCollateralBase: parseFloat((result[0].toString()) / 100000000).toFixed(2),
            totalDebtBase: parseFloat((result[1].toString()) / 100000000).toFixed(2),
            availableBorrowsBase: parseFloat((result[2].toString()) / 100000000).toFixed(2),
            currentLiquidationThreshold: parseFloat((result[3].toString()) / 100).toFixed(2),
            ltv: parseFloat((result[4].toString() / 100)).toFixed(2),
            healthFactor: parseFloat((result[5].toString()) / 1000000000000000000).toFixed(2),
        };
        let finalData;
        const checkDetails = await getUserData({ walletAddress: userAddress });
        if (!checkDetails) {
            // Insert the formatted result into a MongoDB collection
            finalData = await createData(formattedResult);
        } else {
            // Update the formatted result into a MongoDB collection
            finalData = await updateData({ _id: checkDetails._id }, formattedResult);
        }

        // Return the result in the response
        return res.status(200).json({
            data: finalData,
            status: 200,
            message: 'Data fetch successfully',
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while fetching user data' });
    }
});



/**
 * @swagger
 * /getDetail:
 *   get:
 *     tags:
 *       - USERS
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: walletAddress
 *         description: walletAddress
 *         in: query
 *         required: true
 *     responses:
 *       200:
 *         description: Data found successfully.
 *       404:
 *         description: Data not found.
 *       500:
 *         description: Internal Server Error
 */

app.get('/getDetail', async (req, res) => {
    try {
        let findData = await getUserData({ walletAddress: req.query.walletAddress });
        if (!findData) {
            res.status(404).json({
                data: [],
                status: 404,
                message: 'No data Found',
            });
        }
        res.status(200).json({
            data: findData,
            status: 200,
            message: 'Data fetch successfully',
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while fetching user data' });
    }
});

/**
 * @swagger
 * /simulation:
 *   get:
 *     tags:
 *       - USERS
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: address
 *         description: address
 *         in: query
 *         required: true
 *       - name: borrow
 *         description: borrow
 *         in: query
 *         required: false
 *       - name: supply
 *         description: supply
 *         in: query
 *         required: false
 *     responses:
 *       200:
 *         description: Data found successfully.
 *       404:
 *         description: Data not found.
 *       500:
 *         description: Internal Server Error
 */

app.get('/simulation', async (req, res) => {
    try {
        const { address, borrow, supply } = req.query;
        // Get the address from the request body
        const result = await getUserData({ walletAddress: address });
        if (!result) {
            res.status(404).json({
                data: [],
                status: 404,
                message: 'Details not found for your requested address.',
            });
        }
        
        const borrowValue = (borrow && borrow > 0) ? borrow : result.totalDebtBase;
        const supplyValue = (supply && supply > 0) ? supply : result.totalCollateralBase;

        const totalBorrow = borrowValue;
        const collateralArray = [supplyValue];
        const LiquidationThreshold = [result.currentLiquidationThreshold];
        const totalCollateral = supplyValue;
        const maxLoanToValue = result.ltv;

        const hFactor = await calculateHealthFactor(totalBorrow, collateralArray, LiquidationThreshold);
        const hFactorFinal =hFactor.toFixed(2)
        let availbleToBorrowAmount = await calculateAvailableToBorrow(totalCollateral, maxLoanToValue, totalBorrow);
        availbleToBorrowAmount=availbleToBorrowAmount<1?0:availbleToBorrowAmount;
        const [lThreshold, calculateNAV_, calculateCurrentLTV_, utilizedBorrowingPower_, isEligibleForLiquidation_, isRiskForLiquidation_] = await Promise.all([
            calculateLiquidationThreshold(totalCollateral, collateralArray, LiquidationThreshold),
            calculateNAV(totalCollateral, totalBorrow),
            calculateCurrentLTV(totalBorrow, totalCollateral),
            utilizedBorrowingPower((totalBorrow + availbleToBorrowAmount), totalBorrow),
            isEligibleForLiquidation(hFactorFinal),
            isRiskForLiquidation(hFactorFinal)
        ]);

        const respObj = {
            availbleToBorrowAmount: (availbleToBorrowAmount).toFixed(2),
            calculateHealthFactor: (hFactor).toFixed(2),
            lThreshold: (lThreshold).toFixed(2),
            calculateNAV_: (calculateNAV_).toFixed(2),
            calculateCurrentLTV_: (calculateCurrentLTV_).toFixed(2),
            utilizedBorrowingPower_:utilizedBorrowingPower_,
            isEligibleForLiquidation_: isEligibleForLiquidation_,
            isRiskForLiquidation_: isRiskForLiquidation_
        }

        // Return the result in the response
        return res.status(200).json({
            data: respObj,
            status: 200,
            message: 'Data fetch successfully',
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while fetching user data' });
    }
});






app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
