const hre = require('hardhat');
const gasnow = require('ethers-gasnow');
hre.ethers.providers.BaseProvider.prototype.getGasPrice = gasnow.createGetGasPrice('rapid');

const {
  ethers,
  upgrades,
  deployments
} = hre;

const deployProxied = async (contractName, args = []) => {
  const [ signer ] = await ethers.getSigners();
  const artifact = await deployments.getArtifact(contractName);
  const proxy = await upgrades.deployProxy(await ethers.getContractFactory(contractName, signer), args);
  await deployments.save(contractName, {
    abi: artifact.abi,
    address: proxy.address
  });
  console.log('deployed proxied ' + contractName + ' at ' + proxy.address);
  return proxy;
};

const deploy = async (contractName, args = [], libraries = {}) => {
  const [ signer ] = await ethers.getSigners();
  const from = await signer.getAddress();
  const contract = await deployments.deploy(contractName, {
    contractName,
    args,
    libraries,
    from
  });
  console.log('deployed ' + contractName + ' at ' + contract.address);
  return new ethers.Contract(contract.address, (await deployments.getArtifact(contractName)).abi, signer);
};

const isTest = async () => {
  const [ signer ] = await ethers.getSigners();
  return (await signer.provider.getNetwork()).chainId !== 1;
};

const isKovan = async () => {
  const [ signer ] = await ethers.getSigners();
  return (await signer.provider.getNetwork()).chainId === 42;
};

module.exports = async () => {
  const test = await isTest();
  const kovan = await isKovan();
  let proxyAddress;
  if (test) {
    proxyAddress = (await deploy('ProxyRegistryMock')).address;
  } 
  else if (kovan) {
    proxyAddress = (await deploy('ProxyRegistryMock')).address;
  } else proxyAddress = '0xa5409ec958c83c3f309868babaca7c86dcb077c1';
  await deployProxied('GentlewindERC1155', [ proxyAddress, "https://gentlewindvintage.studio" ]);
};
