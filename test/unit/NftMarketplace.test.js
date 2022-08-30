const { expect, assert } = require("chai");
const { network, ethers, deployments } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Nft Marketplace Contract", () => {
      let deployer,
        player,
        nftMarketplaceContract,
        nftMarketplace,
        basicNftContract,
        basicNft;
      const PRICE = ethers.utils.parseEther("0.1");
      const TOKEN_ID = 0;

      beforeEach(async () => {
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        player = accounts[1];
        await deployments.fixture(["all"]);
        nftMarketplaceContract = await ethers.getContract("NftMarketplace");
        nftMarketplace = nftMarketplaceContract.connect(deployer);
        basicNftContract = await ethers.getContract("BasicNft");
        basicNft = basicNftContract.connect(deployer);
        await basicNft.mintNft();
        await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID);
      });

      describe("listItem function", () => {
        it("emits an event after listing an item", async () => {
          expect(
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          );
        });

        it("exclusively lists items that have not been listed", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          const error = `NftMarketplace__AlreadyListed("${basicNft.address}", ${TOKEN_ID})`;
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith(error);
        });

        it("exclusively allows owners to list", async () => {
          nftMarketplace = nftMarketplaceContract.connect(player);
          await basicNft.approve(player.address, TOKEN_ID);
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__NotOwner");
        });

        it("needs approvals to list an item", async () => {
          await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID);
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketPlace");
        });

        it("updates listing with seller and price", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          const listing = await nftMarketplace.getListing(
            basicNft.address,
            TOKEN_ID
          );
          assert(listing.price.toString() === PRICE.toString());
          assert(listing.seller.toString() === deployer.address);
        });
      });

      describe("buyItem function", () => {
        it("reverts if the item is not listed", async () => {
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("NftMarketplace__NotListed");
        });

        it("reverts if the price is not met", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("NftMarketplace__PriceNotMet");
        });

        it("transfers the nft to the buyer and updates seller's proceeds", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplace.connect(player);
          expect(
            await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: PRICE,
            })
          ).to.emit("ItemBought");
          const newOwner = await basicNft.ownerOf(TOKEN_ID);
          const sellerProceeds = await nftMarketplace.getProceeds(
            deployer.address
          );
          assert(newOwner.toString() === player.address);
          assert(sellerProceeds.toString() === PRICE.toString());
        });
      });

      describe("cancelListing function", () => {
        it("reverts if the listing does not exist", async () => {
          const error = `NftMarketplace__NotListed("${basicNft.address}", ${TOKEN_ID})`;
          await expect(
            nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith(error);
        });

        it("reverts if anyone else other than the owner removes the listing", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplace.connect(player);
          await basicNft.approve(player.address, TOKEN_ID);
          await expect(
            nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("NftMarketplace__NotOwner");
        });

        it("removes the listing and emit ItemCanceled event", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          expect(
            await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.emit("ItemCanceled");
          const listing = await nftMarketplace.getListing(
            basicNft.address,
            TOKEN_ID
          );
          assert(listing.price.toString() === "0");
        });
      });

      describe("updateListing function", () => {
        it("reverts if anyone else other than the owner updates the listing", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplaceContract.connect(player);
          await basicNft.approve(player.address, TOKEN_ID);
          await expect(
            nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__NotOwner");
        });

        it("reverts if item is not yet listed", async () => {
          await expect(
            nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__NotListed");
        });

        it("updates the price of the listed item", async () => {
          const newPrice = ethers.utils.parseEther("0.2");
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          expect(
            await nftMarketplace.updateListing(
              basicNft.address,
              TOKEN_ID,
              newPrice
            )
          ).to.emit("ItemListed");
          const listing = await nftMarketplace.getListing(
            basicNft.address,
            TOKEN_ID
          );
          assert(listing.price.toString() === newPrice.toString());
        });
      });

      describe("withdrawProceeds", () => {
        it("does not allow 0 proceed withdrawals", async () => {
          await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
            "NftMarketplace__NoProceeds"
          );
        });

        it("withdraw the proceeds", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplaceContract.connect(player);
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
            value: PRICE,
          });
          nftMarketplace = nftMarketplaceContract.connect(deployer);

          const deployerInitialProceeds = await nftMarketplace.getProceeds(
            deployer.address
          );
          const deployerInitialBalance = await deployer.getBalance();
          const txResponse = await nftMarketplace.withdrawProceeds();
          const txReceipt = await txResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = txReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const deployerBalanceAfter = await deployer.getBalance();

          assert(
            deployerBalanceAfter.add(gasCost).toString() ===
              deployerInitialProceeds.add(deployerInitialBalance).toString()
          );
        });
      });
    });
