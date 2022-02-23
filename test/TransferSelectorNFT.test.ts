import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers, getNamedAccounts } from "hardhat";

import { TransferSelectorNFT } from "../typechain";

chai.use(solidity);

describe("TransferSelectorNFT", () => {
  let deployer: SignerWithAddress;
  let caller: SignerWithAddress;

  let transferSelectorNFT: TransferSelectorNFT;

  const TransferManagerERC721Address =
    "0xf42aa99F011A1fA7CDA90E5E98b277E306BcA83e";
  const TransferManagerERC1155Address =
    "0xFED24eC7E22f573c2e08AEF55aA6797Ca2b3A051";

  const CollectionERC721Address = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"; //
  const CollectionERC1155Address = "0x0546f6d538a2abf964ae4D537a131b226eBa9285";

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  before(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    caller = signers[1];

    const receipt: any = await deployments.deploy("TransferSelectorNFT", {
      from: deployer.address,
      args: [TransferManagerERC721Address, TransferManagerERC1155Address],
      log: true,
    });
    transferSelectorNFT = await ethers.getContractAt(
      "TransferSelectorNFT",
      receipt.address
    );
  });

  describe("deploy", async () => {
    it("should be deployed", async () => {
      expect(await transferSelectorNFT.INTERFACE_ID_ERC721()).to.eq(
        "0x80ac58cd"
      );
    });
  });

  describe("addCollectionTransferManager", async () => {
    it("Owner: Collection cannot be null address", async () => {
      await expect(
        transferSelectorNFT.addCollectionTransferManager(
          ZERO_ADDRESS,
          TransferManagerERC1155Address
        )
      ).to.be.reverted;
    });

    it("Owner: TransferManager cannot be null address", async () => {
      await expect(
        transferSelectorNFT.addCollectionTransferManager(
          CollectionERC721Address,
          ZERO_ADDRESS
        )
      ).to.be.reverted;
    });

    it("transferManagerSelectorForCollection should be updated", async () => {
      await transferSelectorNFT.addCollectionTransferManager(
        CollectionERC721Address,
        TransferManagerERC721Address
      );
      expect(
        await transferSelectorNFT.transferManagerSelectorForCollection(
          CollectionERC721Address
        )
      ).to.be.equal(TransferManagerERC721Address);
    });
  });

  describe("removeCollectionTransferManager", async () => {
    it("transferManagerSelectorForCollection should be set 0", async () => {
      await transferSelectorNFT.removeCollectionTransferManager(
        CollectionERC721Address
      );
      expect(
        await transferSelectorNFT.transferManagerSelectorForCollection(
          CollectionERC721Address
        )
      ).to.be.equal(ZERO_ADDRESS);
    });

    it("Owner: Collection has no transfer manager", async () => {
      await expect(
        transferSelectorNFT.removeCollectionTransferManager(
          CollectionERC721Address
        )
      ).to.be.reverted;
    });
  });

  describe("checkTransferManagerForToken", async () => {
    it("should be ERC721 tansfer manager", async () => {
      expect(
        await transferSelectorNFT
          .connect(caller)
          .checkTransferManagerForToken(CollectionERC721Address)
      ).to.be.equal(TransferManagerERC721Address);
    });
    it("should be ERC1155 tansfer manager", async () => {
      expect(
        await transferSelectorNFT
          .connect(caller)
          .checkTransferManagerForToken(CollectionERC1155Address)
      ).to.be.equal(TransferManagerERC1155Address);
    });
    it("should be got transfer manager address", async () => {
      await transferSelectorNFT.addCollectionTransferManager(
        CollectionERC721Address,
        TransferManagerERC1155Address
      );

      expect(
        await transferSelectorNFT
          .connect(caller)
          .checkTransferManagerForToken(CollectionERC721Address)
      ).to.be.equal(TransferManagerERC1155Address);
    });
  });
});
