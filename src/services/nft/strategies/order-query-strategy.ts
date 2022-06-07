import { ethers } from "ethers";
import {
  IGeneralParameters,
  IOrderParameters,
  IQueryParameters,
  IStrategy,
} from "../../../interfaces";
import { OrderModel } from "../../../models";
import {
  buildOrderQueryFilters,
  getNFTLookup,
  getOrdersLookup,
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

    const { finalFilters, sort } = await buildOrderQueryFilters(
      orderParams,
      generalParams
    );

    const dbQuery = [{ $match: finalFilters }];

    console.log("FILTERS:");
    console.log(finalFilters);

    console.log("Querying...");
    console.time("query-time");

    const data = await OrderModel.aggregate(
      [
        ...dbQuery,
        // ...sortingAggregation,
        { $sort: sort },
        {
          $group: {
            _id: {
              contract: "$make.assetType.contract",
              tokenId: "$make.assetType.tokenId",
            },
            contractAddress: { $first: "$make.assetType.contract" },
            tokenId: { $first: "$make.assetType.tokenId" },
          },
        },

        { $skip: generalParams.skippedItems },
        { $limit: Number(limit) },
        // assuming that an order cannot be created if the noten in question is
        // absent in the "nft-token" table. i.e. there's always an NFT for an existing order.
        getNFTLookup(),
        getOrdersLookup(),
        {
          $project: {
            _id: 0,
            contractAddress: "$contractAddress",
            tokenId: "$tokenId",
            tokenType: { $first: "$nft.tokenType" },
            externalDomainViewUrl: { $first: "$nft.externalDomainViewUrl" },
            metadata: { $first: "$nft.metadata" },
            firstOwner: { $first: "$nft.firstOwner" },
            metadataFetchError: { $first: "$nft.metadataFetchError" },
            processingSentAt: { $first: "$nft.processingSentAt" },
            sentAt: { $first: "$nft.sentAt" },
            sentForMediaAt: { $first: "$nft.sentForMediaAt" },
            alternativeMediaFiles: { $first: "$nft.alternativeMediaFiles" },
            needToRefresh: { $first: "$nft.needToRefresh" },
            source: { $first: "$nft.source" },
            orders: "$orders",
          },
        },
      ],
      { collation: { locale: "en", strength: 2 } }
    );

    console.timeEnd("query-time");

    const owners = await getOwnersByTokens(data);

    const finalData = data.map((nft) => {
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
      };
    });

    return {
      page: page,
      size: limit,
      nfts: finalData,
    };
  }
}
