import { ethers } from "ethers";
import {
  IGeneralParameters,
  INFTParameters,
  IOrderParameters,
  IOwnerParameters,
  IQueryParameters,
  IStrategy,
} from "../interfaces";
import { TokenModel, OrderModel } from "../models";
import { buildNftQueryFilters } from "../services/nfts/builders";
import { buildOrderQueryFilters } from "../services/orders/builders/order.builder";
import { buildOwnerQuery } from "../services/owners/owners.service";

export class NftOwnerOrderStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryMixedParams(
      parameters.nftParams,
      parameters.orderParams,
      parameters.ownerParams,
      parameters.generalParams
    );
  }

  private async queryMixedParams(
    nftParams: INFTParameters,
    orderParams: IOrderParameters,
    ownerParams: IOwnerParameters,
    generalParams: IGeneralParameters
  ) {
    console.log("Querying mixed params");

    const { page, limit } = generalParams;

    const nftFilters = await buildNftQueryFilters(nftParams);

    if (!nftFilters.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    const ownerQuery = buildOwnerQuery(
      ownerParams,
      nftParams.tokenType.toString()
    );
    const { finalFilters, sortingAggregation, sort } =
      await buildOrderQueryFilters(orderParams, generalParams);

    console.time("query-time");
    const [nfts, owners, orders] = await Promise.all([
      TokenModel.aggregate([...nftFilters, { $sort: { searchScore: -1 } }], {
        collation: { locale: "en", strength: 2 },
      }),
      ownerQuery,
      OrderModel.aggregate([
        { $match: finalFilters },
        ...sortingAggregation,
        { $sort: sort },
      ]),
    ]);
    console.timeEnd("query-time");

    if (!nfts.length || !owners.length || !orders.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    // Apply Pagination
    const filtered = [];
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];

      const nft = nfts.find(
        (nft) =>
          order.make.assetType.tokenId === nft.tokenId &&
          order.make.assetType.contract === nft.contractAddress.toLowerCase()
      );

      if (!nft) {
        continue;
      }

      const ownersInfo = owners.filter(
        (owner) =>
          owner.tokenId === nft.tokenId &&
          owner.contractAddress.toLowerCase() ===
            nft.contractAddress.toLowerCase()
      );

      if (!ownersInfo.length) {
        continue;
      }

      // ERC1155 may have more than one active listing
      const nftOrders = orders.filter(
        (o) =>
          o.make.assetType.contract === order.make.assetType.contract &&
          o.make.assetType.tokenId === order.make.assetType.tokenId
      );

      const ownerAddresses = ownersInfo.map((owner) => ({
        owner: owner.address,
        value: owner.value
          ? owner.value.toString()
          : ethers.BigNumber.from(owner.value).toString(),
      }));

      nft.orders = nftOrders;
      nft.owners = ownerAddresses;

      filtered.push(nft);
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

    return {
      page: page,
      size: limit,
      nfts: paginated,
    };
  }
}
