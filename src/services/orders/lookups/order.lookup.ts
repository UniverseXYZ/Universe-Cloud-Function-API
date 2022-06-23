import { OrderSide, OrderStatus } from "../../../models";
import { Utils } from '../../../utils';

/**
 * Returns an object for $lookup aggregation step.
 * It is meant to join documents representing the active sell order of the nft from marketplace-orders.
 * NOTE: This lookup only joins orders that are not bundles (not AssetType.ERC721_BUNDLE).
 * @returns {Object}
 */
export const getOrdersLookup = () => {
  const utcTimestamp = Utils.getUtcTimestamp();
  return {
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
                {
                  $eq: ["$make.assetType.tokenId", "$$tokenId"],
                },
                {
                  $eq: ["$make.assetType.contract", "$$contractAddress"],
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
                { 
                  $or: [
                    { $lt: ['$start', utcTimestamp] },
                    { $eq: ['$start', 0] },
                  ],
                },
                { 
                  $or: [
                    { $gt: ['$end', utcTimestamp] },
                    { $eq: ['$end', 0] },
                  ],
                },
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
  }
};
