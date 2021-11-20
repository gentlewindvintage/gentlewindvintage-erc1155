const { expect, use } = require("chai");
const { solidity } = require('ethereum-waffle');
const hre = require("hardhat");

const { deployments, ethers } = hre;

use(solidity);

describe("Badger ERC1155 Contract", () => {
  beforeEach(async () => {
    await deployments.fixture();

    erc1155 = await ethers.getContract('BadgerERC1155');
    proxy = await ethers.getContract('ProxyRegistryMock');
  });
  it('Permissions', async () => {
    const [ signer, user ] = await hre.ethers.getSigners();
    const deployerAddr = await signer.getAddress();
    const userAddr = await user.getAddress();

    // Owner: deployer
    // WhitelistAdmin: deployer
    // Minter: deployer

    expect(await erc1155.isWhitelistAdmin(deployerAddr)).to.equal(true);
    expect(await erc1155.isWhitelistAdmin(userAddr)).to.equal(false);

    // Attempt unsupported functions
    await expect(erc1155.addWhitelistAdmin(userAddr)).to.be.revertedWith('unsupported');
    await expect(erc1155.removeWhitelistAdmin(userAddr)).to.be.revertedWith('unsupported');
    await expect(erc1155.renounceWhitelistAdmin()).to.be.revertedWith('unsupported');
    await expect(erc1155.addMinter(userAddr)).to.be.revertedWith('unsupported');
    await expect(erc1155.removeMinter(userAddr)).to.be.revertedWith('unsupported');
    await expect(erc1155.renounceMinter()).to.be.revertedWith('unsupported');

    // Attempt to use owner privilages by user
    await expect(erc1155.connect(user).pause()).to.be.revertedWith('Ownable: caller is not the owner');
    await expect(erc1155.connect(user).transferOwnership(userAddr)).to.be.revertedWith('Ownable: caller is not the owner');

    // Attempt to use WhiteListAdmin privilages by user
    await expect(erc1155.connect(user).create([ userAddr ], [ 1 ], 100, 'wwww.test.com', '0x00'))
        .to.be.revertedWith('WhitelistAdminRole: caller does not have the WhitelistAdmin role');
    
    // Owner creates new NFT
    let tx = await erc1155.create([ userAddr ], [ 0 ], 100, 'wwww.test.com', '0x00');
    let receipt = await tx.wait();
    let id = receipt.events[0].args.id;

    // Attempt to use minter privilages by user
    await expect(erc1155.connect(user).mint(userAddr, id, 1, '0x00'))
        .to.be.revertedWith('MinterRole: caller does not have the Minter rol');
    
    // Owner/Minter can mint NFT
    await expect(erc1155.mint(userAddr, id, 1, '0x00')).to.not.be.reverted;

    // Mints 99 for exactly the max Supply
    expect(await erc1155.maxSupply(id)).to.equal(100);
    await expect(erc1155.mint(userAddr, id, 99, '0x00')).to.not.be.reverted;
    expect(await erc1155.totalSupply(id)).to.equal(100);
    expect(await erc1155.balanceOf(userAddr, id)).to.equal(100);

    // Attempt to mint more than max Supply
    await expect(erc1155.mint(userAddr, id, 200, '0x00')).to.be.revertedWith('Max supply reached');
    expect(await erc1155.totalSupply(id)).to.equal(100);

    // Attempt to use burner privilages by user
    await expect(erc1155.connect(user).burn(userAddr, id, 1))
        .to.be.revertedWith('MinterRole: caller does not have the Minter rol');

    // Owner/Minter can burn NFT
    await expect(erc1155.burn(userAddr, id, 1)).to.not.be.reverted;

    // Attempt to burn more than amount left
    expect(await erc1155.totalSupply(id)).to.equal(99);
    await expect(erc1155.burn(userAddr, id, 100)).to.be.revertedWith('ERC1155: burn amount exceeds balance');
    await expect(erc1155.burn(userAddr, id, 99)).to.not.be.reverted;
    await expect(erc1155.burn(userAddr, id, 1)).to.be.revertedWith('No token exists');

    // Pausing and un pausing from owner
    await expect(erc1155.unpause()).to.be.revertedWith('Pausable: not paused');
    await expect(erc1155.pause()).to.not.be.reverted;
    await expect(erc1155.pause()).to.be.revertedWith('Pausable: paused');
    await expect(erc1155.unpause()).to.not.be.reverted;

    // Transfers ownership
    expect(await erc1155.owner()).to.equal(deployerAddr);
    expect(await erc1155.isMinter(deployerAddr)).to.equal(true);
    expect(await erc1155.isWhitelistAdmin(deployerAddr)).to.equal(true);

    await erc1155.transferOwnership(userAddr);

    expect(await erc1155.owner()).to.equal(userAddr);
    expect(await erc1155.isMinter(userAddr)).to.equal(true);
    expect(await erc1155.isWhitelistAdmin(userAddr)).to.equal(true);

    // Test creating new NFT with new owner
    await expect(erc1155.connect(user).create([ userAddr], [ 0 ], 100, 'wwww.test.com', '0x00')).to.not.be.reverted;

    // Renouncing ownership
    await erc1155.connect(user).renounceOwnership();
    await expect(erc1155.connect(user).create([ userAddr ], [ 0 ], 100, 'wwww.test.com', '0x00'))
        .to.be.revertedWith('WhitelistAdminRole: caller does not have the WhitelistAdmin role');
  });

  it('NFT creation, minting and manipulation flow', async () => {
    const [ signer, user, user2, user3 ] = await hre.ethers.getSigners();
    const userAddr = await user.getAddress();
    const user2Addr = await user2.getAddress();
    const user3Addr = await user3.getAddress();

    // Owner creates new NFT
    let tx = await erc1155.create([ userAddr ], [ 0 ], 210, '', '0x00');
    let receipt = await tx.wait();
    let id = receipt.events[0].args.id;

    // Owner mints NFT to user
    await erc1155.mint(userAddr, id, 1, '0x00');

    // State view unit tests:
    expect(await erc1155.totalSupply(1)).to.equal(1);
    expect(await erc1155.maxSupply(1)).to.equal(210);
    expect(await erc1155._exists(1)).to.equal(true);
    expect(await erc1155.uri(1)).to.equal('https://badger.finance/nft/1');
    // Changes base uri
    await erc1155.setBaseURI('https://BadgerURI.com/');
    expect(await erc1155.uri(1)).to.equal('https://BadgerURI.com/1');
    await erc1155.setURI(1, 'https://cloudflare-ipfs.com/ipfs/somehash');
    expect(await erc1155.uri(1)).to.equal('https://cloudflare-ipfs.com/ipfs/somehash');
    expect(await erc1155.getCurrentTokenID()).to.equal(1);

    // User sends minted NFT to User2
    expect(await erc1155.balanceOf(userAddr, id)).to.equal(1);
    expect(await erc1155.balanceOf(user2Addr, id)).to.equal(0);

    await erc1155.connect(user).safeTransferFrom(userAddr, user2Addr, id, 1, '0x00');

    expect(await erc1155.balanceOf(userAddr, id)).to.equal(0);
    expect(await erc1155.balanceOf(user2Addr, id)).to.equal(1);

    // Owner mints 3 NFTs to User2
    await erc1155.mint(user2Addr, id, 3, '0x00');

    // User2 sends 3 NFT minted to User
    expect(await erc1155.balanceOf(userAddr, id)).to.equal(0);
    expect(await erc1155.balanceOf(user2Addr, id)).to.equal(4);

    await erc1155.connect(user2).safeTransferFrom(user2Addr, userAddr, id, 3, '0x00');

    expect(await erc1155.balanceOf(userAddr, id)).to.equal(3);
    expect(await erc1155.balanceOf(user2Addr, id)).to.equal(1);

    // Owner creates new NFT
    tx = await erc1155.create([ userAddr ], [ 0 ], 210, 'wwww.test2.com', '0x00');
    receipt = await tx.wait();
    let id2 = receipt.events[0].args.id;

    // Owner mints 4 NFTs with ID=2 to user
    await erc1155.mint(userAddr, id2, 4, '0x00');

    // User sends batch of NFTs ID = and ID = 2 to User2 (1 and 2 NFTs respectively)
    expect(await erc1155.balanceOf(userAddr, id)).to.equal(3);
    expect(await erc1155.balanceOf(user2Addr, id)).to.equal(1);
    expect(await erc1155.balanceOf(userAddr, id2)).to.equal(4);
    expect(await erc1155.balanceOf(user2Addr, id2)).to.equal(0);

    await erc1155.connect(user).safeBatchTransferFrom(userAddr, user2Addr, [id, id2], [1, 2], '0x00');

    expect(await erc1155.balanceOf(userAddr, id)).to.equal(2);
    expect(await erc1155.balanceOf(user2Addr, id)).to.equal(2);
    expect(await erc1155.balanceOf(userAddr, id2)).to.equal(2);
    expect(await erc1155.balanceOf(user2Addr, id2)).to.equal(2);

    // User3 attempts to transfer NFTs without having any and reverts
    await expect(erc1155.connect(user3).safeTransferFrom(user3Addr, userAddr, id, 1, '0x00'))
        .to.be.revertedWith('ERC1155: insufficient balance for transfer');

    // User attempts to transfer User2's tokens without approval and reverts
    await expect(erc1155.connect(user).safeTransferFrom(user2Addr, user3Addr, id, 1, '0x00'))
      .to.be.revertedWith('ERC1155: caller is not owner nor approved');

    // User2 approves User1 to transfer their tokens
    await erc1155.connect(user2).setApprovalForAll(userAddr, true);
    await expect(erc1155.connect(user).safeTransferFrom(user2Addr, user3Addr, id, 1, '0x00'))
        .to.not.be.reverted;
    expect(await erc1155.balanceOf(user2Addr, id)).to.equal(1);
    expect(await erc1155.balanceOf(user3Addr, id)).to.equal(1);

    // User2 disapproves User1 to transfer their tokens
    await erc1155.connect(user2).setApprovalForAll(userAddr, false);
    await expect(erc1155.connect(user).safeTransferFrom(user2Addr, user3Addr, id, 1, '0x00'))
      .to.be.revertedWith('ERC1155: caller is not owner nor approved');

    // Owner burns NFTs with ID=1 from User and User2
    expect(await erc1155.balanceOf(userAddr, id)).to.equal(2);
    await expect(erc1155.burn(userAddr, id, 2)).to.not.be.reverted;
    expect(await erc1155.balanceOf(userAddr, id)).to.equal(0);
  });
});
