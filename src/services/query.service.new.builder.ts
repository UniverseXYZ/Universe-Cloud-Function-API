import { ethers } from "ethers";
import {
  INFTParams,
  IOrderParams,
  IGeneralParams,
  IOwnerParams,
} from "./interfaces/IQueryParams";
import { Utils } from "../utils/index";
import web3 from "web3";

import {
  AssetClass,
  OrderModel,
  OrderSide,
  OrderStatus,
} from "../models/order";

import {
  addEndSortingAggregation,
  addPriceSortingAggregation,
  SortOrderOptionsEnum,
} from "./query.service";

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
              { $eq: ["$status", OrderStatus.CREATED] },
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

// export const getNFTLookup = () => ({
//   $lookup: {
//     from: "nft-tokens",
//     let: {
//       makeTokenId: "$make.assetType.tokenId",
//       //TODO: WE NEED COLLATION INDEX HERE
//       makeContractAddress: "$make.assetType.contract",
//     },
//     pipeline: [
//       {
//         $match: {
//           $expr: {
//             $and: [
//               {
//                 $eq: ["$tokenId", "$$makeTokenId"],
//               },
//               {
//                 $eq: ["$contractAddress", "$$makeContractAddress"],
//               },
//             ],
//           },
//         },
//       },
//       {
//         $limit: 1,
//       },
//     ],
//     as: "nft",
//   },
// });

export const getNFTLookup = () => [
  {
    $lookup: {
      from: "nft-tokens",
      localField: "make.assetType.tokenId",
      foreignField: "tokenId",
      as: "nft",
    },
  },
  {
    $lookup: {
      from: "nft-tokens",
      localField: "make.assetType.contract",
      foreignField: "nft.contractAddress",
      as: "nft",
    },
  },
];

export const buildNftQuery = (nftParams: INFTParams) => {
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

export const buildOrderFilters = async (
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

export const buildOwnerParams = (ownerParams: IOwnerParams) => {
  const filters = [] as any;

  filters.push({
    address: ownerParams.ownerAddress,
  });

  const finalFilters = { $and: filters };

  return finalFilters;
};
