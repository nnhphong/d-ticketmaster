const { ethers } = require("hardhat");

async function main() {
    let owner, treasuryWallet;
    [owner, treasuryWallet] = await ethers.getSigners();
    
    const Tcoin = await ethers.getContractFactory("Tcoin");
    const TCOIN = await Tcoin.deploy(); 
    console.log("Tcoin deployed to:", await TCOIN.getAddress());

    let TicketMarketPlace = await ethers.getContractFactory("TicketMarketplace");        
    let marketPlace = await TicketMarketPlace.deploy(owner.address, treasuryWallet.address, TCOIN);
    await marketPlace.waitForDeployment();

    console.log("TicketMarketPlace deployed to:", await marketPlace.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// Tcoin deployed to: 0x774B51f1037e29D1149261Cb2a9fADD876420fBd
// TicketMarketPlace deployed to: 0xd519003CeBCc87375e20e8EAeC8d307D3d9B6f20