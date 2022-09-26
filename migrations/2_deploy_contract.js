const COLLATERISED = artifacts.require("CollaterisedRent");
const RESOLVER = artifacts.require("Resolver");
const ERC20 = artifacts.require("tokenA");
const ERC721 = artifacts.require("token721");
const ERC1155 = artifacts.require("GameItems");

module.exports = async function(deployer) {
  let accounts = await web3.eth.getAccounts()

  await deployer.deploy(RESOLVER, accounts[0]);
  const resolverInstance = await RESOLVER.deployed();

  await deployer.deploy(ERC20);
  const erc20Instance = await ERC20.deployed();

  await deployer.deploy(ERC721);
  const erc721Instance = await ERC721.deployed();

  await deployer.deploy(ERC1155);
  const erc1155Instance = await ERC1155.deployed();

  await deployer.deploy(COLLATERISED, resolverInstance.address, accounts[1], accounts[0]);
  const collaterised = await COLLATERISED.deployed();

  await resolverInstance.setPaymentToken(1, erc20Instance.address);

  console.log('resolverInstance address:' + resolverInstance.address);
  console.log('erc20Instance address:' + erc20Instance.address);
  console.log('erc721Instance address:' + erc721Instance.address);
  console.log('erc1155Instance address:' + erc1155Instance.address);
  console.log('collaterised address:' + collaterised.address);
}
