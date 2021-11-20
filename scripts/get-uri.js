'use strict';

const id = process.env.ID;
const hre = require('hardhat');

const main = async () => {
  const contract = await hre.ethers.getContract('GentleERC1155');
  console.log(await contract.uri(0));
};

main().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
