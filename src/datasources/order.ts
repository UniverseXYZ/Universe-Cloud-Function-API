import { DataSource } from "apollo-datasource";
import { DataSourceConfig } from "../types";
import DataLoader from "dataloader";
import { groupBy, map, uniq, mapObjIndexed, pipe, prop, path } from "ramda";
import { Order, OrderSide, OrderStatus } from "../models/order";
import { Utils } from "../utils/index";

export default class OrdersAPI extends DataSource {
  store: any;
  context: any;
  constructor({ store }: { store: any }) {
    super();
    this.store = store;
  }

  initialize(config: DataSourceConfig) {
    this.context = config.context;
  }

  private ordersLoader = new DataLoader(
    async (orderKeys: readonly string[]) => {
      // console.log(orderKeys);
      // console.log(this.store);
      const utcTimestamp = Utils.getUtcTimestamp();

      const queryFilters: any[] = [
        {
          status: OrderStatus.CREATED,
          side: OrderSide.SELL,
        },
        {
          $or: [{ start: { $lt: utcTimestamp } }, { start: 0 }],
        },
        { $or: [{ end: { $gt: utcTimestamp } }, { end: 0 }] },
      ];

      const tokenQuery: any[] = [];

      orderKeys.forEach((key: string) => {
        const [tokenId, contract] = key.split("-");

        if (tokenId && contract) {
          tokenQuery.push({
            make: { assetType: { tokenId, contract } },
          });
        }
      });

      queryFilters.push({ $or: tokenQuery });

      const orders = await this.store
        .find({ $and: queryFilters })
        .sort({ updatedAt: -1 });

      // console.log(orders);

      const ordersContractsMap = orders.reduce(
        (acc: any, order: any) => ({
          ...acc,
          [order.make.contract]: { [order.make.tokenId]: order },
        }),
        {} as Record<string, Order>
      );

      // console.log(ordersContractsMap);

      const mapResult = orderKeys.map((key: string) => {
        const [tokenId, contract] = key.split("-");
        if (
          !ordersContractsMap[contract] ||
          !ordersContractsMap[contract][tokenId] ||
          !ordersContractsMap[contract][tokenId][0]
        ) {
          return null;
        }

        return ordersContractsMap[contract][tokenId][0];
      });

      // console.log(mapResult);
      return mapResult;
    }
  );

  async getOrder(tokenId: string, collectionAddress: string) {
    return this.ordersLoader.load(`${tokenId}-${collectionAddress}`);
  }
}
