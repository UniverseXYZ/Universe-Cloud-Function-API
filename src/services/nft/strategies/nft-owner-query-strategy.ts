import { ethers } from "ethers";
import {
  IGeneralParameters,
  INFTParameters,
  IOwnerParameters,
  IQueryParameters,
  IStrategy,
} from "../../../interfaces";
import {
  TokenModel,
  OrderModel,
  OrderStatus,
  OrderSide,
} from "../../../models";
import { buildOwnerQuery, buildNftQueryFilters } from "../nft.service.builder";

export class NftOwnerStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryNftAndOwnerParams(
      parameters.nftParams,
      parameters.ownerParams,
      parameters.generalParams
    );
  }

  private async queryNftAndOwnerParams(
    nftParams: INFTParameters,
    ownerParams: IOwnerParameters,
    generalParams: IGeneralParameters
  ) {
    console.log("Querying nft and owner params");

    const { page, limit } = generalParams;

    const ownerQuery = buildOwnerQuery(
      ownerParams,
      nftParams.tokenType.toString()
    );

    console.time("owner-query-time");
    const owners = await ownerQuery;
    console.timeEnd("owner-query-time");

    const nftFilters = await buildNftQueryFilters(
      nftParams,
      owners.map((owner) => ({
        contractAddress: owner.contractAddress,
        tokenId: owner.tokenId,
      }))
    );
    // Apply Pagination
    console.time("nft-query-time");
    const nfts = await TokenModel.aggregate(
      [
        ...nftFilters,
        { $skip: generalParams.skippedItems },
        { $limit: Number(limit) },
        { $sort: { searchScore: -1 } },
      ],
      { collation: { locale: "en", strength: 2 } }
    );

    console.timeEnd("nft-query-time");

    const filtered = [];

    if (!nfts.length || !owners.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];

      const nftOwners = owners.filter(
        (owner) =>
          owner.tokenId === nft.tokenId &&
          owner.contractAddress.toLowerCase() ===
            nft.contractAddress.toLowerCase()
      );

      if (!nftOwners.length) {
        continue;
      }

      const ownerAddresses = nftOwners.map((owner) => ({
        owner: owner.address,
        value: owner.value
          ? owner.value.toString()
          : ethers.BigNumber.from(owner.value).toString(),
      }));

      filtered.push({ ...nft, owners: ownerAddresses });

      if (filtered.length === generalParams.skippedItems + limit) {
        break;
      }
    }

    if (!filtered.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    const paginated = filtered.slice(generalParams.skippedItems);

    //  Populate order
    const orderQuery = paginated.map((nft) => ({
      "make.assetType.tokenId": nft.tokenId,
      "make.assetType.contract": nft.contractAddress.toLowerCase(),
    }));
    console.time("order-query-time");

    const orders = await OrderModel.find({
      $and: [
        { $or: orderQuery },
        { $eq: ["$status", OrderStatus.CREATED] },
        { $eq: ["$side", OrderSide.SELL] },
      ],
    });
    console.timeEnd("order-query-time");

    const finalNfts = paginated.map((nft) => ({
      ...nft,
      orders:
        orders.filter(
          (order) =>
            order.make.assetType.tokenId === nft.tokenId &&
            order.make.assetType.contract.toLowerCase() ===
              nft.contractAddress.toLowerCase()
        ) || [],
    }));

    return {
      page: page,
      size: limit,
      nfts: finalNfts,
    };
  }
}
