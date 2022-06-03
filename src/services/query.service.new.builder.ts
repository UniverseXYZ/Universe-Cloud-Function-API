import { ethers } from "ethers";
import {
  INFTParams,
  IOrderParams,
  IGeneralParams,
  IOwnerParams,
} from "./interfaces/IQueryParams";
import { Utils } from "../utils/index";

import {
  AssetClass,
  OrderModel,
  OrderSide,
  OrderStatus,
  NFTCollectionAttributesModel,
} from "../models";

import {
  addEndSortingAggregation,
  addPriceSortingAggregation,
  SortOrderOptionsEnum,
} from "./query.service";
import { constants } from "../constants";
import { NFTTokenOwnerModel, ERC1155NFTTokenOwnerModel } from "../models";

// Lookup to join the document representing the owner of the nft from nft-token-owners
export const getNFTOwnersLookup = () => ({
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
});

// Lookup to join the document representing the active sell order of the nft from marketplace-orders
export const getOrdersLookup = () => ({
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
                        $eq: ["$make.assetType.contract", "$$contractAddress"],
                      },
                    ],
                  },
                ],
              },
              {
                $or: [
                  {
                    $eq: ["$status", OrderStatus.CREATED],
                  },
                  {
                    $eq: ["$status", OrderStatus.PARTIALFILLED],
                  },
                ],
              },
              // { $eq: ["$status", OrderStatus.CREATED] },
              { $eq: ["$side", OrderSide.SELL] },
            ],
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ],
    as: "orders",
  },
});

export const getNFTLookup = () => ({
  $lookup: {
    from: "nft-tokens",
    let: {
      // makeTokenId: "$make.assetType.tokenId",
      makeTokenId: "$_id.tokenId",
      //TODO: WE NEED COLLATION INDEX HERE
      // makeContractAddress: "$make.assetType.contract",
      makeContractAddress: "$_id.contract",
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
});

// export const getNFTLookup = () => [
//   {
//     $lookup: {
//       from: "nft-tokens",
//       localField: "make.assetType.tokenId",
//       foreignField: "tokenId",
//       as: "nft",
//     },
//   },
//   {
//     $lookup: {
//       from: "nft-tokens",
//       localField: "make.assetType.contract",
//       foreignField: "nft.contractAddress",
//       as: "nft",
//     },
//   },
// ];

export const buildNftQuery = async (nftParams: INFTParams) => {
  const { tokenAddress, tokenIds, searchQuery, tokenType, traits } = nftParams;
  const filters = [] as any;

  if (tokenAddress) {
    filters.push({ contractAddress: tokenAddress });
  }

  if (searchQuery) {
    filters.push({
      "metadata.name": { $regex: new RegExp(searchQuery, "i") },
    });
  }

  // In order to be able to perform a search in the collection-attributes table we need the contract address and traits
  const hasTraitParams = tokenAddress && Object.keys(traits).length > 0;

  // The user either is going to search by traits or by tokenIds (if its searching for a specific token info)
  if (hasTraitParams) {
    const ids = await getTokenIdsByCollectionAttributes(tokenAddress, traits);

    if (ids && ids.length) {
      filters.push({
        tokenId: { $in: ids },
      });
    }
  } else if (tokenIds) {
    const tokenIdsSplit = tokenIds.replace(/\s/g, "").split(",");

    filters.push({
      tokenId: { $in: tokenIdsSplit },
    });
  }

  if (tokenType) {
    filters.push({ tokenType });
  }

  const finalFilters = { $and: filters };

  return finalFilters;
};

export const buildOrderQueryFilters = async (
  orderParams: IOrderParams,
  generalParams: IGeneralParams
) => {
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
    collection,
  } = orderParams;

  //assuming that, when querying orders, certain filtering should exist by default
  if (!side) {
    filters.push({
      side: OrderSide.SELL,
    });
  }
  filters.push({
    status: { $in: [OrderStatus.CREATED, OrderStatus.PARTIALFILLED] },
  });
  filters.push({
    $or: [{ start: { $lt: utcTimestamp } }, { start: 0 }],
  });
  filters.push({
    $or: [{ end: { $gt: utcTimestamp } }, { end: 0 }],
  });

  // ORDER FILTERS
  if (minPrice) {
    const weiPrice = ethers.utils.parseUnits(minPrice as string, 18).toString();
    // TODO: If possible remove $expr because it can't use the mulitykey index

    filters.push({
      $expr: {
        $gte: [{ $toDecimal: "$take.value" }, parseFloat(weiPrice)],
      },
    });
  }

  if (maxPrice) {
    const weiPrice = ethers.utils.parseUnits(maxPrice as string, 18).toString();

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

  if (collection) {
    const sideToFilter = side && OrderSide.BUY === side ? "take" : "make";
    if (collection === ethers.constants.AddressZero) {
      filters.push({
        [`${sideToFilter}.assetType.assetClass`]: AssetClass.ETH,
      });
    } else {
      // REGEX SEARCH IS NOT PERFORMANT
      // DOCUMENTDB DOESNT SUPPORT COLLATION INDICES
      // query.collection address MUST BE UPPERCASE CONTRACT ADDRESS
      filters.push({
        [`${sideToFilter}.assetType.contract`]: collection,
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

export const buildOwnerQueryFilters = (ownerParams: IOwnerParams) => {
  const filters = [] as any;
  // TODO: Add validation when request is received to validate ERC721 or ERC1155 strings
  filters.push({
    address: ownerParams.ownerAddress,
  });

  const finalFilters = { $and: filters };

  switch (ownerParams.tokenType) {
    case "ERC721":
      return NFTTokenOwnerModel.aggregate([
        { $match: finalFilters },
        { $project: { contractAddress: 1, tokenId: 1, _id: 0 } },
      ]);
    case "ERC1155":
      return ERC1155NFTTokenOwnerModel.aggregate([
        { $match: finalFilters },
        { $project: { contractAddress: 1, tokenId: 1, _id: 0 } },
      ]);
    default:
      return NFTTokenOwnerModel.aggregate([
        {
          $unionWith: {
            coll: "nft-erc1155-token-owners",
            pipeline: [
              { $project: { contractAddress: 1, tokenId: 1, address: 1 } },
            ],
          },
        },
        { $match: finalFilters },
        { $project: { contractAddress: 1, tokenId: 1, _id: 0 } },
      ]);
  }
};

export const buildGeneralParams = (page: any, limit: any) => {
  return {
    page: Number(page) > 0 ? Math.floor(Number(page)) : 1,
    limit:
      Number(limit) > 0 &&
      Math.floor(Number(limit)) <= constants.QUERY_SIZE_LIMIT
        ? Number(limit)
        : constants.DEFAULT_QUERY_SIZE,
  };
};

// TODO:: add description
// TODO:: Add traits type
export const getTokenIdsByCollectionAttributes = async (
  contractAddress: string,
  traits: any
) => {
  const allTraitsArray = [];

  // construct fields for the database query
  for (const trait in traits) {
    traits[trait].split(",").forEach((type) => {
      const field = `$attributes.${trait.trim()}.${type.trim()}`;
      allTraitsArray.push(field);
    });
  }

  const filter = {
    contractAddress: ethers.utils.getAddress(contractAddress),
  };

  try {
    const tokenIds = await NFTCollectionAttributesModel.aggregate([
      { $match: filter },
      {
        $project: {
          tokens: {
            $concatArrays: allTraitsArray,
          },
        },
      },
      {
        $group: {
          _id: null,
          tokens: { $addToSet: "$tokens" },
        },
      },
      { $unwind: "$tokens" },
      { $unset: "_id" },
    ]);

    return tokenIds[0]?.tokens || [];
  } catch (error) {
    console.error(
      `Error while trying to get Collection attributes for, ${contractAddress} for traits ${traits}`
    );
  }
};
