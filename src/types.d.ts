import UserAPI from "./datasources/user";
import ProjectsAPI from "./datasources/project";
import PriceAPI from "./datasources/price";
import TokenAPI from "./datasources/token";
import CollectionAPI from "./datasources/collection";
import MongoAPI from "./datasources/mongo";
import TokenOwnersAPI from "./datasources/tokenOwners";
import OrdersAPI from "./datasources/order";

// Apollo Types
export interface DataSourceConfig<TContext = any> {
  context: TContext;
  cache: KeyValueCache;
}
export interface IPrice {
  coin: string;
  value: number;
}

export interface IDataSources {
  priceAPI: PriceAPI;
  tokenAPI: TokenAPI;
  collectionAPI: CollectionAPI;
  tokenOwnersAPI: TokenOwnersAPI;
  ordersAPI: OrdersAPI;
}
