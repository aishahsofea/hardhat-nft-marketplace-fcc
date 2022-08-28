const { network } = require("hardhat");
const {
  developmentChains,
  VERIFICATION_BLOCK_COFIRMATIONS,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_COFIRMATIONS;

  log("-------------------------------------------------");
  const arguments = [];
  const nftMarketplace = await deploy("NftMarketplace", {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: waitBlockConfirmations,
  });

  // verify the deployment
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(nftMarketplace.address, arguments);
  }
};

module.exports.tags = ["all", "nftmarketplace"];
