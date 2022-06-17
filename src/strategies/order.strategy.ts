import { ethers, utils } from "ethers";
import {
  IGeneralParameters,
  IOrderParameters,
  IQueryParameters,
  IStrategy,
} from "../interfaces";
import { AssetClass, OrderModel, TokenModel } from "../models";
import { buildOrderQueryFilters } from "../services/orders/builders/order.builder";
import { getOwnersByTokens } from "../services/owners/owners.service";

export class OrderStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryOnlyOrderParams(
      parameters.orderParams,
      parameters.generalParams
    );
  }

  private async queryOnlyOrderParams(
    orderParams: IOrderParameters,
    generalParams: IGeneralParameters
  ) {
    console.log("Querying only order params");

    const { page, limit } = generalParams;

    const { finalFilters, sort, sortingAggregation } =
      await buildOrderQueryFilters(orderParams, generalParams);

    console.log("FILTERS:");
    console.log(finalFilters);

    console.log("Querying...");
    console.time("query-time");

    const data = await OrderModel.aggregate(
      [
        { $match: finalFilters },
        ...sortingAggregation,
        { $sort: sort }, // sort before grouping to properly group erc1155s!
        {
          $group: {
            _id: {
              contract: "$make.assetType.contract",
              tokenId: "$make.assetType.tokenId",
              contracts: "$make.assetType.contracts",
              tokenIds: "$make.assetType.tokenIds",
            },
            // contractAddress: { $first: '$make.assetType.contract' },
            // contractAddresses: { $first: '$make.assetType.contracts' },
            // tokenId: { $first: '$make.assetType.tokenId' },
            // tokenIds: { $first: '$make.assetType.tokenIds' },
            // orderSort: { $first: '$orderSort' },
            // usd_value: { $first: '$usd_value' },
            // createdAt: { $first: '$createdAt' },
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } },
        { $sort: sort }, // this is the actual sorting!
        { $skip: generalParams.skippedItems },
        { $limit: Number(limit) },
        // getNFTLookup(),
        // getOrdersLookup(),
        // {
        //   $project: {
        //     _id: 0,
        //     contractAddress: "$contractAddress",
        //     tokenId: "$tokenId",
        //     tokenType: { $first: "$nft.tokenType" },
        //     externalDomainViewUrl: { $first: "$nft.externalDomainViewUrl" },
        //     metadata: { $first: "$nft.metadata" },
        //     firstOwner: { $first: "$nft.firstOwner" },
        //     metadataFetchError: { $first: "$nft.metadataFetchError" },
        //     processingSentAt: { $first: "$nft.processingSentAt" },
        //     sentAt: { $first: "$nft.sentAt" },
        //     sentForMediaAt: { $first: "$nft.sentForMediaAt" },
        //     alternativeMediaFiles: { $first: "$nft.alternativeMediaFiles" },
        //     needToRefresh: { $first: "$nft.needToRefresh" },
        //     source: { $first: "$nft.source" },
        //     orders: "$orders",
        //   },
        // },
      ],
      { collation: { locale: "en", strength: 2 } }
    );

    console.timeEnd("query-time");
    if (!data.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }
    
    const tokens = [];
    data.forEach((order) => {
      if (AssetClass.ERC721_BUNDLE === order.make.assetType.assetClass) {
        for (let i = 0; i < order.make.assetType.contracts.length; i++) {
          order.make.assetType.tokenIds[i].forEach((tokenId) => {
            tokens.push({
              tokenId: tokenId,
              contractAddress: utils.getAddress(order.make.assetType.contracts[i]),
            });
          })
        }
      } else {
        tokens.push({
          tokenId: order.make.assetType.tokenId,
          contractAddress: utils.getAddress(order.make.assetType.contract),
        });
      }
    });

    const [owners, nfts] = await Promise.all([
      getOwnersByTokens(tokens),
      TokenModel.find({ $or: tokens }).lean(),
    ]);

    const finalData = data.map((order) => {
      // assuming that an order cannot be created if the token in question is
      // absent in the "nft-token" table. i.e. there's always an NFT for an existing order.

      if (AssetClass.ERC721_BUNDLE === order.make.assetType.assetClass) {
        // if it's a bundle, the returning array element will be the bundle with nfts
        const bundleNfts = [];
        for (let i = 0; i < order.make.assetType.contracts.length; i++) {
          order.make.assetType.tokenIds[i].forEach((tokenId) => {
            bundleNfts.push(nfts.find((nft) =>
                nft.contractAddress.toLowerCase() === order.make.assetType.contracts[i] &&
                nft.tokenId === tokenId
            ));
          })
        }

        return {
          ...order,
          nfts: bundleNfts,
        };
      } else {
        // if it's not a bundle, the returning array element will be the nft with the 
        // order (only the first one for erc1155) and owners.
        const nft = nfts.find(
          (nft) =>
            nft.contractAddress.toLowerCase() === order.make.assetType.contract &&
            nft.tokenId === order.make.assetType.tokenId
        );
  
        const ownersInfo = owners.filter(
          (owner) =>
            owner.contractAddress === nft.contractAddress &&
            owner.tokenId === nft.tokenId
        );
  
        const ownerAddresses = ownersInfo.map((owner) => ({
          owner: owner.address,
          value: owner.value
            ? owner.value.toString()
            : ethers.BigNumber.from(owner.value).toString(),
        }));
  
        return {
          ...nft,
          owners: ownerAddresses,
          orders: [order],
        };
      }
    });

    return {
      page: page,
      size: limit,
      nfts: finalData,
    };
  }
}
