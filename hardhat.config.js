require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("@openzeppelin/hardhat-upgrades");

const ALCHEMYAPI_TOKEN = process.env.ALCHEMYAPI_TOKEN;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.6.12",
  networks: {
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMYAPI_TOKEN}`,
      accounts: [PRIVATE_KEY]
    }
  }
};

