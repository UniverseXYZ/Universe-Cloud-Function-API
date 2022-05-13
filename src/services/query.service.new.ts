import { OrderModel, OrderSide, OrderStatus } from "../models/order";
import { TokenModel } from "../models/token";
import { NFTTokenOwnerModel } from "../models/tokenOwner";
import { ERC1155NFTTokenOwnerModel } from "../models/erc1155tokenOwner";

import {
  IGeneralParams,
  INFTParams,
  IOrderParams,
  IOwnerParams,
  IQueryParams,
} from "./interfaces/IQueryParams";

import {
  hasNftParamsOnly,
  hasOrderParamsOnly,
  hasOwnerParamsOnly,
} from "./query.service.new.helpers";

import {
  buildNftQuery,
  buildOrderFilters,
  buildOwnerParams,
  getNFTLookup,
  getOrdersLookup,
} from "./query.service.new.builder";

export const fetchNftsNew = async (
  // db: any,
  ownerAddress: string,
  tokenAddress: string,
  tokenType: string,
  searchQuery: string,
  page: number,
  limit: number,
  side: number,
  assetClass: string,
  tokenIds: string,
  beforeTimestamp: number,
  token: string,
  minPrice: string,
  maxPrice: string,
  sortBy: string,
  hasOffers: boolean
) => {
  const queryParams: IQueryParams = {
    nftParams: {
      tokenAddress,
      tokenIds,
      searchQuery,
      tokenType,
    },
    orderParams: {
      minPrice,
      maxPrice,
      sortBy,
      hasOffers,
      side,
      assetClass,
      beforeTimestamp,
      token,
    },
    ownerParams: {
      ownerAddress,
    },
    generalParams: {
      page,
      limit,
    },
  };

  const hasNftParams = !!(
    queryParams.nftParams.tokenAddress ||
    queryParams.nftParams.tokenType ||
    queryParams.nftParams.searchQuery ||
    queryParams.nftParams.tokenIds
  );

  const hasOrderParams = !!(
    queryParams.orderParams.side ||
    queryParams.orderParams.assetClass ||
    queryParams.orderParams.minPrice ||
    queryParams.orderParams.maxPrice ||
    queryParams.orderParams.beforeTimestamp
  );

  const hasOwnerParams = !!queryParams.ownerParams.ownerAddress;

  const onlyNftsParams = hasNftParamsOnly(
    hasNftParams,
    hasOrderParams,
    hasOwnerParams
  );

  const onlyOrderParams = hasOrderParamsOnly(
    hasNftParams,
    hasOrderParams,
    hasOwnerParams
  );

  const onlyOwnerParams = hasOwnerParamsOnly(
    hasNftParams,
    hasOrderParams,
    hasOwnerParams
  );

  if (onlyNftsParams) {
    console.log("Querying only nft params");
    return queryOnlyNftParams(queryParams.nftParams, queryParams.generalParams);
  }
  if (onlyOrderParams) {
    console.log("Querying only order params");

    return queryOnlyOrderParams(
      queryParams.orderParams,
      queryParams.generalParams
    );
  }
  if (onlyOwnerParams) {
    console.log("Querying only owner params");
    return queryOnlyOwnerParams(
      queryParams.ownerParams,
      queryParams.generalParams
    );
  }

  // Add mixed params logic
  if (hasNftParams && hasOwnerParams && !hasOrderParams) {
    console.log("Querying nft and owner params");

    return queryNftAndOwnerParams(
      queryParams.nftParams,
      queryParams.ownerParams,
      queryParams.generalParams
    );
  }

  if (hasNftParams && hasOrderParams && !hasOwnerParams) {
    console.log("Querying nft and order params");

    return queryNftAndOrderParams(
      queryParams.nftParams,
      queryParams.ownerParams,
      queryParams.generalParams
    );
  }

  if (hasOrderParams && hasOwnerParams && !hasNftParams) {
    console.log("Querying order and owner params");

    return querOrderAndOwnerParams(
      queryParams.nftParams,
      queryParams.ownerParams,
      queryParams.generalParams
    );
  }

  if (hasNftParams && hasOrderParams && hasOwnerParams) {
    console.log("Querying mixed params");

    return queryMixedParams(
      queryParams.nftParams,
      queryParams.ownerParams,
      queryParams.ownerParams,
      queryParams.generalParams
    );
  }
};

const queryOnlyNftParams = async (
  nftParams: INFTParams,
  generalParams: IGeneralParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const finalFilters = buildNftQuery(nftParams);

  const dbQuery = [{ $match: finalFilters }];

  console.log("FILTERS:");
  console.log(finalFilters);

  console.log("Querying...");
  console.time("query-time");

  const [data, count] = await Promise.all([
    TokenModel.aggregate(
      [
        ...dbQuery,
        { $skip: skippedItems },
        { $limit: Number(limit) },
        getOrdersLookup(),
        { $sort: { updatedAt: -1 } },
      ],
      { collation: { locale: "en", strength: 2 } }
    ),
    TokenModel.aggregate([...dbQuery, { $count: "tokenId" }]),
  ]);

  console.timeEnd("query-time");

  return {
    page: Number(page),
    size: Number(limit),
    total: !count.length ? 0 : count[0].tokenId,
    nfts: data,
  };
};

const queryOnlyOrderParams = async (
  orderParams: IOrderParams,
  generalParams: IGeneralParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const { finalFilters, sort } = await buildOrderFilters(
    orderParams,
    generalParams
  );

  const dbQuery = [{ $match: { $and: finalFilters } }];

  console.log("FILTERS:");
  console.log(finalFilters);

  console.log("Querying...");
  console.time("query-time");

  const [data, count] = await Promise.all([
    OrderModel.aggregate(
      [
        ...dbQuery,
        // ...sortingAggregation,
        { $skip: skippedItems },
        { $limit: Number(limit) },
        ...getNFTLookup(),
        { $sort: sort },
      ],
      { collation: { locale: "en", strength: 2 } }
    ),
    TokenModel.aggregate([...dbQuery, { $count: "tokenId" }]),
  ]);

  console.log(data);

  console.timeEnd("query-time");

  return {
    page: Number(page),
    size: Number(limit),
    total: count,
    nfts: data,
  };
};

const queryOnlyOwnerParams = async (
  ownerParams: IOwnerParams,
  generalParams: IGeneralParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const filters = buildOwnerParams(ownerParams);

  console.time("query-time");
  const tokenFilters = await NFTTokenOwnerModel.aggregate([
    {
      $unionWith: {
        coll: "nft-erc1155-token-owners",
        pipeline: [
          { $project: { contractAddress: 1, tokenId: 1, address: 1 } },
        ],
      },
    },
    { $match: filters },
    { $project: { contractAddress: 1, tokenId: 1, _id: 0 } },
  ]);

  console.timeEnd("query-time");
  console.time("query-time2");
  const results = await TokenModel.aggregate(
    [
      { $match: { $and: [{ $or: tokenFilters }] } },
      { $skip: skippedItems },
      { $limit: Number(limit) },
      getOrdersLookup(),
    ],
    { collation: { locale: "en", strength: 2 } }
  );
  console.timeEnd("query-time2");

  return results;
};

const queryNftAndOwnerParams = async (
  nftParams,
  ownerParams,
  generalParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const nftFilters = buildNftQuery(nftParams);
  const ownerFilters = buildOwnerParams(ownerParams);

  console.time("query-time");
  const [nfts, owners] = await Promise.all([
    TokenModel.find(nftFilters).lean(),
    NFTTokenOwnerModel.find(ownerFilters).lean(),
  ]);
  console.timeEnd("query-time");
  // Apply Pagination
  const filtered = [];
  for (let i = 0; i < nfts.length; i++) {
    const nft = nfts[i];

    const owner = owners.find(
      (owner) =>
        owner.tokenId === nft.tokenId &&
        owner.contractAddress === nft.contractAddress
    );

    if (owner) {
      filtered.push(nft);
      if (filtered.length === skippedItems + limit) {
        break;
      }
    }
  }

  const paginated = filtered.slice(skippedItems);

  //  Populate order
  const orderQuery = paginated.map((nft) => ({
    "make.assetType.tokenId": nft.tokenId,
    "make.assetType.contract": nft.contractAddress.toLowerCase(),
  }));
  console.time("query-time");

  const orders = await OrderModel.find({
    $and: [
      { $or: orderQuery },
      { $eq: ["$status", OrderStatus.CREATED] },
      { $eq: ["$side", OrderSide.SELL] },
    ],
  });
  console.timeEnd("query-time");

  const finalNfts = paginated.map((nft) => ({
    ...nft,
    orders:
      orders.find(
        (order) =>
          order.make.assetType.tokenId === nft.tokenId &&
          order.make.assetType.contract === nft.contractAddress.toLowerCase()
      ) || [],
  }));

  return finalNfts;
};

const queryNftAndOrderParams = async (
  nftParams,
  orderParams,
  generalParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const nftFilters = buildNftQuery(nftParams);
  const orderFilters = buildOwnerParams(orderParams);

  const [nfts, orders] = await Promise.all([
    TokenModel.find(nftFilters).lean(),
    OrderModel.find(orderFilters).lean(),
  ]);

  // Apply Pagination
  const filtered = [];
  for (let i = 0; i < nfts.length; i++) {
    const nft = nfts[i];

    const nftOrders = orders
      .find(
        (order) =>
          order.make.tokenId === nft.tokenId &&
          order.make.contract?.toLowerCase() === nft.contractAddress
      )
      .lean();

    if (nftOrders) {
      nft.orders = nftOrders;
      filtered.push(nft);
      if (filtered.length === skippedItems + limit) {
        break;
      }
    }
  }

  const paginated = filtered.slice(skippedItems);

  return paginated;
};

const querOrderAndOwnerParams = async (
  orderParams,
  ownerParams,
  generalParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const orderFilters = buildOrderFilters(orderParams, generalParams);
  const ownerFilters = buildOwnerParams(ownerParams);

  const [orders, owners] = await Promise.all([
    TokenModel.find(orderFilters).lean(),
    NFTTokenOwnerModel.find(ownerFilters).lean(),
  ]);

  // Apply Pagination
  const filtered = [];
  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];

    const order = orders
      .find(
        (owner) =>
          owner.make.assetType.tokenId === owner.tokenId &&
          owner.make.assetType?.contract === owner.contractAddress
      )
      .lean();

    if (owner) {
      owner.order === order;
      filtered.push(owner);

      if (filtered.length === skippedItems + limit) {
        break;
      }
    }
  }

  const paginated = filtered.slice(skippedItems);

  //  Populate order
  const nftsQuery = paginated.map((nft) => ({
    tokenId: nft.tokenId,
    contract: nft.contract,
  }));

  const nfts = await OrderModel.find({
    $and: [{ $or: nftsQuery }],
  }).lean();

  const finalNfts = nfts.map((nft) => ({
    ...nft,
    orders:
      orders
        .find(
          (order) =>
            order.make.assetType.tokenId === nft.tokenId &&
            order.make.assetType.contract === nft.contractAddress.toLowerCase()
        )
        .lean() || [],
  }));

  return finalNfts;
};

const queryMixedParams = async (
  nftParams,
  orderParams,
  ownerParams,
  generalParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const nftFilters = buildNftQuery(nftParams);
  const ownerFilters = buildOwnerParams(ownerParams);
  const orderFilters = await buildOrderFilters(orderParams, generalParams);

  console.time("query-time");
  const [nfts, owners, orders] = await Promise.all([
    TokenModel.find(nftFilters).lean(),
    NFTTokenOwnerModel.find(ownerFilters).lean(),
    OrderModel.find(orderFilters).lean(),
  ]);
  console.timeEnd("query-time");

  // Apply Pagination
  const filtered = [];
  for (let i = 0; i < nfts.length; i++) {
    const nft = nfts[i];

    const owner = owners.find(
      (owner) =>
        owner.tokenId === nft.tokenId &&
        owner.contractAddress === nft.contractAddress
    );

    const nftOrders = orders.find(
      (order) =>
        order.make.assetType.tokenId === nft.tokenId &&
        order.make.assetType.contract === nft.contractAddress.toLowerCase()
    );

    if (owner && nftOrders) {
      nft.orders = nftOrders;
      filtered.push(nft);
      if (filtered.length === skippedItems + limit) {
        break;
      }
    }
  }

  const paginated = filtered.slice(skippedItems);

  return paginated;
};
