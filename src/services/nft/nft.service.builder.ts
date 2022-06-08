import { ethers, utils } from "ethers";
import {
  INFTParameters,
  IOrderParameters,
  IGeneralParameters,
  IOwnerParameters,
} from "../../interfaces";
import { TOKENS, Utils } from "../../utils/index";

import {
  AssetClass,
  OrderModel,
  OrderSide,
  OrderStatus,
  NFTCollectionAttributesModel,
} from "../../models";

import { constants } from "../../constants";
import { NFTTokenOwnerModel, ERC1155NFTTokenOwnerModel } from "../../models";
import { fetchTokenPrices } from "../token-prices/token-price.service";

export enum SortOrderOptionsEnum {
  EndingSoon = 1,
  HighestPrice = 2,
  LowestPrice = 3,
  RecentlyListed = 4,
}

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

export const buildNftQueryFilters = async (
  nftParams: INFTParameters,
  owners: any[] = []
) => {
  const { contractAddress, tokenIds, searchQuery, tokenType, traits } =
    nftParams;
  const filters = [] as any;
  const searchFilters = [] as any;

  if (contractAddress) {
    if (!owners.length) {
      filters.push({ contractAddress });
    } else {
      const filteredOwners: any[] = owners.filter(
        (o: any) =>
          o.contractAddress.toLowerCase() === contractAddress.toLowerCase()
      );

      if (!filteredOwners.length) {
        return [];
      }
      owners = filteredOwners;
    }
  }

  if (searchQuery) {
    searchFilters.push({
      $search: {
        index: "metadata.name",
        // text: {
        //   query: searchQuery,
        //   path: "metadata.name",
        // },
        regex: {
          query: `.*${searchQuery}*.`,
          path: "metadata.name",
          allowAnalyzedField: true,
        },
        // phrase: {
        //   path: "metadata.name",
        //   query: searchQuery,
        //   slop: 5,
        // },
        // autocomplete: {
        //   query: searchQuery,
        //   path: "metadata.name",
        // },
      },
    });
  }

  // In order to be able to perform a search in the collection-attributes table we need the contract address and traits
  const hasTraitParams = contractAddress && Object.keys(traits).length > 0;

  // The user either is going to search by traits or by tokenIds (if its searching for a specific token info)
  if (hasTraitParams) {
    const ids = await getTokenIdsByCollectionAttributes(
      contractAddress,
      traits
    );

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

  const nftFilters = [];
  // Assemble final order of filters

  if (searchFilters.length) {
    nftFilters.push(...searchFilters);
  }

  if (filters.length && owners.length) {
    nftFilters.push({
      $match: {
        $and: [
          ...filters,
          {
            $or: owners,
          },
        ],
      },
    });
  } else if (filters.length) {
    nftFilters.push({ $match: { $and: filters } });
  } else if (owners.length) {
    nftFilters.push({ $match: { $or: owners } });
  }

  if (searchFilters.length) {
    nftFilters.push({
      $addFields: {
        searchScore: { $meta: "searchScore" },
      },
    });
  }

  console.log("NFT FILTERS:");
  console.log(nftFilters);
  return nftFilters;
};

export const buildOrderQueryFilters = async (
  orderParams: IOrderParameters,
  generalParams: IGeneralParameters
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
    tokenAddress,
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

  if (tokenAddress) {
    const sideToFilter = side && OrderSide.BUY === side ? "take" : "make";
    if (tokenAddress === ethers.constants.AddressZero) {
      filters.push({
        [`${sideToFilter}.assetType.assetClass`]: AssetClass.ETH,
      });
    } else {
      const checkSumAddress = utils.getAddress(tokenAddress);
      filters.push({
        [`${sideToFilter}.assetType.contract`]: checkSumAddress,
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
  switch (sortBy) {
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

  return { finalFilters, sortingAggregation, sort };
};

export const buildOwnerQuery = (
  ownerParams: IOwnerParameters,
  tokenType: string,
  skip = 0,
  limit = 0
) => {
  const filters = [] as any;
  const limitFilters = [] as any;
  // TODO: Add validation when request is received to validate ERC721 or ERC1155 strings
  filters.push({
    address: ownerParams.ownerAddress,
  });

  if (limit) {
    limitFilters.push({ $limit: limit });
  }
  if (skip) {
    limitFilters.push({ $skip: skip });
  }

  const finalFilters = { $and: filters };

  switch (tokenType) {
    case "ERC721":
      return NFTTokenOwnerModel.aggregate(
        [{ $match: finalFilters }, ...limitFilters],
        { collation: { locale: "en", strength: 2 } }
      );
    case "ERC1155":
      return ERC1155NFTTokenOwnerModel.aggregate(
        [{ $match: finalFilters }, ...limitFilters],
        { collation: { locale: "en", strength: 2 } }
      );
    default:
      return NFTTokenOwnerModel.aggregate(
        [
          {
            $unionWith: {
              coll: "nft-erc1155-token-owners",
              pipeline: [],
            },
          },
          { $match: finalFilters },
          ...limitFilters,
        ],
        { collation: { locale: "en", strength: 2 } }
      );
  }
};

export const buildGeneralParams = (
  page: number,
  limit: number
): IGeneralParameters => {
  const generalParams = {
    page: Number(page) > 0 ? Math.floor(Number(page)) : 1,
    limit:
      Number(limit) > 0 &&
      Math.floor(Number(limit)) <= constants.QUERY_SIZE_LIMIT
        ? Number(limit)
        : constants.DEFAULT_QUERY_SIZE,
  } as any;

  generalParams.skippedItems =
    (Number(generalParams.page) - 1) * Number(generalParams.limit);

  return generalParams;
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

export const getOwnersByTokens = async (tokens, tokenType: string = "") => {
  const query = {
    $or: tokens.map((token) => ({
      contractAddress: token.contractAddress,
      tokenId: token.tokenId,
    })),
  };

  switch (tokenType) {
    case "ERC721":
      return NFTTokenOwnerModel.aggregate(
        [{ $match: query }]
        //   {
        //   collation: { locale: "en", strength: 2 },
        // }
      );
    case "ERC1155":
      return ERC1155NFTTokenOwnerModel.aggregate(
        [{ $match: query }]
        //    {
        //   collation: { locale: "en", strength: 2 },
        // }
      );
    default:
      return NFTTokenOwnerModel.aggregate(
        [
          {
            $unionWith: {
              coll: "nft-erc1155-token-owners",
              pipeline: [],
            },
          },
          { $match: query },
        ]
        // { collation: { locale: "en", strength: 2 } }
      );
  }
};

export const addEndSortingAggregation = () => {
  // We want to show orders with offers in ascending order but also show offers without offers at the end
  return [
    {
      $addFields: {
        orderSort: {
          $switch: {
            branches: [
              {
                case: {
                  $eq: ["$end", 0],
                },
                // Workaround which is safe to use until year 2255
                then: Number.MAX_SAFE_INTEGER,
              },
            ],
            default: "$end",
          },
        },
      },
    },
  ];
};

export const addPriceSortingAggregation = async (orderSide: OrderSide) => {
  const [
    { value: ethPrice },
    { value: wethPrice },
    { value: daiPrice },
    { value: usdcPrice },
    { value: xyzPrice },
  ] = await fetchTokenPrices();

  console.log(`ETH Price: ${ethPrice}`);
  console.log(`USDC Price: ${usdcPrice}`);
  console.log(`XYZ Price: ${xyzPrice}`);
  console.log(`DAI Price: ${daiPrice}`);
  console.log(`WETH Price: ${wethPrice}`);

  if (orderSide === OrderSide.BUY) {
    return [
      {
        $addFields: {
          usd_value: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$make.assetType.assetClass", AssetClass.ETH],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: "$make.value" },
                      Math.pow(10, Utils.TOKEN_DECIMALS[TOKENS.ETH]) * ethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$make.assetType.contract", daiPrice],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: "$make.value" },
                      Math.pow(10, Utils.TOKEN_DECIMALS[TOKENS.DAI]) * daiPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$make.assetType.contract", wethPrice],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: "$make.value" },
                      Math.pow(10, Utils.TOKEN_DECIMALS[TOKENS.WETH]) *
                        wethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$make.assetType.contract", usdcPrice],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: "$make.value" },
                      Math.pow(10, Utils.TOKEN_DECIMALS[TOKENS.USDC]) *
                        usdcPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$make.assetType.contract", xyzPrice],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: "$make.value" },
                      Math.pow(10, Utils.TOKEN_DECIMALS[TOKENS.XYZ]) * xyzPrice,
                    ],
                  },
                },
              ],
              default: 0,
            },
          },
        },
      },
    ];
  } else {
    return [
      {
        $addFields: {
          usd_value: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$take.assetType.assetClass", AssetClass.ETH],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: "$take.value" },
                          { $pow: [10, Utils.TOKEN_DECIMALS[TOKENS.ETH]] },
                        ],
                      },
                      ethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$take.assetType.contract", daiPrice],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: "$take.value" },
                          { $pow: [10, Utils.TOKEN_DECIMALS[TOKENS.DAI]] },
                        ],
                      },
                      daiPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$take.assetType.contract", wethPrice],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: "$take.value" },
                          { $pow: [10, Utils.TOKEN_DECIMALS[TOKENS.WETH]] },
                        ],
                      },
                      wethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$take.assetType.contract", usdcPrice],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: "$take.value" },
                          { $pow: [10, Utils.TOKEN_DECIMALS[TOKENS.USDC]] },
                        ],
                      },
                      usdcPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$take.assetType.contract", xyzPrice],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: "$take.value" },
                          { $pow: [10, Utils.TOKEN_DECIMALS[TOKENS.XYZ]] },
                        ],
                      },
                      xyzPrice,
                    ],
                  },
                },
              ],
              default: 0,
            },
          },
        },
      },
    ];
  }
};
