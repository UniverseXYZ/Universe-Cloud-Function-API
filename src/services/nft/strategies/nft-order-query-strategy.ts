import {
  IGeneralParameters,
  INFTParameters,
  IOrderParameters,
  IQueryParameters,
  IStrategy,
} from "../../../interfaces";
import { TokenModel, OrderModel } from "../../../models";
import { Utils } from "../../../utils";
import {
  buildNftQueryFilters,
  buildOrderQueryFilters,
  SortOrderOptionsEnum,
} from "../nft.service.builder";

export class NftOrderStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryNftAndOrderParams(
      parameters.nftParams,
      parameters.orderParams,
      parameters.generalParams
    );
  }

  private async queryNftAndOrderParams(
    nftParams: INFTParameters,
    orderParams: IOrderParameters,
    generalParams: IGeneralParameters
  ) {
    console.log("Querying nft and order params");

    const { page, limit } = generalParams;

    const nftFilters = await buildNftQueryFilters(nftParams);
    if (!nftFilters.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }
    //TODO: Try to transfer filters like contractAddress, ownerAddress... to narrow down order search
    const { finalFilters, sortingAggregation, sort } =
      await buildOrderQueryFilters(orderParams, generalParams);

    const dbQuery = [];
    console.log(...dbQuery);
    const [nfts, orders] = await Promise.all([
      TokenModel.aggregate([...nftFilters, { $sort: { searchScore: -1 } }], {
        collation: { locale: "en", strength: 2 },
      }),
      OrderModel.aggregate([
        { $match: finalFilters },
        ...sortingAggregation,
        { $sort: sort },
      ]),
    ]);

    if (!nfts.length || !orders.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    const filtered = [];
    // Apply Pagination:
    // Check if we have sortBy parameter
    // If yes --> ALWAYS iterate over the sorted orders to find the nfts, otherwise the sorting won't be persited to the response
    // If no --> we iterate over the nfts to find the orders
    if (orderParams.sortBy) {
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];

        const nft = nfts.find(
          (nft) =>
            order.make.assetType.tokenId === nft.tokenId &&
            order.make.assetType.contract?.toLowerCase() ===
              nft.contractAddress.toLowerCase()
        );

        if (!nft) {
          continue;
        }

        // ERC1155 may have more than one active listing
        const allOrders = orders.filter(
          (o) =>
            o.make.assetType.contract === order.make.assetType.contract &&
            o.make.assetType.tokenId === order.make.assetType.tokenId
        );

        nft.orders = allOrders;
        filtered.push(nft);

        if (filtered.length === generalParams.skippedItems + limit) {
          break;
        }
      }
    } else {
      for (let i = 0; i < nfts.length; i++) {
        const nft = nfts[i];

        const nftOrders = orders.filter(
          (order) =>
            order.make.assetType.tokenId === nft.tokenId &&
            order.make.assetType.contract?.toLowerCase() ===
              nft.contractAddress.toLowerCase()
        );

        if (!nftOrders.length) {
          continue;
        }

        nft.orders = nftOrders;
        filtered.push(nft);

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

    return {
      page: page,
      size: limit,
      nfts: paginated,
    };
  }
}
