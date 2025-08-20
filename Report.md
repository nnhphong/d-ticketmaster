# Overall System Architecture
![](https://cdn.discordapp.com/attachments/1125952296023494687/1348712467785842739/image.png?ex=67d075de&is=67cf245e&hm=a981eda84a0b1417f5e4a5c3947bfe58eb5f40a085776f1e83b7faff8275c123&=)
# Smart contract plan
- The smart contract plan report is in the file "Smart Contract plan.pdf"
# Steps to deploy and test the contract
Assume we already have a completed smart contract file, all dependencies (hardhat, ether.js...) installed, an account on BuildBear and a MetaMask wallet
## 1. Step to deploy the contract
### Step 1: Configure hardhat
1. Create an .env file to store sensitive information (private keys, BuildBear RPC url)
```
OWNER_PRIVATE_KEY=xxx
BUILDBEAR_RPC_URL=xxxx
TREASURY_PRIVATE_KEY=xxx
```
2. Update  `hardhat.config.js`  to include network configurations and wallet accounts (owner account and treasury wallet)
```
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports  = {
    solidity:  "0.8.28",
    networks: {
	    buildbear: {
		    url:  process.env.BUILDBEAR_RPC_URL,
		    accounts: [
		    process.env.OWNER_PRIVATE_KEY,
		    process.env.TREASURY_PRIVATE_KEY
		    ]
	    },
    },
};
```
### Step 2: Compile the contract
```
npx hardhat compile
```
This generates the ABI and bytecode in ```artifacts``` folder
### Step 3: Write deployment script
A file ```deploy.js``` deploy the ```tcoin.sol``` and ```TicketMarketplace.sol``` contract, write the address of deployment later used by the frontend to interact with the smart contract
```
const { ethers } =  require("hardhat");
async  function  main() {
	let owner, treasuryWallet;
	[owner, treasuryWallet] = await ethers.getSigners();

	const Tcoin = await ethers.getContractFactory("Tcoin");
	const TCOIN = await Tcoin.deploy();

	console.log("Tcoin deployed to:", await  TCOIN.getAddress());

	let TicketMarketPlace = await ethers.getContractFactory("TicketMarketplace");
	let marketPlace = await TicketMarketPlace.deploy(owner.address, treasuryWallet.address, TCOIN);
	await  marketPlace.waitForDeployment();

	console.log("TicketMarketPlace deployed to:", await  marketPlace.getAddress());
}
```
### Step 5: Deploy the contract
Deploy it to BuildBear testnet:
```
npx hardhat run scripts/deploy.js --network buildbear
```
## 2. Step to test the contract
### Step 1: Write Unit Tests
Create test files for ```TicketMarketplace.sol```, ````Tcoin.sol```` as ````test/TicketMarketplace.js```` and ```test/Tcoin.js```
### Step 2: Run tests
```npx hardhat test```
### Step 3: Deploy and test on Testnet
Used the deployed contract address and create a front-end to interact with the contract on the testnet.

![](https://cdn.discordapp.com/attachments/1125952296023494687/1348759209025736827/image.png?ex=67d0a166&is=67cf4fe6&hm=64bec15051aa2ab8404102d0f1a9546eae8e9ca547d595ca193cf37439d69261&=)
The testing conducted for the  `TicketMarketplace`  contract is  sufficient  for the following reasons:
1. The ```Basic testing``` test suite cover all core features of the contract, achieving 96% coverage on hardhat, including:
	-   Deployment with correct initialization.
	-   Event creation, ticket purchasing, and resale.
	-   Ticket transfers.
	-   Admin controls (pausing/unpausing, setting fees, and updating the treasury wallet).

	These tests ensure that the contract behaves as expected under normal conditions and meets the requirements outlined in the specifications.
2. The ```security testing``` test suite handle edge cases and malicious behaviour:
	- Preventing invalid actions (e.g., listing tickets with invalid prices, buying non-existent tickets).
	-   Ensuring only authorized users (e.g., the owner) can perform sensitive operations (e.g., pausing the marketplace, changing fees).
	-   Reverting transactions when conditions are not met (e.g., insufficient balance or allowance).
# Challenges faced and how they were resolved
During frontend development, integrating the smart contract created challenges like wallet connection errors, transaction failures, and unreliable event listening. By carefully studying documentation and examples, I resolved these issues, implementing proper error handling, real-time updates, and state management to ensure interaction between the frontend and the smart contract.
# Future improvements and additional features
To improve the frontend's interaction with the smart contract, I aim to enhance the user experience by adding features like gas fee estimation, multi-wallet support, clearer transaction status updates. Additionally, I plan to implement better error handling with user-friendly prompts and simplify the UI for blockchain interactions, making the platform more intuitive and accessible for non-technical users.
