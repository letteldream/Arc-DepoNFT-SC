import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers, getNamedAccounts } from "hardhat";

import { LooksRareExchange } from "../typechain";

chai.use(solidity);

describe("LooksRareExchange", () => {
  let deployer: SignerWithAddress;
  let caller: SignerWithAddress;

  let looksRareExchange: LooksRareExchange;

  before(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    caller = signers[1];

    const receipt: any = await deployments.deploy("LooksRareExchange", {
      from: deployer.address,
      args: [],
      log: true,
    });
    looksRareExchange = await ethers.getContractAt(
      "LooksRareExchange",
      receipt.address
    );
  });

  describe("deploy", async () => {
    it("should be deployed", async () => {});
  });
});
