'use strict';

const hre = require('hardhat');

const TO = process.env.TO || hre.ethers.constants.AddressZero;
const ID = process.env.ID || hre.ethers.BigNumber.from('0');
const AMOUNT = process.env.AMOUNT || hre.ethers.BigNumber.from('1');
const DATA = process.env.DATA || '0x';

const main = async () => {
  const contract = await hre.ethers.getContract('GentlewindERC1155');
  const tx = await contract.create(AMOUNT, AMOUNT, 'https://gentlewindvintage.studio/nft/' + ID, '0x');
  //const tx = await contract.mint(TO, ID, AMOUNT, DATA);
  console.log(tx.hash);
};

main().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
