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
export enum SortOrderOptionsEnum {
  EndingSoon = 1,
  HighestPrice = 2,
  LowestPrice = 3,
  RecentlyListed = 4,
}
import { TokenModel } from "../models/token";
export const fetchNfts = async (
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
  const utcTimestamp = Utils.getUtcTimestamp();

  const filters = [] as any;

  // NFT FILTERS
  if (ownerAddress) {
    filters.push({
      "owner.address": ownerAddress,
    });
  }

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

  // ORDER FILTERS
  if (side) {
    filters.push({
      "order.side": side,
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
        "order.take.assetType.assetClass": AssetClass.ETH,
      });
    } else {
      // REGEX SEARCH IS NOT PERFORMANT
      // DOCUMENTDB DOESNT SUPPORT COLLATION INDICES
      // query.token address MUST BE UPPERCASE CONTRACT ADDRESS
      filters.push({
        "order.take.assetType.contract": token,
      });
    }
  }

  if (assetClass) {
    const assetClasses = assetClass.replace(/\s/g, "").split(",");

    filters.push({ "order.make.assetType.assetClass": { $in: assetClasses } });
  }

  if (tokenIds) {
    const tokenIdsSplit = tokenIds.replace(/\s/g, "").split(",");

    // If query gets slow we can try to conditionally add the queries depending on whether
    // we have side filter or not
    filters.push({
      "order.make.assetType.tokenId": { $in: tokenIdsSplit },
    });
  }

  if (!!hasOffers) {
    // Get all buy orders
    const buyOffers = await OrderModel.find({
      $and: [
        {
          status: OrderStatus.CREATED,
          side: OrderSide.BUY,
        },
        {
          $or: [{ start: { $lt: utcTimestamp } }, { start: 0 }],
        },
        { $or: [{ end: { $gt: utcTimestamp } }, { end: 0 }] },
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
          "order.make.assetType.tokenId": tokenId,
          "order.make.assetType.contract": contract.toLowerCase(),
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

  if (minPrice) {
    const weiPrice = web3.utils.toWei(minPrice);

    filters.push({
      $expr: {
        $gte: [{ $toDecimal: "$order.take.value" }, parseFloat(weiPrice)],
      },
    });
  }

  if (maxPrice) {
    const weiPrice = web3.utils.toWei(maxPrice);

    filters.push({
      $expr: {
        $lte: [{ $toDecimal: "$order.take.value" }, parseFloat(weiPrice)],
      },
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
  sort = {
    ...sort,
    updatedAt: -1,
    _id: -1,
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
                          $eq: [
                            "$make.assetType.contract",
                            "$$contractAddress",
                          ],
                        },
                      ],
                    },
                    {
                      $and: [
                        {
                          $eq: ["$take.assetType.tokenId", "$$tokenId"],
                        },
                        {
                          $eq: [
                            "$take.assetType.contract",
                            "$$contractAddress",
                          ],
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

  const tableAggregation = [
    nftOwnersLookup,
    orderLookup,
    { $unwind: "$owner" },
    { $unwind: "$order" },
    { $match: { $and: filters } },
  ];

  const skippedItems = (Number(page) - 1) * Number(limit);
  const [data, count] = await Promise.all([
    TokenModel.aggregate([
      ...tableAggregation,
      ...sortingAggregation,
      { $skip: skippedItems },
      { $limit: Number(limit) },
      { $sort: sort },
    ]),
    TokenModel.aggregate([...tableAggregation, { $count: "tokenId" }]),
  ]);
  console.log(data);
  return {
    page: Number(page),
    size: Number(limit),
    total: !count.length ? 0 : count[0].tokenId,
    nfts: data,
  };
};

const addEndSortingAggregation = () => {
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

const addPriceSortingAggregation = async (orderSide: OrderSide) => {
  const [
    { value: ethPrice },
    { value: usdcPrice },
    { value: xyzPrice },
    { value: daiPrice },
    { value: wethPrice },
  ] = await getPrices([
    TOKENS.ETH,
    TOKENS.USDC,
    TOKENS.XYZ,
    TOKENS.DAI,
    TOKENS.WETH,
  ]);

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
                    $eq: ["$order.make.assetType.assetClass", AssetClass.ETH],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: "$order.make.value" },
                      Math.pow(10, TOKEN_DECIMALS[TOKENS.ETH]) * ethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$order.make.assetType.contract", daiPrice],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: "$order.make.value" },
                      Math.pow(10, TOKEN_DECIMALS[TOKENS.DAI]) * daiPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$order.make.assetType.contract", wethPrice],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: "$order.make.value" },
                      Math.pow(10, TOKEN_DECIMALS[TOKENS.WETH]) * wethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$order.make.assetType.contract", usdcPrice],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: "$order.make.value" },
                      Math.pow(10, TOKEN_DECIMALS[TOKENS.USDC]) * usdcPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$order.make.assetType.contract", xyzPrice],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: "$order.make.value" },
                      Math.pow(10, TOKEN_DECIMALS[TOKENS.XYZ]) * xyzPrice,
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
                    $eq: ["$order.take.assetType.assetClass", AssetClass.ETH],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: "$order.take.value" },
                          { $pow: [10, TOKEN_DECIMALS[TOKENS.ETH]] },
                        ],
                      },
                      ethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$order.take.assetType.contract", daiPrice],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: "$order.take.value" },
                          { $pow: [10, TOKEN_DECIMALS[TOKENS.DAI]] },
                        ],
                      },
                      daiPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$order.take.assetType.contract", wethPrice],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: "$order.take.value" },
                          { $pow: [10, TOKEN_DECIMALS[TOKENS.WETH]] },
                        ],
                      },
                      wethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$order.take.assetType.contract", usdcPrice],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: "$order.take.value" },
                          { $pow: [10, TOKEN_DECIMALS[TOKENS.USDC]] },
                        ],
                      },
                      usdcPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ["$order.take.assetType.contract", xyzPrice],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: "$order.take.value" },
                          { $pow: [10, TOKEN_DECIMALS[TOKENS.XYZ]] },
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
