import { ethers } from "ethers";
import { AssetClass, OrderSide, OrderStatus } from "../models/order";
import { IDataSources } from "../types";
import { Utils } from "../utils/index";

export const fetchUserNfts2 = async (
  ownerAddress: string,
  tokenAddress: string,
  tokenType: string,
  searchQuery: string,
  page: number,
  limit: number,
  dataSources: IDataSources,
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
  filters.push({
    "owner.address": ownerAddress,
  });
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
      orders: { elemMatch: { side } },
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
      console.log("FILTERING BY ZERO ADDRESS");
      filters.push({
        "orders.take.assetType.assetClass": AssetClass.ETH,
      });
    } else {
      // REGEX SEARCH IS NOT PERFORMANT
      // DOCUMENTDB DOESNT SUPPORT COLLATION INDICES
      // query.token address MUST BE UPPERCASE CONTRACT ADDRESS
      console.log("FILTERING BY non zero address");
      filters.push({
        "take.assetType.contract": token,
      });
    }
  }

  if (assetClass) {
    const assetClasses = assetClass.replace(/\s/g, "").split(",");

    filters.push({ "orders.make.assetType.assetClass": { $in: assetClasses } });
  }

  if (tokenIds) {
    const tokenIdsSplit = tokenIds.replace(/\s/g, "").split(",");

    // If query gets slow we can try to conditionally add the queries depending on whether
    // we have side filter or not
    filters.push({
      "orders.make.assetType.tokenId": { $in: tokenIdsSplit },
    });
  }

  if (!!hasOffers) {
    // Get all buy orders
    const buyOffers = await dataSources.tokenAPI.store.find({
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
          make: {
            assetType: {
              tokenId: tokenId,
            },
            contract: contract.toLowerCase(),
          },
        });
      }
    });

    // If query is empty --> there are no orders with offers
    if (!innerQuery.length) {
      return {
        page: page,
        size: limit,
        total: 0,
        nfts: [],
      };
    }

    filters["$and"] = innerQuery;
  }

  // console.log(nftFilters);
  // console.log(limit);
  // console.log(page);
  console.log(filters);
  const ownersAggregation = [
    {
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
    },
    {
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
                  { status: OrderStatus.CREATED },
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
        ],
        as: "orders",
      },
    },
    { $unwind: "$owner" },
    { $match: { $and: filters } },
  ];

  // const ordersAggregation = [];

  const skippedItems = (page - 1) * limit;

  const [data, count] = await Promise.all([
    dataSources.tokenAPI.store.aggregate([
      ...ownersAggregation,
      // ...ordersAggregation,
      { $skip: skippedItems },
      { $limit: limit },
      { $sort: { updatedAt: -1 } },
    ]),
    dataSources.tokenAPI.store.aggregate([
      ...ownersAggregation,
      { $count: "tokenId" },
    ]),
  ]);

  // console.log(data.owner((a: any) => a.owner));
  // console.log(data);
  // console.log(count);
  // console.log(`skip: ${skippedItems}`);

  return {
    page: page,
    size: limit,
    total: !count.length ? 0 : count[0].tokenId,
    nfts: data,
  };
};
