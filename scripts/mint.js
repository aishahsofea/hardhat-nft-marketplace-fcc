const { ethers, network } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");

async function mint() {
  const basicNft = await ethers.getContract("BasicNft");
  console.log("Minting NFT...");
  const mintTx = await basicNft.mintNft();
  const mintTxReceipt = await mintTx.wait(1);
  console.log(`Token ID: ${mintTxReceipt.events[0].args.tokenId.toString()}`);
  console.log(`NFT Address: ${basicNft.address}`);

  if (network.config.chainId === 31337) {
    await moveBlocks(2, (sleepAmount = 1000));
  }
}

mint()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
