import { ethers } from "ethers";
import {
  IGeneralParameters,
  IOrderParameters,
  IOwnerParameters,
  IQueryParameters,
  IStrategy,
} from "../interfaces";
import { OrderModel, TokenModel } from "../models";
import { buildOrderQueryFilters } from "../services/orders/builders/order.builder";
import { buildOwnerQuery } from "../services/owners/owners.service";

export class OwnerOrderStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryOrderAndOwnerParams(
      parameters.orderParams,
      parameters.ownerParams,
      parameters.generalParams,
      parameters.nftParams.tokenType.toString()
    );
  }

  private async queryOrderAndOwnerParams(
    orderParams: IOrderParameters,
    ownerParams: IOwnerParameters,
    generalParams: IGeneralParameters,
    tokenType: string
  ) {
    console.log("Querying order and owner params");

    const { page, limit } = generalParams;

    const { finalFilters, sortingAggregation, sort } =
      await buildOrderQueryFilters(orderParams, generalParams);

    const ownerQuery = buildOwnerQuery(ownerParams, tokenType);

    console.time("query-time");
    const [orders, owners] = await Promise.all([
      OrderModel.aggregate([
        { $match: finalFilters },
        ...sortingAggregation,
        { $sort: sort },
      ]),
      ownerQuery,
    ]);

    console.timeEnd("query-time");
    if (!orders.length || !owners.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    // Apply Pagination
    // We have to iterate over orders in case sortBy is applied. Othwise the sort order won't be persisted
    const filtered = [];
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];

      const owner = owners.find(
        (owner) =>
          order.make.assetType.tokenId === owner.tokenId &&
          order.make.assetType.contract?.toLowerCase() ===
            owner.contractAddress.toLowerCase()
      );

      if (!owner) {
        continue;
      }

      filtered.push(owner);

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
    const nftsQuery = paginated.map((owner) => ({
      tokenId: owner.tokenId,
      contractAddress: owner.contractAddress,
    }));

    const nfts = await TokenModel.find({
      $and: [{ $or: nftsQuery }],
    }).lean();

    if (!nfts.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    const finalNfts = nfts.map((nft) => {
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
        // ERC1155 may have more than one active listing
        orders: orders.filter(
          (order) =>
            order.make.assetType.tokenId === nft.tokenId &&
            order.make.assetType?.contract === nft.contractAddress.toLowerCase()
        ),
        owners: ownerAddresses,
      };
    });

    return {
      page: page,
      size: limit,
      nfts: finalNfts,
    };
  }
}
