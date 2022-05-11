import { ethers } from "ethers";
import web3 from "web3";
import {
  AssetClass,
  OrderModel,
  OrderSide,
  OrderStatus,
} from "../models/order";
import { Utils } from "../utils/index";
import { TOKENS, TOKEN_DECIMALS } from "../utils/tokens";
import { getPrices } from "./price.service";
import { TokenModel } from "../models/token";
import { NFTTokenOwnerModel } from "../models/tokenOwner";
import { ERC1155NFTTokenOwnerModel } from "../models/erc1155tokenOwner";

import {
  addEndSortingAggregation,
  addPriceSortingAggregation,
  SortOrderOptionsEnum,
} from "./query.service";

// Database Indexes:
// Guidelines:
// 1. Field must be selective enough (https://stackoverflow.com/a/62268015/11808182)
// 2. General compound index order of fields (https://stackoverflow.com/a/62281956/11808182)
// 2.1. fields that have direct match like $eq
// 2.2. fields you sort on
// 2.3. fields with ranged queries: $in, $lt, $or etc
// 2.4  fields from 2.1, 2.2, 2.3 are put in most selective order
//      ie. tokenId is first as it's more selective than contract
// 3. !! Only one multikey field is allowed per index (https://www.mongodb.com/docs/manual/core/index-multikey/#compound-multikey-indexes)

// ORDERS INDEXES
// We don't use "side" and fields in indexes as they are not selective enough
// db.getCollection("marketplace-orders").createIndex(
//   {
//     createdAt: -1,
//     "make.assetType.tokenId": 1,
//   },
//   {
//     name: "",
//   }
// );

// db.getCollection("marketplace-orders").createIndex(
//   {
//     createdAt: -1,
//     "make.assetType.contract": 1,
//   },
//   {
//     name: "",
//     collation: { locale: "en", strength: 2 },
//   }
// );

// db.getCollection("marketplace-orders").createIndex({
//   createdAt: -1,
//   "take.assetType.tokenId": 1,
//   },
//   {
//      name: "",
//    }
//  );

// db.getCollection("marketplace-orders").createIndex({
//   createdAt: -1,
//   "take.assetType.contract": 1,
//   },
//   {
//      name: "",
//      collation: { locale: "en", strength: 2 }
//    }
//  );

// db.getCollection("marketplace-orders").createIndex({
//   createdAt: -1,
//   "take.value": 1,
//   },
//   {
//      name: "",
//    }
//  );

// NFT PARAMS INDEXES
// Note: We don't include tokenType in the index combinations
// because it's not selective enough (better performance to make full collection scan)

// Combinations using 1 index (3)
// db.getCollection("nft-tokens").createIndex({
//   "contractAddress": 1,
//   {
//      name: "",
//      collation: { locale: "en", strength: 2 }
//    }
//  );

// db.getCollection("nft-tokens").createIndex({
//   "tokenId": 1,
//   }, {name: ""})

// db.getCollection("nft-tokens").createIndex({
//   "metadata.name": 1,
//   {
//      name: "",
//      collation: { locale: "en", strength: 2 }
//    }
//  );

// Combinations using 2 indexes(3)
// db.getCollection("nft-tokens").createIndex({
//   "contractAddress": 1,
//   "metadata.name": 1,
//   {
//      name: "",
//      collation: { locale: "en", strength: 2 }
//    }
//  );

// db.getCollection("nft-tokens").createIndex({
//   "tokenId": 1,
//   "contractAddress": 1,
//   {
//      name: "",
//      collation: { locale: "en", strength: 2 }
//    }
//  );

// db.getCollection("nft-tokens").createIndex({
//   "tokenId": 1,
//   "metadata.name": 1,
//   }, {name: ""})

// Combinations using 3 indexes (1)
// db.getCollection("nft-tokens").createIndex({
//   "tokenId": 1,
//   "contractAddress": 1,
//   "metadata.name": 1,
//   {
//      name: "",
//      collation: { locale: "en", strength: 2 }
//    }
//  );

interface IQueryParams {
  nftParams: {
    tokenAddress: string;
    tokenType: string;
    searchQuery: string;
    tokenIds: string;
  };
  orderParams: {
    side: number;
    assetClass: string;
    beforeTimestamp: number;
    minPrice: string;
    maxPrice: string;
    sortBy: string;
    hasOffers: boolean;
    token: string;
  };
  ownerParams: {
    ownerAddress: string;
  };
  generalParams: {
    page: number;
    limit: number;
  };
}
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

const queryOnlyNftParams = async (nftParams, generalParams) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const finalFilters = buildNftQuery(nftParams);

  const dbQuery = [{ $match: finalFilters }];

  console.log("FILTERS:");
  console.log(finalFilters);

  console.log("Querying...");
  console.time("query-time");

  const [data, count] = await Promise.all([
    TokenModel.aggregate([
      ...dbQuery,
      { $skip: skippedItems },
      { $limit: Number(limit) },
      orderLookup,
      { $sort: { updatedAt: -1 } },
    ]),
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

const queryOnlyOrderParams = async (orderParams, generalParams) => {
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
    OrderModel.aggregate([
      ...dbQuery,
      // ...sortingAggregation,
      { $skip: skippedItems },
      { $limit: Number(limit) },
      nftLookup,
      { $sort: sort },
    ]),
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

const queryOnlyOwnerParams = async (ownerParams, generalParams) => {
  const { page, limit } = generalParams;

  const filters = buildOwnerParams(ownerParams);

  const erc721Nfts = await NFTTokenOwnerModel.find(filters);

  const erc1155Nfts = await ERC1155NFTTokenOwnerModel.find({
    address: ownerParams,
  });

  const tokenFilters = [...erc721Nfts, ...erc1155Nfts].map((nft) => ({
    tokenId: nft.tokenId,
    contractAddress: nft.contractAddress,
  }));

  const skippedItems = (Number(page) - 1) * Number(limit);

  const results = await TokenModel.aggregate([
    { $match: { $and: tokenFilters } },
    { $skip: skippedItems },
    { $limit: Number(limit) },
    orderLookup,
  ]);

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

  const [nfts, owners] = await Promise.all([
    TokenModel.find(nftFilters),
    NFTTokenOwnerModel.find(ownerFilters),
  ]);

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

  const orders = await OrderModel.find({
    $and: [
      { $eq: ["$status", OrderStatus.CREATED] },
      { $eq: ["$side", OrderSide.SELL] },
      { $or: orderQuery },
    ],
  });

  const finalNfts = nfts.map((nft) => ({
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
    TokenModel.find(nftFilters),
    OrderModel.find(orderFilters),
  ]);

  // Apply Pagination
  const filtered = [];
  for (let i = 0; i < nfts.length; i++) {
    const nft = nfts[i];

    const nftOrders = orders.find(
      (order) =>
        order.make.tokenId === nft.tokenId &&
        order.make.contract?.toLowerCase() === nft.contractAddress
    );

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
    TokenModel.find(orderFilters),
    NFTTokenOwnerModel.find(ownerFilters),
  ]);

  // Apply Pagination
  const filtered = [];
  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];

    const order = orders.find(
      (owner) =>
        owner.make.assetType.tokenId === owner.tokenId &&
        owner.make.assetType?.contract === owner.contractAddress
    );

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
  });

  const finalNfts = nfts.map((nft) => ({
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
  const orderFilters = buildOrderFilters(orderParams, generalParams);

  const [nfts, owners, orders] = await Promise.all([
    TokenModel.find(nftFilters),
    NFTTokenOwnerModel.find(ownerFilters),
    OrderModel.find(orderFilters),
  ]);

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

const buildNftQuery = (nftParams) => {
  const { tokenAddress, tokenIds, searchQuery, tokenType } = nftParams;
  const filters = [] as any;

  if (tokenAddress) {
    filters.push({ contractAddress: tokenAddress });
  }

  if (tokenType) {
    filters.push({ tokenType });
  }

  if (searchQuery) {
    filters.push({
      "metadata.name": { $regex: new RegExp(searchQuery, "i") },
    });
  }

  if (tokenIds) {
    const tokenIdsSplit = tokenIds.replace(/\s/g, "").split(",");

    filters.push({
      tokenId: { $in: tokenIdsSplit },
    });
  }
  const finalFilters = { $and: filters };

  return finalFilters;
};

const buildOrderFilters = async (orderParams, generalParams) => {
  const { page, limit } = generalParams;

  const utcTimestamp = Utils.getUtcTimestamp();

  const filters = [] as any;

  const {
    minPrice,
    maxPrice,
    sortBy,
    hasOffers,
    side,
    assetClass,
    beforeTimestamp,
    token,
  } = orderParams;

  // ORDER FILTERS
  if (minPrice) {
    const weiPrice = web3.utils.toWei(minPrice as string);
    // TODO: If possible remove $expr because it can't use the mulitykey index

    filters.push({
      $expr: {
        $gte: [{ $toDecimal: "$take.value" }, parseFloat(weiPrice)],
      },
    });
  }

  if (maxPrice) {
    const weiPrice = web3.utils.toWei(maxPrice as string);

    // TODO: If possible remove $expr because it can't use the mulitykey index
    filters.push({
      $expr: {
        $lte: [{ $toDecimal: "$take.value" }, parseFloat(weiPrice)],
      },
    });
  }

  if (beforeTimestamp) {
    const milisecTimestamp = Number(beforeTimestamp) * 1000;
    const utcDate = new Date(milisecTimestamp);

    filters.push({
      createdAt: { $gt: utcDate.toDateString() },
    });
  }

  if (token) {
    if (token === ethers.constants.AddressZero) {
      filters.push({
        "take.assetType.assetClass": AssetClass.ETH,
      });
    } else {
      // REGEX SEARCH IS NOT PERFORMANT
      // DOCUMENTDB DOESNT SUPPORT COLLATION INDICES
      // query.token address MUST BE UPPERCASE CONTRACT ADDRESS
      filters.push({
        "take.assetType.contract": token,
      });
    }
  }

  if (assetClass) {
    const assetClasses = assetClass.replace(/\s/g, "").split(",");

    filters.push({ "make.assetType.assetClass": { $in: assetClasses } });
  }

  if (!!hasOffers) {
    // Get all buy orders
    const buyOffers = await OrderModel.find({
      $and: [
        {
          $or: [{ start: { $lt: utcTimestamp } }, { start: 0 }],
        },
        { $or: [{ end: { $gt: utcTimestamp } }, { end: 0 }] },
        {
          status: OrderStatus.CREATED,
          side: OrderSide.BUY,
        },
      ],
    });

    const innerQuery: any[] = [];
    // Search for any sell orders that have offers
    buyOffers.forEach((offer: any) => {
      // Offers(buy orders) have the nft info in 'take'
      const tokenId = offer.take.assetType.tokenId;
      const contract = offer.take.assetType.contract;
      if (tokenId && contract) {
        innerQuery.push({
          "make.assetType.tokenId": tokenId,
          "make.assetType.contract": contract.toLowerCase(),
        });
      }
    });
    console.log("INNER QUERY:");
    console.log(innerQuery);

    // If query is empty --> there are no orders with offers
    if (!innerQuery.length) {
      return {
        page: Number(page),
        size: Number(limit),
        total: 0,
        nfts: [],
      };
    }

    filters.push({ $or: innerQuery });
  }

  if (side) {
    filters.push({
      side: Number(side),
    });
  }

  let sort = {} as any;
  let sortingAggregation = [] as any;
  switch (Number(sortBy)) {
    case SortOrderOptionsEnum.EndingSoon:
      sortingAggregation = addEndSortingAggregation();
      sort.orderSort = 1;
      break;
    case SortOrderOptionsEnum.HighestPrice:
      sortingAggregation = await addPriceSortingAggregation(OrderSide.SELL);
      sort.usd_value = -1;
      break;
    case SortOrderOptionsEnum.LowestPrice:
      sortingAggregation = await addPriceSortingAggregation(OrderSide.SELL);
      sort.usd_value = 1;
      break;
    case SortOrderOptionsEnum.RecentlyListed:
      sort.createdAt = -1;
      break;
    default:
      sort.createdAt = -1;
      break;
  }

  // _id is unique and will return consistent sorting
  // results because other sorting params are not unique
  // sort = {
  //   ...sort,
  //   updatedAt: -1,
  //   _id: -1,
  // };

  const finalFilters = { $and: filters };

  return { finalFilters, sort };
};

const buildOwnerParams = (ownerParams) => {
  const filters = [] as any;

  filters.push({
    address: ownerParams.ownerAddress,
  });

  const finalFilters = { $and: filters };

  return finalFilters;
};

const hasNftParamsOnly = (
  hasNftParams: boolean,
  hasOrderParams: boolean,
  hasOwnerParams: boolean
) => {
  if (!hasNftParams) {
    return false;
  }

  if (hasNftParams && (hasOrderParams || hasOwnerParams)) {
    return false;
  }

  return true;
};

const hasOrderParamsOnly = (
  hasNftParams: boolean,
  hasOrderParams: boolean,
  hasOwnerParams: boolean
) => {
  if (!hasOrderParams) {
    return false;
  }

  if (hasOrderParams && (hasNftParams || hasOwnerParams)) {
    return false;
  }

  return true;
};

const hasOwnerParamsOnly = (
  hasNftParams: boolean,
  hasOrderParams: boolean,
  hasOwnerParams: boolean
) => {
  if (!hasOwnerParams) {
    return false;
  }

  if (hasOwnerParams && (hasOrderParams || hasNftParams)) {
    return false;
  }

  return true;
};

// Lookup to join the document representing the owner of the nft from nft-token-owners
const nftOwnersLookup = {
  $lookup: {
    from: "nft-token-owners",
    let: {
      tokenId: "$tokenId",
      contractAddress: "$contractAddress",
    },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              {
                $eq: ["$tokenId", "$$tokenId"],
              },
              {
                $eq: ["$contractAddress", "$$contractAddress"],
              },
            ],
          },
        },
      },
    ],
    as: "owner",
  },
};

// Lookup to join the document representing the active sell order of the nft from marketplace-orders
const orderLookup = {
  $lookup: {
    from: "marketplace-orders",
    let: {
      tokenId: "$tokenId",
      contractAddress: { $toLower: "$contractAddress" },
    },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              // Return only active in order to not bottleneck the query
              { $eq: ["$status", OrderStatus.CREATED] },
              { $eq: ["$side", OrderSide.SELL] },
              {
                $or: [
                  {
                    $and: [
                      {
                        $eq: ["$make.assetType.tokenId", "$$tokenId"],
                      },
                      {
                        $eq: ["$make.assetType.contract", "$$contractAddress"],
                      },
                    ],
                  },
                  {
                    $and: [
                      {
                        $eq: ["$take.assetType.tokenId", "$$tokenId"],
                      },
                      {
                        $eq: ["$take.assetType.contract", "$$contractAddress"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: 1,
      },
    ],
    as: "order",
  },
};

const nftLookup = {
  $lookup: {
    from: "nft-tokens",
    let: {
      makeTokenId: "$make.assetType.tokenId",
      //TODO: WE NEED COLLATION INDEX HERE
      makeContractAddress: "$make.assetType.contract",
    },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              {
                $eq: ["$tokenId", "$$makeTokenId"],
              },
              {
                $eq: ["$contractAddress", "$$makeContractAddress"],
              },
            ],
          },
        },
      },
      {
        $limit: 1,
      },
    ],
    as: "nft",
  },
};
