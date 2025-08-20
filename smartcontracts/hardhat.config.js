require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
// import "hardhat-gas-reporter"
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    buildbear: {
      url: process.env.BUILDBEAR_RPC_URL,
      accounts: [
          process.env.OWNER_PRIVATE_KEY,
          process.env.TREASURY_PRIVATE_KEY
        ]
    },
  },
};
