import { ethers } from "ethers";
import {
  IGeneralParameters,
  IOrderParameters,
  IOwnerParameters,
  IQueryParameters,
  IStrategy,
} from "../../../interfaces";
import { OrderModel, TokenModel } from "../../../models";
import {
  buildOrderQueryFilters,
  buildOwnerQuery,
} from "../nft.service.builder";

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

    const orderFilters = await buildOrderQueryFilters(
      orderParams,
      generalParams
    );
    const ownerQuery = buildOwnerQuery(ownerParams, tokenType);

    console.time("query-time");
    const [orders, owners] = await Promise.all([
      OrderModel.find(orderFilters).lean(),
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
    const filtered = [];
    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];

      const tokenOrders = orders.filter(
        (order) =>
          order.make.assetType.tokenId === owner.tokenId &&
          order.make.assetType?.contract === owner.contractAddress.toLowerCase()
      );

      if (tokenOrders && tokenOrders.lenth) {
        // owner.order === order;
        filtered.push(owner);

        if (filtered.length === generalParams.skippedItems + limit) {
          break;
        }
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
    const nftsQuery = paginated.map((nft) => ({
      tokenId: nft.tokenId,
      contractAddress: nft.contractAddress,
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
        orders:
          orders.filter(
            (order) =>
              order.make.assetType.tokenId === nft.tokenId &&
              order.make.assetType?.contract ===
                nft.contractAddress.toLowerCase()
          ) || [],
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
