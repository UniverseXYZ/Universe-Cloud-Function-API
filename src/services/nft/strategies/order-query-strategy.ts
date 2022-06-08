import { ethers } from "ethers";
import {
  IGeneralParameters,
  IOrderParameters,
  IQueryParameters,
  IStrategy,
} from "../../../interfaces";
import { OrderModel, TokenModel } from "../../../models";
import {
  buildOrderQueryFilters,
  getOwnersByTokens,
} from "../nft.service.builder";

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
        {
          $group: {
            _id: {
              contract: "$make.assetType.contract",
              tokenId: "$make.assetType.tokenId",
            },
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } },
        { $sort: sort },
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
    const tokens = data.map((order) => ({
      tokenId: order.make.assetType.tokenId,
      contractAddress: ethers.utils.getAddress(order.make.assetType.contract),
    }));
    console.log(data.map((d) => d.usd_value.toString()));

    const [owners, nfts] = await Promise.all([
      getOwnersByTokens(tokens),
      TokenModel.find({ $or: tokens }).lean(),
    ]);
    const finalData = data.map((order) => {
      // assuming that an order cannot be created if the noten in question is
      // absent in the "nft-token" table. i.e. there's always an NFT for an existing order.
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
    });

    return {
      page: page,
      size: limit,
      nfts: finalData,
    };
  }
}
