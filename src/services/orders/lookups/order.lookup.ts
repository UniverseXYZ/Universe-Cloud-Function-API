import { OrderSide, OrderStatus } from "../../../models";

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
