const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NftCollection", function () {
  let nftCollection;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const NftCollection = await ethers.getContractFactory("NftCollection");
    nftCollection = await NftCollection.deploy();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await nftCollection.name()).to.equal("NftCollection");
      expect(await nftCollection.symbol()).to.equal("NFT");
    });

    it("Should set the correct owner", async function () {
      expect(await nftCollection.owner()).to.equal(owner.address);
    });

    it("Should have MAX_SUPPLY of 10000", async function () {
      expect(await nftCollection.MAX_SUPPLY()).to.equal(10000);
    });

    it("Should start with totalSupply of 0", async function () {
      expect(await nftCollection.totalSupply()).to.equal(0);
    });

    it("Should not be paused initially", async function () {
      expect(await nftCollection.mintingPaused()).to.equal(false);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint NFT", async function () {
      await nftCollection.safeMint(addr1.address);
      expect(await nftCollection.balanceOf(addr1.address)).to.equal(1);
      expect(await nftCollection.ownerOf(0)).to.equal(addr1.address);
    });

    it("Should increment totalSupply after mint", async function () {
      await nftCollection.safeMint(addr1.address);
      expect(await nftCollection.totalSupply()).to.equal(1);
      await nftCollection.safeMint(addr2.address);
      expect(await nftCollection.totalSupply()).to.equal(2);
    });

    it("Should emit Transfer event on mint", async function () {
      await expect(nftCollection.safeMint(addr1.address))
        .to.emit(nftCollection, "Transfer")
        .withArgs(ethers.ZeroAddress, addr1.address, 0);
    });

    it("Should revert when non-owner tries to mint", async function () {
      await expect(
        nftCollection.connect(addr1).safeMint(addr2.address)
      ).to.be.revertedWithCustomError(nftCollection, "OwnableUnauthorizedAccount");
    });

    it("Should revert when minting to zero address", async function () {
      await expect(
        nftCollection.safeMint(ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should revert when minting exceeds max supply", async function () {
      // Mint 10000 tokens (max supply)
      for (let i = 0; i < 100; i++) {
        await nftCollection.batchMint(addr1.address, 100);
      }
      
      // Try to mint one more
      await expect(
        nftCollection.safeMint(addr1.address)
      ).to.be.revertedWith("Max supply reached");
    });
  });

  describe("Batch Minting", function () {
    it("Should allow batch minting multiple NFTs", async function () {
      await nftCollection.batchMint(addr1.address, 5);
      expect(await nftCollection.balanceOf(addr1.address)).to.equal(5);
      expect(await nftCollection.totalSupply()).to.equal(5);
    });

    it("Should revert batch mint with zero quantity", async function () {
      await expect(
        nftCollection.batchMint(addr1.address, 0)
      ).to.be.revertedWith("Quantity must be greater than zero");
    });

    it("Should revert batch mint exceeding max supply", async function () {
      await expect(
        nftCollection.batchMint(addr1.address, 10001)
      ).to.be.revertedWith("Would exceed max supply");
    });
  });

  describe("Token URI", function () {
    it("Should return correct tokenURI for existing token", async function () {
      await nftCollection.safeMint(addr1.address);
      const tokenURI = await nftCollection.tokenURI(0);
      expect(tokenURI).to.equal("https://api.nftcollection.com/metadata/0.json");
    });

    it("Should revert tokenURI for non-existent token", async function () {
      await expect(
        nftCollection.tokenURI(999)
      ).to.be.revertedWithCustomError(nftCollection, "ERC721NonexistentToken");
    });

    it("Should allow owner to update base URI", async function () {
      await nftCollection.setBaseURI("https://newapi.com/");
      await nftCollection.safeMint(addr1.address);
      const tokenURI = await nftCollection.tokenURI(0);
      expect(tokenURI).to.equal("https://newapi.com/0.json");
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await nftCollection.safeMint(addr1.address);
    });

    it("Should allow owner to transfer token", async function () {
      await nftCollection.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      expect(await nftCollection.ownerOf(0)).to.equal(addr2.address);
      expect(await nftCollection.balanceOf(addr1.address)).to.equal(0);
      expect(await nftCollection.balanceOf(addr2.address)).to.equal(1);
    });

    it("Should revert transfer from non-owner", async function () {
      await expect(
        nftCollection.connect(addr2).transferFrom(addr1.address, addr2.address, 0)
      ).to.be.revertedWithCustomError(nftCollection, "ERC721InsufficientApproval");
    });

    it("Should emit Transfer event on transfer", async function () {
      await expect(
        nftCollection.connect(addr1).transferFrom(addr1.address, addr2.address, 0)
      ).to.emit(nftCollection, "Transfer")
        .withArgs(addr1.address, addr2.address, 0);
    });
  });

  describe("Approvals", function () {
    beforeEach(async function () {
      await nftCollection.safeMint(addr1.address);
    });

    it("Should allow token owner to approve operator", async function () {
      await nftCollection.connect(addr1).approve(addr2.address, 0);
      expect(await nftCollection.getApproved(0)).to.equal(addr2.address);
    });

    it("Should allow approved operator to transfer", async function () {
      await nftCollection.connect(addr1).approve(addr2.address, 0);
      await nftCollection.connect(addr2).transferFrom(addr1.address, addr2.address, 0);
      expect(await nftCollection.ownerOf(0)).to.equal(addr2.address);
    });

    it("Should emit Approval event", async function () {
      await expect(
        nftCollection.connect(addr1).approve(addr2.address, 0)
      ).to.emit(nftCollection, "Approval")
        .withArgs(addr1.address, addr2.address, 0);
    });

    it("Should allow setApprovalForAll", async function () {
      await nftCollection.connect(addr1).setApprovalForAll(addr2.address, true);
      expect(await nftCollection.isApprovedForAll(addr1.address, addr2.address)).to.be.true;
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause minting", async function () {
      await nftCollection.setMintingPaused(true);
      expect(await nftCollection.mintingPaused()).to.be.true;
    });

    it("Should emit MintingPaused event", async function () {
      await expect(nftCollection.setMintingPaused(true))
        .to.emit(nftCollection, "MintingPaused")
        .withArgs(true);
    });

    it("Should revert minting when paused", async function () {
      await nftCollection.setMintingPaused(true);
      await expect(
        nftCollection.safeMint(addr1.address)
      ).to.be.revertedWith("Minting is currently paused");
    });

    it("Should allow minting after unpause", async function () {
      await nftCollection.setMintingPaused(true);
      await nftCollection.setMintingPaused(false);
      await nftCollection.safeMint(addr1.address);
      expect(await nftCollection.balanceOf(addr1.address)).to.equal(1);
    });
  });

  describe("Gas Usage", function () {
    it("Should have reasonable gas cost for minting", async function () {
      const tx = await nftCollection.safeMint(addr1.address);
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lessThan(200000);
    });

    it("Should have reasonable gas cost for transfers", async function () {
      await nftCollection.safeMint(addr1.address);
      const tx = await nftCollection.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lessThan(100000);
    });
  });
});
