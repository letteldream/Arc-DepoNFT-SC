import { sign } from "crypto";
import { copyFileSync } from "fs";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { zeroAddress } from "ethereumjs-util";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";

import {
  CurrencyManager,
  ExecutionManager,
  LooksRareExchange,
  MockERC20,
  MockERC721,
  RoyaltyFeeManager,
  RoyaltyFeeRegistry,
  StrategyAnyItemFromCollectionForFixedPrice,
  StrategyPrivateSale,
  StrategyStandardSaleForFixedPrice,
  TransferManagerERC1155,
  TransferManagerERC721,
  TransferSelectorNFT,
} from "../typechain";
import { MakerOrder, signMakeOrder } from "./utils/meta_transaction";

chai.use(solidity);

describe("LooksRareExchange", () => {
  let deployer: SignerWithAddress;
  let caller: SignerWithAddress;
  let erc20Owner: SignerWithAddress;
  let erc721Owner: SignerWithAddress;

  let looksRareExchange: LooksRareExchange;
  let currencyManager: CurrencyManager;
  let executionManager: ExecutionManager;

  let strategyStandardSaleForFixedPrice: StrategyStandardSaleForFixedPrice;
  let strategyAnyItemFromCollectionForFixedPrice: StrategyAnyItemFromCollectionForFixedPrice;
  let strategyPrivateSale: StrategyPrivateSale;

  let royaltyFeeManager: RoyaltyFeeManager;
  let royaltyFeeRegistry: RoyaltyFeeRegistry;

  let transferManagerERC721: TransferManagerERC721;
  let transferManagerERC1155: TransferManagerERC1155;

  let transferSelectorNFT: TransferSelectorNFT;

  let erc20Token: MockERC20;
  let erc721Token: MockERC721;

  const WETHAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const DEPOAddress = "0xa5DEf515cFd373D17830E7c1de1639cB3530a112";
  const protocolFeeRecipientAddress =
    "0x5924A28caAF1cc016617874a2f0C3710d881f3c1";

  const CollectionERC721Address = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"; //
  const CollectionERC1155Address = "0x0546f6d538a2abf964ae4D537a131b226eBa9285";

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  before(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    caller = signers[1];
    erc20Owner = signers[2];
    erc721Owner = signers[3];

    let receipt = await deployments.deploy("MockERC20", {
      from: erc20Owner.address,
      args: ["MFT", "Mock ERC 20", 1000],
      log: true,
    });
    erc20Token = await ethers.getContractAt("MockERC20", receipt.address);

    receipt = await deployments.deploy("MockERC721", {
      from: deployer.address,
      args: ["MNFT", "Mock ERC 721"],
      log: true,
    });
    erc721Token = await ethers.getContractAt("MockERC721", receipt.address);

    await erc721Token.mint(erc721Owner.address, 1);
    await erc721Token.mint(erc721Owner.address, 2);
    await erc721Token.mint(erc721Owner.address, 3);

    //deploy currencyManager
    receipt = await deployments.deploy("CurrencyManager", {
      from: deployer.address,
      args: [],
      log: true,
    });
    currencyManager = await ethers.getContractAt(
      "CurrencyManager",
      receipt.address
    );

    await currencyManager.addCurrency(erc20Token.address);

    //deploy executionManager
    receipt = await deployments.deploy("ExecutionManager", {
      from: deployer.address,
      args: [],
      log: true,
    });
    executionManager = await ethers.getContractAt(
      "ExecutionManager",
      receipt.address
    );

    //deploy StrategyStandardSaleForFixedPrice
    receipt = await deployments.deploy("StrategyStandardSaleForFixedPrice", {
      from: deployer.address,
      args: [200],
      log: true,
    });
    strategyStandardSaleForFixedPrice = await ethers.getContractAt(
      "StrategyStandardSaleForFixedPrice",
      receipt.address
    );

    //deploy StrategyAnyItemFromCollectionForFixedPrice
    receipt = await deployments.deploy(
      "StrategyAnyItemFromCollectionForFixedPrice",
      {
        from: deployer.address,
        args: [200],
        log: true,
      }
    );
    strategyAnyItemFromCollectionForFixedPrice = await ethers.getContractAt(
      "StrategyAnyItemFromCollectionForFixedPrice",
      receipt.address
    );

    //deploy StrategyPrivateSale
    receipt = await deployments.deploy("StrategyPrivateSale", {
      from: deployer.address,
      args: [200],
      log: true,
    });
    strategyPrivateSale = await ethers.getContractAt(
      "StrategyPrivateSale",
      receipt.address
    );

    await executionManager.addStrategy(
      strategyStandardSaleForFixedPrice.address
    );
    await executionManager.addStrategy(
      strategyAnyItemFromCollectionForFixedPrice.address
    );
    await executionManager.addStrategy(strategyPrivateSale.address);

    //deploy RoyaltyFeeRegistry
    receipt = await deployments.deploy("RoyaltyFeeRegistry", {
      from: deployer.address,
      args: [9500],
      log: true,
    });
    royaltyFeeRegistry = await ethers.getContractAt(
      "RoyaltyFeeRegistry",
      receipt.address
    );

    //deploy RoyaltyFeeManager
    receipt = await deployments.deploy("RoyaltyFeeManager", {
      from: deployer.address,
      args: [royaltyFeeRegistry.address],
      log: true,
    });
    royaltyFeeManager = await ethers.getContractAt(
      "RoyaltyFeeManager",
      receipt.address
    );

    //deploy LooksRareExchange
    receipt = await deployments.deploy("LooksRareExchange", {
      from: deployer.address,
      args: [
        currencyManager.address,
        executionManager.address,
        royaltyFeeManager.address,
        erc20Token.address,
        protocolFeeRecipientAddress,
      ],
      log: true,
    });
    looksRareExchange = await ethers.getContractAt(
      "LooksRareExchange",
      receipt.address
    );

    receipt = await deployments.deploy("TransferManagerERC721", {
      from: deployer.address,
      args: [looksRareExchange.address],
      log: true,
    });
    transferManagerERC721 = await ethers.getContractAt(
      "TransferManagerERC721",
      receipt.address
    );

    receipt = await deployments.deploy("TransferManagerERC1155", {
      from: deployer.address,
      args: [looksRareExchange.address],
      log: true,
    });
    transferManagerERC1155 = await ethers.getContractAt(
      "TransferManagerERC1155",
      receipt.address
    );

    receipt = await deployments.deploy("TransferSelectorNFT", {
      from: deployer.address,
      args: [transferManagerERC721.address, transferManagerERC1155.address],
      log: true,
    });
    transferSelectorNFT = await ethers.getContractAt(
      "TransferSelectorNFT",
      receipt.address
    );

    await looksRareExchange.updateTransferSelectorNFT(
      transferSelectorNFT.address
    );

    await erc20Token
      .connect(erc20Owner)
      .approve(
        looksRareExchange.address,
        await erc20Token.balanceOf(erc20Owner.address)
      );

    await erc721Token
      .connect(erc721Owner)
      .approve(transferManagerERC721.address, 1);
    await erc721Token
      .connect(erc721Owner)
      .approve(transferManagerERC721.address, 2);
    await erc721Token
      .connect(erc721Owner)
      .approve(transferManagerERC721.address, 3);
    // WETHToken.connect(maker).approve(WETHToken.balanceOf(maker));
    // WETHToken.connect(taker).deposit({
    //   value: ethers.utils.parseEther("100.0"),
    // });
    // WETHToken.connect(taker).approve(WETHToken.balanceOf(maker));

    // console.log("WETHToken.balanceOf(maker)", WETHToken.balanceOf(maker));
  });

  describe("deploy", async () => {
    it("should be deployed", async () => {});
  });

  describe("cancelAllOrdersForSender", async () => {
    it("userMinOrderNonce should be set", async () => {
      looksRareExchange.connect(caller).cancelAllOrdersForSender(4500);
      expect(
        await looksRareExchange.userMinOrderNonce(caller.address)
      ).to.be.equals(4500);
    });

    it("Cancel: Order nonce lower than current", async () => {
      await expect(
        looksRareExchange.connect(caller).cancelAllOrdersForSender(4000)
      ).to.be.reverted;
    });

    it("Cancel: Cannot cancel more orders", async () => {
      await expect(
        looksRareExchange.connect(caller).cancelAllOrdersForSender(505000)
      ).to.be.reverted;
    });

    it("userMinOrderNonce should be udpated", async () => {
      looksRareExchange.connect(caller).cancelAllOrdersForSender(504000);
      expect(
        await looksRareExchange.userMinOrderNonce(caller.address)
      ).to.be.equals(504000);
    });
  });

  describe("cancelMultipleMakerOrders", async () => {
    it("Cancel: Cannot be empty", async () => {
      await expect(
        looksRareExchange.connect(caller).cancelMultipleMakerOrders([])
      ).to.be.reverted;
    });

    it("Cancel: Order nonce lower than current", async () => {
      await expect(
        looksRareExchange
          .connect(caller)
          .cancelMultipleMakerOrders([503000, 505000])
      ).to.be.reverted;
    });

    it("isUserOrderNonceExecutedOrCancelled should be set true", async () => {
      looksRareExchange
        .connect(caller)
        .cancelMultipleMakerOrders([505000, 506000]);

      expect(
        await looksRareExchange
          .connect(caller)
          .isUserOrderNonceExecutedOrCancelled(caller.address, 505000)
      ).to.be.equals(true);

      expect(
        await looksRareExchange
          .connect(caller)
          .isUserOrderNonceExecutedOrCancelled(caller.address, 506000)
      ).to.be.equals(true);
    });
  });

  describe("matchAskWithTakerBid", async () => {
    it("match should be confirmed", async () => {
      const beforBalance = await erc20Token.balanceOf(erc20Owner.address);
      const takeOrder = {
        isOrderAsk: false,
        taker: erc20Owner.address,
        price: 10,
        tokenId: 1,
        minPercentageToAsk: 9000,
        params: [],
      };

      const makeOrder: MakerOrder = {
        isOrderAsk: true,
        signer: erc721Owner.address,
        collection: erc721Token.address,
        price: 10,
        tokenId: 1,
        amount: 3,
        strategy: strategyStandardSaleForFixedPrice.address,
        currency: erc20Token.address,
        nonce: 1,
        startTime: 0,
        endTime: BigNumber.from(100000000000000),
        minPercentageToAsk: 9000,
        params: "0x",
      };

      const signedMakeOrder = await signMakeOrder(
        erc721Owner,
        looksRareExchange.address,
        makeOrder
      );

      await looksRareExchange
        .connect(erc20Owner)
        .matchAskWithTakerBid(takeOrder, signedMakeOrder);

      const afterBalance = await erc20Token.balanceOf(erc20Owner.address);
      expect(await beforBalance.sub(takeOrder.price)).to.be.equal(afterBalance);
      expect(await erc721Token.ownerOf(1)).to.be.equal(erc20Owner.address);
    });

    it("Order: Wrong sides", async () => {
      const takeOrder = {
        isOrderAsk: true,
        taker: erc20Owner.address,
        price: 10,
        tokenId: 1,
        minPercentageToAsk: 9000,
        params: [],
      };

      const makeOrder = {
        isOrderAsk: true,
        signer: erc721Owner.address,
        collection: CollectionERC721Address,
        price: 10,
        tokenId: 1,
        amount: 3,
        strategy: strategyStandardSaleForFixedPrice.address,
        currency: WETHAddress,
        nonce: 1,
        startTime: 0,
        endTime: 10,
        minPercentageToAsk: 9000,
        params: [],
        v: 27,
        r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
      };
      await expect(
        looksRareExchange
          .connect(erc20Owner)
          .matchAskWithTakerBid(takeOrder, makeOrder)
      ).to.be.reverted;
    });

    it("Order: Taker must be the sender", async () => {
      const takeOrder = {
        isOrderAsk: false,
        taker: erc20Owner.address,
        price: 10,
        tokenId: 1,
        minPercentageToAsk: 9000,
        params: [],
      };

      const makeOrder = {
        isOrderAsk: true,
        signer: erc721Owner.address,
        collection: CollectionERC721Address,
        price: 10,
        tokenId: 1,
        amount: 3,
        strategy: strategyStandardSaleForFixedPrice.address,
        currency: WETHAddress,
        nonce: 1,
        startTime: 0,
        endTime: 10,
        minPercentageToAsk: 9000,
        params: [],
        v: 27,
        r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
      };
      await expect(
        looksRareExchange
          .connect(caller)
          .matchAskWithTakerBid(takeOrder, makeOrder)
      ).to.be.reverted;
    });

    describe("validateOrder", async () => {
      it("Order: Matching order expired", async () => {
        const takeOrder = {
          isOrderAsk: false,
          taker: erc20Owner.address,
          price: 10,
          tokenId: 1,
          minPercentageToAsk: 9000,
          params: [],
        };

        const makeOrder = {
          isOrderAsk: true,
          signer: erc721Owner.address,
          collection: CollectionERC721Address,
          price: 10,
          tokenId: 1,
          amount: 3,
          strategy: strategyStandardSaleForFixedPrice.address,
          currency: WETHAddress,
          nonce: 1,
          startTime: 0,
          endTime: 10,
          minPercentageToAsk: 9000,
          params: [],
          v: 27,
          r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
          s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        };

        //nonce 1 is already cancelled
        await expect(
          looksRareExchange
            .connect(erc20Owner)
            .matchAskWithTakerBid(takeOrder, makeOrder)
        ).to.be.reverted;
      });

      it("Order: Invalid signer", async () => {
        const takeOrder = {
          isOrderAsk: false,
          taker: erc20Owner.address,
          price: 10,
          tokenId: 1,
          minPercentageToAsk: 9000,
          params: [],
        };

        const makeOrder = {
          isOrderAsk: true,
          signer: ZERO_ADDRESS,
          collection: CollectionERC721Address,
          price: 10,
          tokenId: 1,
          amount: 3,
          strategy: strategyStandardSaleForFixedPrice.address,
          currency: WETHAddress,
          nonce: 1,
          startTime: 0,
          endTime: 10,
          minPercentageToAsk: 9000,
          params: [],
          v: 27,
          r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
          s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        };

        await expect(
          looksRareExchange
            .connect(erc20Owner)
            .matchAskWithTakerBid(takeOrder, makeOrder)
        ).to.be.reverted;
      });

      it("Order: Amount cannot be 0", async () => {
        const takeOrder = {
          isOrderAsk: false,
          taker: erc20Owner.address,
          price: 10,
          tokenId: 1,
          minPercentageToAsk: 9000,
          params: [],
        };

        const makeOrder = {
          isOrderAsk: true,
          signer: erc721Owner.address,
          collection: CollectionERC721Address,
          price: 10,
          tokenId: 1,
          amount: 0,
          strategy: strategyStandardSaleForFixedPrice.address,
          currency: WETHAddress,
          nonce: 1,
          startTime: 0,
          endTime: 10,
          minPercentageToAsk: 9000,
          params: [],
          v: 27,
          r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
          s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        };

        await expect(
          looksRareExchange
            .connect(erc20Owner)
            .matchAskWithTakerBid(takeOrder, makeOrder)
        ).to.be.reverted;
      });

      it("Signature: Invalid", async () => {});
      it("Currency: Not whitelisted", async () => {
        const takeOrder = {
          isOrderAsk: false,
          taker: erc20Owner.address,
          price: 10,
          tokenId: 1,
          minPercentageToAsk: 9000,
          params: [],
        };

        const makeOrder = {
          isOrderAsk: true,
          signer: erc721Owner.address,
          collection: CollectionERC721Address,
          price: 10,
          tokenId: 1,
          amount: 3,
          strategy: strategyStandardSaleForFixedPrice.address,
          currency: DEPOAddress,
          nonce: 1,
          startTime: 0,
          endTime: 10,
          minPercentageToAsk: 9000,
          params: [],
          v: 27,
          r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
          s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        };

        await expect(
          looksRareExchange
            .connect(erc20Owner)
            .matchAskWithTakerBid(takeOrder, makeOrder)
        ).to.be.reverted;
      });
      it("Strategy: Not whitelisted", async () => {
        const takeOrder = {
          isOrderAsk: false,
          taker: erc20Owner.address,
          price: 10,
          tokenId: 1,
          minPercentageToAsk: 9000,
          params: [],
        };

        const makeOrder = {
          isOrderAsk: true,
          signer: erc721Owner.address,
          collection: CollectionERC721Address,
          price: 10,
          tokenId: 1,
          amount: 3,
          strategy: "0x56244Bb70CbD3EA9Dc8007399F61dFC065190031", //looksrare strategy address
          currency: WETHAddress,
          nonce: 1,
          startTime: 0,
          endTime: 10,
          minPercentageToAsk: 9000,
          params: [],
          v: 27,
          r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
          s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        };

        await expect(
          looksRareExchange
            .connect(erc20Owner)
            .matchAskWithTakerBid(takeOrder, makeOrder)
        ).to.be.reverted;
      });
    });
  });

  describe("matchBidWithTakerAsk", async () => {
    it("match should be confirmed", async () => {
      const beforBalance = await erc20Token.balanceOf(erc20Owner.address);
      const takeOrder = {
        isOrderAsk: true,
        taker: erc721Owner.address,
        price: 10,
        tokenId: 2,
        minPercentageToAsk: 9000,
        params: [],
      };

      const makeOrder: MakerOrder = {
        isOrderAsk: false,
        signer: erc20Owner.address,
        collection: erc721Token.address,
        price: 10,
        tokenId: 2,
        amount: 3,
        strategy: strategyStandardSaleForFixedPrice.address,
        currency: erc20Token.address,
        nonce: 2,
        startTime: 0,
        endTime: BigNumber.from(100000000000000),
        minPercentageToAsk: 9000,
        params: [],
      };

      const signedMakeOrder = await signMakeOrder(
        erc20Owner,
        looksRareExchange.address,
        makeOrder
      );

      await looksRareExchange
        .connect(erc721Owner)
        .matchBidWithTakerAsk(takeOrder, signedMakeOrder);

      const afterBalance = await erc20Token.balanceOf(erc20Owner.address);
      expect(await beforBalance.sub(takeOrder.price)).to.be.equal(afterBalance);
      expect(await erc721Token.ownerOf(2)).to.be.equal(erc20Owner.address);
    });

    it("Order: Wrong sides", async () => {
      const takeOrder = {
        isOrderAsk: true,
        taker: erc20Owner.address,
        price: 10,
        tokenId: 1,
        minPercentageToAsk: 9000,
        params: [],
      };

      const makeOrder = {
        isOrderAsk: true,
        signer: erc721Owner.address,
        collection: CollectionERC721Address,
        price: 10,
        tokenId: 1,
        amount: 3,
        strategy: strategyStandardSaleForFixedPrice.address,
        currency: WETHAddress,
        nonce: 2,
        startTime: 0,
        endTime: 10,
        minPercentageToAsk: 9000,
        params: [],
        v: 27,
        r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
      };
      await expect(
        looksRareExchange
          .connect(erc20Owner)
          .matchBidWithTakerAsk(takeOrder, makeOrder)
      ).to.be.reverted;
    });
  });

  describe("matchAskWithTakerBidUsingETHAndWETH", async () => {
    it("match should be confirmed", async () => {
      //same logic
    });
    it("Order: Wrong sides", async () => {
      const takeOrder = {
        isOrderAsk: true,
        taker: erc20Owner.address,
        price: 10,
        tokenId: 1,
        minPercentageToAsk: 9000,
        params: [],
      };

      const makeOrder = {
        isOrderAsk: true,
        signer: erc721Owner.address,
        collection: CollectionERC721Address,
        price: 10,
        tokenId: 1,
        amount: 3,
        strategy: strategyStandardSaleForFixedPrice.address,
        currency: WETHAddress,
        nonce: 2,
        startTime: 0,
        endTime: 10,
        minPercentageToAsk: 9000,
        params: [],
        v: 27,
        r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
      };
      await expect(
        looksRareExchange
          .connect(erc20Owner)
          .matchAskWithTakerBidUsingETHAndWETH(takeOrder, makeOrder)
      ).to.be.reverted;
    });
    it("Order: Currency must be WETH", async () => {
      const takeOrder = {
        isOrderAsk: true,
        taker: erc20Owner.address,
        price: 10,
        tokenId: 1,
        minPercentageToAsk: 9000,
        params: [],
      };

      const makeOrder = {
        isOrderAsk: true,
        signer: erc721Owner.address,
        collection: CollectionERC721Address,
        price: 10,
        tokenId: 1,
        amount: 3,
        strategy: strategyStandardSaleForFixedPrice.address,
        currency: DEPOAddress,
        nonce: 2,
        startTime: 0,
        endTime: 10,
        minPercentageToAsk: 9000,
        params: [],
        v: 27,
        r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
      };
      await expect(
        looksRareExchange
          .connect(erc20Owner)
          .matchAskWithTakerBidUsingETHAndWETH(takeOrder, makeOrder)
      ).to.be.reverted;
    });
    it("Order: Msg.value too high", async () => {
      const takeOrder = {
        isOrderAsk: true,
        taker: erc20Owner.address,
        price: 10,
        tokenId: 1,
        minPercentageToAsk: 9000,
        params: [],
      };

      const makeOrder = {
        isOrderAsk: true,
        signer: erc721Owner.address,
        collection: CollectionERC721Address,
        price: 10,
        tokenId: 1,
        amount: 3,
        strategy: strategyStandardSaleForFixedPrice.address,
        currency: DEPOAddress,
        nonce: 2,
        startTime: 0,
        endTime: 10,
        minPercentageToAsk: 9000,
        params: [],
        v: 27,
        r: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
        s: "0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028",
      };
      await expect(
        looksRareExchange
          .connect(erc20Owner)
          .matchAskWithTakerBidUsingETHAndWETH(takeOrder, makeOrder, {
            value: 4,
          })
      ).to.be.reverted;
    });
  });

  describe("updateCurrencyManager", async () => {
    it("currency manager address shouldn't null", async () => {
      await expect(looksRareExchange.updateCurrencyManager(ZERO_ADDRESS)).to.be
        .reverted;
    });
    it("currency manager address should be updated", async () => {
      //test with looksrare currency manager;
      const looksrareCurrentyManagerAddress =
        "0xC881ADdf409eE2C4b6bBc8B607c2C5CAFaB93d25";
      await looksRareExchange.updateCurrencyManager(
        looksrareCurrentyManagerAddress
      );
      expect(await looksRareExchange.currencyManager()).to.be.equal(
        looksrareCurrentyManagerAddress
      );
      await looksRareExchange.updateCurrencyManager(currencyManager.address);
    });
  });

  describe("updateExecutionManager", async () => {
    it("execution manager address shouldn't null", async () => {
      await expect(looksRareExchange.updateExecutionManager(ZERO_ADDRESS)).to.be
        .reverted;
    });
    it("execution manager address should be updated", async () => {
      //test with looksrare execution manager;
      const looksrareExecutionManagerAddress =
        "0x9Cc58bf22a173C0Fa8791c13Df396d18185d62b2";
      await looksRareExchange.updateExecutionManager(
        looksrareExecutionManagerAddress
      );
      expect(await looksRareExchange.executionManager()).to.be.equal(
        looksrareExecutionManagerAddress
      );
      await looksRareExchange.updateExecutionManager(executionManager.address);
    });
  });

  describe("updateProtocolFeeRecipient", async () => {
    it("protocolFeeRecipient should be updated", async () => {
      const randomAddress = caller.address;
      await looksRareExchange.updateProtocolFeeRecipient(randomAddress);
      expect(await looksRareExchange.protocolFeeRecipient()).to.be.equal(
        randomAddress
      );
      await looksRareExchange.updateProtocolFeeRecipient(
        protocolFeeRecipientAddress
      );
    });
  });

  describe("updateRoyaltyFeeManager", async () => {
    it("royaltyFee manager address shouldn't null", async () => {
      await expect(looksRareExchange.updateRoyaltyFeeManager(ZERO_ADDRESS)).to
        .be.reverted;
    });
    it("royaltyFee manager address should be updated", async () => {
      //test with looksrare royaltyFee manager;
      const looksrareRoyaltyFeeManagerAddress =
        "0x7358182024c9f1B2e6b0153e60bf6156B7eF4906";
      await looksRareExchange.updateRoyaltyFeeManager(
        looksrareRoyaltyFeeManagerAddress
      );
      expect(await looksRareExchange.royaltyFeeManager()).to.be.equal(
        looksrareRoyaltyFeeManagerAddress
      );
      await looksRareExchange.updateRoyaltyFeeManager(executionManager.address);
    });
  });

  describe("updateTransferSelectorNFT", async () => {
    it("transfer selecorNFT address shouldn't null", async () => {
      await expect(looksRareExchange.updateTransferSelectorNFT(ZERO_ADDRESS)).to
        .be.reverted;
    });
    it("transfer selecorNFT address should be updated", async () => {
      //test with looksrare transfer selecorNFT;
      const looksrareTransferSelectorNFTAddress =
        "0x9Ba628F27aAc9B2D78A9f2Bf40A8a6DF4Ccd9e2c";
      await looksRareExchange.updateTransferSelectorNFT(
        looksrareTransferSelectorNFTAddress
      );
      expect(await looksRareExchange.transferSelectorNFT()).to.be.equal(
        looksrareTransferSelectorNFTAddress
      );
      await looksRareExchange.updateTransferSelectorNFT(
        transferSelectorNFT.address
      );
    });
  });

  describe("isUserOrderNonceExecutedOrCancelled", async () => {
    it("should be deployed", async () => {});
  });
});
