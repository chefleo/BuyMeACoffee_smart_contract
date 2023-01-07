// Import the assert library and the BuyMeACoffee contract
const { assert } = require("chai");
const hre = require("hardhat");

async function getBalance(address) {
    const balanceBigInt = await hre.waffle.provider.getBalance(address);
    return hre.ethers.utils.formatEther(balanceBigInt);
}

describe("BuyMeACoffee Contract", function () {
    let buyMeACoffee,
        owner,
        initialOwnerBalance,
        tipper,
        tipper2,
        tipper3,
        gasSpent,
        receipt,
        totalGasSpent;

    const tip = { value: hre.ethers.utils.parseEther("0.001") };

    before("deploy the contract instance first", async function () {
        [owner, tipper, tipper2, tipper3] = await hre.ethers.getSigners();

        initialOwnerBalance = await hre.waffle.provider.getBalance(
            owner.address
        );

        // Deploy a new instance of the contract before each test
        const BuyMeACoffee = await hre.ethers.getContractFactory(
            "BuyMeACoffee"
        );
        buyMeACoffee = await BuyMeACoffee.connect(owner).deploy();

        // Get how much we spent in gas fee for the deployment
        receipt = await buyMeACoffee.deployTransaction.wait();
        gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice);

        totalGasSpent = gasSpent;

        await buyMeACoffee.deployed();

        console.log(`BuyMeACoffee deployed to `, buyMeACoffee.address);
    });

    it("should store a new memo when buyCoffee is called", async function () {
        // Buy a coffee using the buyCoffee function
        await buyMeACoffee
            .connect(tipper)
            .buyCoffee("Alice", "Thanks for the coffee!", tip);

        // Check that the buyCoffee function correctly stored a new memo
        assert.equal(
            (await buyMeACoffee.getMemos()).length,
            1,
            "Memo was not stored"
        );
    });

    it("should send the contract balance to the owner when withdrawTips is called", async function () {
        // Send some ETH to the contract
        await buyMeACoffee
            .connect(tipper)
            .buyCoffee("Alice", "Thanks for the coffee!", tip);

        // Get the balance of the smart contract
        const contractBalance = await hre.waffle.provider.getBalance(
            buyMeACoffee.address
        );

        // Check that the contract balance has increased
        assert.equal(
            (await getBalance(buyMeACoffee.address)).toString(),
            hre.ethers.utils.formatEther(contractBalance),
            "Contract balance has not increased"
        );

        // Call the withdrawTips function
        const tx = await buyMeACoffee.connect(owner).withdrawTips();

        // Get how much we spent in gas fee for the transaction
        receipt = await tx.wait();
        gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice);

        // Sum the gas fee of the deploy with the gas fee of withdrawTips transaction
        totalGasSpent = totalGasSpent.add(gasSpent);

        // Check how much the owner should be have -> Initial Owner Balance - TotalGasSpent(deploy + tx) + withdrawTips
        const expectedBalance = initialOwnerBalance
            .sub(totalGasSpent)
            .add(contractBalance);

        // Check that the contract balance has been sent to the owner
        assert.equal(
            (await getBalance(owner.address)).toString(),
            hre.ethers.utils.formatEther(expectedBalance),
            "Contract balance was not sent to the owner"
        );
    });

    it("should retrieve all stored memos when getMemos is called", async function () {
        // Buy some coffee using the buyCoffee function
        await buyMeACoffee
            .connect(tipper)
            .buyCoffee("Alice", "Thanks for the coffee!", tip);
        await buyMeACoffee
            .connect(tipper2)
            .buyCoffee("Bob", "Thanks for the coffee!", tip);
        await buyMeACoffee
            .connect(tipper3)
            .buyCoffee("Charlie", "Thanks for the coffee!", tip);

        // Plus the previous 2 buyCoffee in the precedent tests

        // Check that the getMemos function correctly retrieves all stored memos
        assert.equal(
            (await buyMeACoffee.getMemos()).length,
            5,
            "Incorrect number of memos retrieved"
        );
    });
});
