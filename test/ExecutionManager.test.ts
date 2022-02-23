import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers, getNamedAccounts } from "hardhat";

import { ExecutionManager } from "../typechain";

chai.use(solidity);

describe("ExecutionManager", () => {
  let deployer: SignerWithAddress;
  let caller: SignerWithAddress;
  let executionManager: ExecutionManager;

  const StrategyStandardSaleForFixedPriceAddress =
    "0x56244Bb70CbD3EA9Dc8007399F61dFC065190031";
  const StrategyAnyItemFromCollectionForFixedPriceAddress =
    "0x86F909F70813CdB1Bc733f4D97Dc6b03B8e7E8F3";
  const StrategyPrivateSalAddress =
    "0x58D83536D3EfeDB9F7f2A1Ec3BDaad2b1A4DD98C";

  before(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    caller = signers[1];

    const receipt: any = await deployments.deploy("ExecutionManager", {
      from: deployer.address,
      args: [],
      log: true,
    });
    executionManager = await ethers.getContractAt(
      "ExecutionManager",
      receipt.address
    );
  });

  describe("deploy", async () => {
    it("should be deployed", async () => {
      expect(await executionManager.viewCountWhitelistedStrategies()).to.eq(0);
    });
  });

  describe("addCurrency", async () => {
    it("currency should be added", async () => {
      await executionManager.addStrategy(
        StrategyStandardSaleForFixedPriceAddress
      );
      await executionManager.addStrategy(
        StrategyAnyItemFromCollectionForFixedPriceAddress
      );
      await executionManager.addStrategy(StrategyPrivateSalAddress);
      expect(await executionManager.viewCountWhitelistedStrategies()).to.eq(3);
    });

    it("Currency: Already whitelisted", async () => {
      await expect(
        executionManager.addStrategy(
          StrategyAnyItemFromCollectionForFixedPriceAddress
        )
      ).to.be.reverted;
    });
  });

  describe("removeCurrency", async () => {
    it("currency should be removed", async () => {
      await executionManager.removeStrategy(StrategyPrivateSalAddress);
      expect(await executionManager.viewCountWhitelistedStrategies()).to.eq(2);
    });

    it("Currency: Not whitelisted", async () => {
      await expect(executionManager.removeStrategy(StrategyPrivateSalAddress))
        .to.be.reverted;
    });
  });

  describe("isCurrencyWhitelisted", async () => {
    it("currency should be in whitelist", async () => {
      expect(
        await executionManager.isStrategyWhitelisted(
          StrategyStandardSaleForFixedPriceAddress
        )
      ).to.be.equal(true);

      expect(
        await executionManager
          .connect(caller)
          .isStrategyWhitelisted(
            StrategyAnyItemFromCollectionForFixedPriceAddress
          )
      ).to.be.equal(true);
    });

    it("currency shouldnot be in whitelist", async () => {
      expect(
        await executionManager
          .connect(caller)
          .isStrategyWhitelisted(StrategyPrivateSalAddress)
      ).to.be.equal(false);
    });
  });

  describe("viewCountWhitelistedCurrencies", async () => {
    it("should be get count of WhitelistedCurrencies", async () => {
      expect(
        await executionManager.connect(caller).viewCountWhitelistedStrategies()
      ).to.eq(2);
    });
  });

  describe("viewWhitelistedCurrencies", async () => {
    it("should be get maximum currency list ", async () => {
      await executionManager.addStrategy(StrategyPrivateSalAddress);
      const receipt = await executionManager
        .connect(caller)
        .viewWhitelistedStrategies(1, 3);
      expect(await receipt[1]).to.be.equal(3);
      expect(receipt[0][0]).to.be.equal(
        StrategyAnyItemFromCollectionForFixedPriceAddress
      );
      expect(receipt[0][1]).to.be.equal(StrategyPrivateSalAddress);
    });

    it("should be get currency list", async () => {
      const receipt = await executionManager
        .connect(caller)
        .viewWhitelistedStrategies(0, 2);
      expect(await receipt[1]).to.be.equal(2);
      expect(receipt[0][0]).to.be.equal(
        StrategyStandardSaleForFixedPriceAddress
      );
      expect(receipt[0][1]).to.be.equal(
        StrategyAnyItemFromCollectionForFixedPriceAddress
      );
    });
  });
});
