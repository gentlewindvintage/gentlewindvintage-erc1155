'use strict';

const hre = require('hardhat');

const main = async () => {
  const contract = await hre.ethers.getContract('GentlewindERC1155');
  const tx = await contract.setBaseURI('https://gentlewindvintage.studio/nft/');
  console.log(tx.hash);
};

main().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
