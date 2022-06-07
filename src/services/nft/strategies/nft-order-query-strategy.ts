import {
  IGeneralParameters,
  INFTParameters,
  IOrderParameters,
  IQueryParameters,
  IStrategy,
} from "../../../interfaces";
import { TokenModel, OrderModel } from "../../../models";
import {
  buildNftQueryFilters,
  buildOrderQueryFilters,
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
    const orderFilters = await buildOrderQueryFilters(
      orderParams,
      generalParams
    );

    const [nfts, orders] = await Promise.all([
      TokenModel.aggregate([...nftFilters, { $sort: { searchScore: -1 } }], {
        collation: { locale: "en", strength: 2 },
      }),
      OrderModel.find(orderFilters).lean(),
    ]);

    if (!nfts.length || !orders.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    // Apply Pagination
    const filtered = [];
    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];

      const nftOrders = orders.filter(
        (order) =>
          order.make.assetType.tokenId === nft.tokenId &&
          order.make.assetType.contract?.toLowerCase() ===
            nft.contractAddress.toLowerCase()
      );
      if (nftOrders && nftOrders.length) {
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
