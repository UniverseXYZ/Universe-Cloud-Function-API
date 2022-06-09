import { ethers } from "ethers";
import { NFTCollectionAttributesModel } from "../../models";

/**
 * Fetched token ids matching the collection and trait query
 * @param contractAddress
 * @param traits
 * @returns tokenIds
 */
export const getTokenIdsByCollectionAttributes = async (
  contractAddress: string,
  traits: any
) => {
  const allTraitsArray = [];

  // construct fields for the database query
  for (const attributeKVP of traits.split(",")) {
    const [attribute, trait] = attributeKVP.split(":");
    const field = `$attributes.${attribute.trim()}.${trait.trim()}`;
    allTraitsArray.push(field);
  }

  const filter = {
    contractAddress: ethers.utils.getAddress(contractAddress),
  };

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

  if (!tokenIds || !tokenIds.length) {
    return [];
  }

  return tokenIds[0].tokens || [];
};
