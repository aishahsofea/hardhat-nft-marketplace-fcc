const { ethers, network } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");

const TOKEN_ID = 1;

async function buyItem() {
  const nftMarketPlace = await ethers.getContract("NftMarketplace");
  const basicNft = await ethers.getContract("BasicNft");
  const listing = await nftMarketPlace.getListing(basicNft.address, TOKEN_ID);
  const price = listing.price.toString();
  const tx = await nftMarketPlace.buyItem(basicNft.address, TOKEN_ID, {
    value: price,
  });
  await tx.wait(1);
  console.log("NFT Bought!");
  if (network.config.chainId === 31337) {
    await moveBlocks(1, (sleepAmount = 1000));
  }
}

buyItem()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
