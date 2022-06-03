import {
  OrderModel,
  OrderSide,
  OrderStatus,
  TokenModel,
  NFTTokenOwnerModel,
  NFTCollectionModel,
} from "../models";

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
  buildNftQueryFilters,
  buildOrderQueryFilters,
  buildOwnerQueryFilters as buildOwnerQuery,
  buildGeneralParams,
  getNFTLookup,
  getOrdersLookup,
} from "./query.service.new.builder";

type FetchParams = {
  ownerAddress: string;
  tokenAddress: string;
  tokenType: string;
  searchQuery: string;
  page: number;
  limit: number;
  side: number;
  // NFT Type
  assetClass: string;
  tokenIds: string;
  // New checkbox
  beforeTimestamp: number;
  collection: string;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  // Has offers checkbox
  hasOffers: boolean;
  //Buy Now checkbox
  buyNow: boolean;
};

// TODO:: Write down the minimum required params for the Cloud function to be able to return a result without timing out from the DB
// TODO:: Upon retrieving orders, find return the Last & Best offers info
export const fetchNftsNew = async (params: FetchParams) => {
  const {
    ownerAddress,
    tokenAddress,
    tokenType,
    searchQuery,
    page,
    limit,
    side,
    assetClass,
    tokenIds,
    beforeTimestamp,
    collection,
    minPrice,
    maxPrice,
    sortBy,
    hasOffers,
    ...traits
  } = params;

  const queryParams: IQueryParams = {
    nftParams: {
      tokenAddress,
      tokenIds,
      searchQuery,
      tokenType,
      traits,
    },
    orderParams: {
      minPrice,
      maxPrice,
      sortBy,
      hasOffers,
      side,
      assetClass,
      beforeTimestamp,
      collection,
    },
    ownerParams: {
      ownerAddress,
      tokenType,
    },
    generalParams: buildGeneralParams(page, limit),
  };

  const hasNftParams = !!(
    queryParams.nftParams.tokenAddress ||
    queryParams.nftParams.tokenType ||
    queryParams.nftParams.searchQuery ||
    queryParams.nftParams.tokenIds ||
    queryParams.nftParams.traits
  );

  const hasOrderParams = !!(
    queryParams.orderParams.side ||
    queryParams.orderParams.assetClass ||
    queryParams.orderParams.minPrice ||
    queryParams.orderParams.maxPrice ||
    queryParams.orderParams.beforeTimestamp ||
    queryParams.orderParams.collection ||
    queryParams.orderParams.sortBy || // Include SortBy so it can kick the function without any other params, as can be used in the BrowseMarketplace Page
    queryParams.orderParams.hasOffers
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

    return queryOrderAndOwnerParams(
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

  const finalFilters = buildNftQueryFilters(nftParams);

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
    TokenModel.aggregate([...dbQuery, { $count: "tokenId" }], {
      collation: { locale: "en", strength: 2 },
    }),
  ]);

  console.timeEnd("query-time");

  return {
    page: Number(page),
    size: Number(limit),
    total: !count.length ? 0 : count[0].tokenId,
    nfts: data,
  };
};

// @Deprecated
// const queryOnlyOrderParams = async (
//   orderParams: IOrderParams,
//   generalParams: IGeneralParams
// ) => {
//   const { page, limit } = generalParams;

//   const skippedItems = (Number(page) - 1) * Number(limit);

//   const { finalFilters, sort } = await buildOrderFilters(
//     orderParams,
//     generalParams
//   );

//   const dbQuery = [{ $match: finalFilters }];

//   console.log("FILTERS:");
//   console.log(finalFilters);

//   console.log("Querying...");
//   console.time("query-time");

//   const [data, count] = await Promise.all([
//     OrderModel.aggregate(
//       [
//         ...dbQuery,
//         // ...sortingAggregation,
//         { $skip: skippedItems },
//         { $limit: Number(limit) },
//         getNFTLookup(),
//         { $sort: sort },
//       ],
//       { collation: { locale: "en", strength: 2 } }
//     ),
//     OrderModel.aggregate([...dbQuery, { $count: "count" }]),
//   ]);

//   console.log(data);

//   console.timeEnd("query-time");

//   return {
//     page: Number(page),
//     size: Number(limit),
//     total: count.count,
//     nfts: data,
//   };
// };

const queryOnlyOrderParams = async (
  orderParams: IOrderParams,
  generalParams: IGeneralParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const { finalFilters, sort } = await buildOrderQueryFilters(
    orderParams,
    generalParams
  );

  const dbQuery = [{ $match: finalFilters }];

  console.log("FILTERS:");
  console.log(finalFilters);

  console.log("Querying...");
  console.time("query-time");

  const [data, count] = await Promise.all([
    OrderModel.aggregate(
      [
        ...dbQuery,
        // ...sortingAggregation,
        { $sort: sort },
        {
          $group: {
            _id: {
              contract: "$make.assetType.contract",
              tokenId: "$make.assetType.tokenId",
            },
            contractAddress: { $first: "$make.assetType.contract" },
            tokenId: { $first: "$make.assetType.tokenId" },
          },
        },

        { $skip: skippedItems },
        { $limit: Number(limit) },
        // assuming that an order cannot be created if the noten in question is
        // absent in the "nft-token" table. i.e. there's always an NFT for an existing order.
        getNFTLookup(),
        getOrdersLookup(),
        {
          $project: {
            _id: 0,
            contractAddress: "$contractAddress",
            tokenId: "$tokenId",
            tokenType: { $first: "$nft.tokenType" },
            externalDomainViewUrl: { $first: "$nft.externalDomainViewUrl" },
            metadata: { $first: "$nft.metadata" },
            firstOwner: { $first: "$nft.firstOwner" },
            metadataFetchError: { $first: "$nft.metadataFetchError" },
            processingSentAt: { $first: "$nft.processingSentAt" },
            sentAt: { $first: "$nft.sentAt" },
            sentForMediaAt: { $first: "$nft.sentForMediaAt" },
            alternativeMediaFiles: { $first: "$nft.alternativeMediaFiles" },
            needToRefresh: { $first: "$nft.needToRefresh" },
            source: { $first: "$nft.source" },
            orders: "$orders",
          },
        },
      ],
      { collation: { locale: "en", strength: 2 } }
    ),
    OrderModel.aggregate([
      ...dbQuery,
      {
        $group: {
          _id: {
            contract: "$make.assetType.contract",
            tokenId: "$make.assetType.tokenId",
          },
        },
      },
      { $count: "count" },
    ]),
  ]);

  console.timeEnd("query-time");

  return {
    page: Number(page),
    size: Number(limit),
    total: !count.length ? 0 : count[0].count,
    nfts: data,
  };
};

const queryOnlyOwnerParams = async (
  ownerParams: IOwnerParams,
  generalParams: IGeneralParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const ownerQuery = buildOwnerQuery(ownerParams);

  console.time("query-time");
  const tokenFilters = await ownerQuery;

  console.timeEnd("query-time");

  if (!tokenFilters.length) {
    return {
      page: Number(page),
      size: Number(limit),
      total: 0,
      nfts: [],
    };
  }

  console.time("query-time2");

  const [data, count] = await Promise.all([
    TokenModel.aggregate(
      [
        { $match: { $and: [{ $or: tokenFilters }] } },
        { $skip: skippedItems },
        { $limit: Number(limit) },
        getOrdersLookup(),
      ],
      { collation: { locale: "en", strength: 2 } }
    ),
    TokenModel.aggregate(
      [{ $match: { $and: [{ $or: tokenFilters }] } }, { $count: "tokenId" }],
      { collation: { locale: "en", strength: 2 } }
    ),
  ]);
  console.timeEnd("query-time2");

  return {
    page: Number(page),
    size: Number(limit),
    total: !count.length ? 0 : count[0].tokenId,
    nfts: data,
  };
};

const queryNftAndOwnerParams = async (
  nftParams,
  ownerParams,
  generalParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const ownerQuery = buildOwnerQuery(ownerParams);
  // TOOO: Make several execution pathways

  // Option 1 [NOT WORKING]
  // JS Heap out of memory because we don't limit the results for the TokenModel query
  // const nftFilters = buildNftQueryFilters(nftParams);
  // console.time("query-time");
  // const [nfts, owners] = await Promise.all([
  //   TokenModel.find(nftFilters).lean(),
  //   ownerQuery,
  // ]);
  // console.timeEnd("query-time");

  // Option 2
  console.time("owner-query-time");
  const owners = await ownerQuery;
  console.timeEnd("owner-query-time");

  const nftFilters = await buildNftQueryFilters(nftParams);
  // Apply Pagination
  console.time("nft-query-time");
  const nfts = await TokenModel.find({
    $and: [
      {
        $or: owners,
      },
      ...nftFilters.$and,
    ],
  })
    .skip(skippedItems)
    .limit(Number(limit))
    .lean();
  console.timeEnd("nft-query-time");

  const filtered = [];

  if (!nfts.length || !owners.length) {
    return {
      page: Number(page),
      size: Number(limit),
      total: 0,
      nfts: [],
    };
  }

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

  if (!filtered.length) {
    return {
      page: Number(page),
      size: Number(limit),
      total: 0,
      nfts: [],
    };
  }

  const paginated = filtered.slice(skippedItems);

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
      orders.find(
        (order) =>
          order.make.assetType.tokenId === nft.tokenId &&
          order.make.assetType.contract === nft.contractAddress.toLowerCase()
      ) || [],
  }));

  return {
    page: Number(page),
    size: Number(limit),
    total: filtered.length,
    nfts: finalNfts,
  };
};

const queryNftAndOrderParams = async (
  nftParams,
  orderParams,
  generalParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const nftFilters = buildNftQueryFilters(nftParams);
  const orderFilters = buildOrderQueryFilters(orderParams, generalParams);

  const [nfts, orders] = await Promise.all([
    TokenModel.find(nftFilters).lean(),
    OrderModel.find(orderFilters).lean(),
  ]);

  if (!nfts.length || !orders.length) {
    return {
      page: Number(page),
      size: Number(limit),
      total: 0,
      nfts: [],
    };
  }

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

  if (!filtered.length) {
    return {
      page: Number(page),
      size: Number(limit),
      total: 0,
      nfts: [],
    };
  }

  const paginated = filtered.slice(skippedItems);

  return {
    page: Number(page),
    size: Number(limit),
    total: filtered.length,
    nfts: paginated,
  };
};
const queryOrderAndOwnerParams = async (
  orderParams,
  ownerParams,
  generalParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const orderFilters = await buildOrderQueryFilters(orderParams, generalParams);
  const ownerQuery = buildOwnerQuery(ownerParams);

  const [orders, owners] = await Promise.all([
    TokenModel.find(orderFilters).lean(),
    ownerQuery,
  ]);

  if (!orders.length || !owners.length) {
    return {
      page: Number(page),
      size: Number(limit),
      total: 0,
      nfts: [],
    };
  }

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

  if (!filtered.length) {
    return {
      page: Number(page),
      size: Number(limit),
      total: 0,
      nfts: [],
    };
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

  if (!nfts.length) {
    return {
      page: Number(page),
      size: Number(limit),
      total: 0,
      nfts: [],
    };
  }

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

  return {
    page: Number(page),
    size: Number(limit),
    total: filtered.length,
    nfts: finalNfts,
  };
};

const queryMixedParams = async (
  nftParams,
  orderParams,
  ownerParams,
  generalParams
) => {
  const { page, limit } = generalParams;

  const skippedItems = (Number(page) - 1) * Number(limit);

  const nftFilters = buildNftQueryFilters(nftParams);
  const ownerQuery = buildOwnerQuery(ownerParams);
  const orderFilters = await buildOrderQueryFilters(orderParams, generalParams);

  console.time("query-time");
  const [nfts, owners, orders] = await Promise.all([
    TokenModel.find(nftFilters).lean(),
    ownerQuery,
    OrderModel.find(orderFilters).lean(),
  ]);
  console.timeEnd("query-time");

  if (!nfts.length || !owners.length || !orders.length) {
    return {
      page: Number(page),
      size: Number(limit),
      total: 0,
      nfts: [],
    };
  }

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

  if (!filtered.length) {
    return {
      page: Number(page),
      size: Number(limit),
      total: 0,
      nfts: [],
    };
  }

  const paginated = filtered.slice(skippedItems);

  return {
    page: Number(page),
    size: Number(limit),
    total: filtered.length,
    nfts: paginated,
  };
};
