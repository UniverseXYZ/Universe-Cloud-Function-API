import { OrderModel, OrderSide, OrderStatus, TokenModel } from "../../models";

import {
  FetchParams,
  IGeneralParams,
  INFTParams,
  IOrderParams,
  IOwnerParams,
  IQueryParams,
} from "../../interfaces";

import {
  hasNftParamsOnly,
  hasOrderParamsOnly,
  hasOwnerParamsOnly,
} from "./nft.service.helpers";

import {
  buildNftQueryFilters,
  buildOrderQueryFilters,
  buildOwnerQuery,
  buildGeneralParams,
  getNFTLookup,
  getOrdersLookup,
  getOwnersByTokens,
} from "./nft.service.builder";
import { ethers } from "ethers";

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
    contractAddress,
    minPrice,
    maxPrice,
    sortBy,
    hasOffers,
    buyNow,
    ...traits
  } = params;

  const queryParams: IQueryParams = {
    nftParams: {
      contractAddress,
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
      tokenAddress,
    },
    ownerParams: {
      ownerAddress,
    },
    generalParams: buildGeneralParams(page, limit),
  };

  const hasNftParams = !!(
    queryParams.nftParams.contractAddress ||
    queryParams.nftParams.tokenType ||
    queryParams.nftParams.searchQuery ||
    queryParams.nftParams.tokenIds ||
    Object.keys(queryParams.nftParams.traits).length
  );

  const hasOrderParams = !!(
    queryParams.orderParams.side ||
    queryParams.orderParams.assetClass ||
    queryParams.orderParams.minPrice ||
    queryParams.orderParams.maxPrice ||
    queryParams.orderParams.beforeTimestamp ||
    queryParams.orderParams.tokenAddress ||
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
      queryParams.generalParams,
      queryParams.nftParams.tokenType
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
      queryParams.orderParams,
      queryParams.ownerParams,
      queryParams.generalParams,
      queryParams.nftParams.tokenType
    );
  }

  if (hasNftParams && hasOrderParams && hasOwnerParams) {
    console.log("Querying mixed params");

    return queryMixedParams(
      queryParams.nftParams,
      queryParams.orderParams,
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

  const nftFilters = await buildNftQueryFilters(nftParams);

  console.log("Querying...");
  console.time("query-time");

  const data = await TokenModel.aggregate(
    [
      ...nftFilters,
      { $skip: generalParams.skippedItems },
      { $limit: Number(limit) },
      getOrdersLookup(),
      { $sort: { searchScore: -1, updatedAt: -1 } },
    ],
    { collation: { locale: "en", strength: 2 } }
  );

  if (!data.length) {
    return {
      page: page,
      size: limit,
      nfts: [],
    };
  }
  const owners = await getOwnersByTokens(data, nftParams.tokenType);

  const finalData = data.map((nft) => {
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
      owners: ownerAddresses,
    };
  });

  console.timeEnd("query-time");

  return {
    page: page,
    size: limit,
    nfts: finalData,
  };
};

const queryOnlyOrderParams = async (
  orderParams: IOrderParams,
  generalParams: IGeneralParams
) => {
  const { page, limit } = generalParams;

  const { finalFilters, sort } = await buildOrderQueryFilters(
    orderParams,
    generalParams
  );

  const dbQuery = [{ $match: finalFilters }];

  console.log("FILTERS:");
  console.log(finalFilters);

  console.log("Querying...");
  console.time("query-time");

  const data = await OrderModel.aggregate(
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

      { $skip: generalParams.skippedItems },
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
  );

  console.timeEnd("query-time");

  const owners = await getOwnersByTokens(data);

  const finalData = data.map((nft) => {
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
      owners: ownerAddresses,
    };
  });

  return {
    page: page,
    size: limit,
    nfts: finalData,
  };
};

const queryOnlyOwnerParams = async (
  ownerParams: IOwnerParams,
  generalParams: IGeneralParams,
  tokenType: string
) => {
  const { page, limit } = generalParams;

  const ownerQuery = buildOwnerQuery(
    ownerParams,
    tokenType,
    generalParams.skippedItems,
    generalParams.limit
  );

  console.time("query-time");
  const owners = await ownerQuery;

  console.timeEnd("query-time");

  if (!owners.length) {
    return {
      page: page,
      size: limit,
      nfts: [],
    };
  }

  console.time("query-time2");

  const data = await TokenModel.aggregate(
    [
      {
        $match: {
          $and: [
            {
              $or: owners.map((owner) => ({
                tokenId: owner.tokenId,
                contractAddress: owner.contractAddress,
              })),
            },
          ],
        },
      },
      { $skip: generalParams.skippedItems },
      { $limit: Number(limit) },
      getOrdersLookup(),
    ],
    { collation: { locale: "en", strength: 2 } }
  );

  console.timeEnd("query-time2");

  const finalData = data.map((nft) => {
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
      owners: ownerAddresses,
    };
  });

  return {
    page: page,
    size: limit,
    nfts: finalData,
  };
};

const queryNftAndOwnerParams = async (
  nftParams: INFTParams,
  ownerParams: IOwnerParams,
  generalParams: IGeneralParams
) => {
  const { page, limit } = generalParams;

  const ownerQuery = buildOwnerQuery(ownerParams, nftParams.tokenType);

  console.time("owner-query-time");
  const owners = await ownerQuery;
  console.timeEnd("owner-query-time");

  const nftFilters = await buildNftQueryFilters(
    nftParams,
    owners.map((owner) => ({
      contractAddress: owner.contractAddress,
      tokenId: owner.tokenId,
    }))
  );
  // Apply Pagination
  console.time("nft-query-time");
  const nfts = await TokenModel.aggregate(
    [
      ...nftFilters,
      { $skip: generalParams.skippedItems },
      { $limit: Number(limit) },
      { $sort: { searchScore: -1 } },
    ],
    { collation: { locale: "en", strength: 2 } }
  );

  console.timeEnd("nft-query-time");

  const filtered = [];

  if (!nfts.length || !owners.length) {
    return {
      page: page,
      size: limit,
      nfts: [],
    };
  }

  for (let i = 0; i < nfts.length; i++) {
    const nft = nfts[i];

    const nftOwners = owners.filter(
      (owner) =>
        owner.tokenId === nft.tokenId &&
        owner.contractAddress.toLowerCase() ===
          nft.contractAddress.toLowerCase()
    );

    if (nftOwners.length) {
      const ownerAddresses = nftOwners.map((owner) => ({
        owner: owner.address,
        value: owner.value
          ? owner.value.toString()
          : ethers.BigNumber.from(owner.value).toString(),
      }));

      filtered.push({ ...nft, owners: ownerAddresses });
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
      orders.filter(
        (order) =>
          order.make.assetType.tokenId === nft.tokenId &&
          order.make.assetType.contract.toLowerCase() ===
            nft.contractAddress.toLowerCase()
      ) || [],
  }));

  return {
    page: page,
    size: limit,
    nfts: finalNfts,
  };
};

const queryNftAndOrderParams = async (
  nftParams,
  orderParams,
  generalParams
) => {
  const { page, limit } = generalParams;

  const nftFilters = await buildNftQueryFilters(nftParams);
  const orderFilters = await buildOrderQueryFilters(orderParams, generalParams);

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
};
const queryOrderAndOwnerParams = async (
  orderParams: IOrderParams,
  ownerParams: IOwnerParams,
  generalParams: IGeneralParams,
  tokenType: string
) => {
  const { page, limit } = generalParams;

  const orderFilters = await buildOrderQueryFilters(orderParams, generalParams);
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
            order.make.assetType?.contract === nft.contractAddress.toLowerCase()
        ) || [],
      owners: ownerAddresses,
    };
  });

  return {
    page: page,
    size: limit,
    nfts: finalNfts,
  };
};

const queryMixedParams = async (
  nftParams: INFTParams,
  orderParams: IOrderParams,
  ownerParams: IOwnerParams,
  generalParams: IGeneralParams
) => {
  const { page, limit } = generalParams;

  const nftFilters = await buildNftQueryFilters(nftParams);
  const ownerQuery = buildOwnerQuery(ownerParams, nftParams.tokenType);
  const orderFilters = await buildOrderQueryFilters(orderParams, generalParams);

  console.time("query-time");
  const [nfts, owners, orders] = await Promise.all([
    TokenModel.aggregate([...nftFilters, { $sort: { searchScore: -1 } }], {
      collation: { locale: "en", strength: 2 },
    }),
    ownerQuery,
    OrderModel.find(orderFilters).lean(),
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
  for (let i = 0; i < nfts.length; i++) {
    const nft = nfts[i];

    const ownersInfo = owners.filter(
      (owner) =>
        owner.tokenId === nft.tokenId &&
        owner.contractAddress.toLowerCase() ===
          nft.contractAddress.toLowerCase()
    );

    const nftOrders = orders.filter(
      (order) =>
        order.make.assetType.tokenId === nft.tokenId &&
        order.make.assetType.contract === nft.contractAddress.toLowerCase()
    );

    if (ownersInfo && nftOrders && ownersInfo.length && nftOrders.length) {
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
};
