import { utils } from 'ethers';
import { ApiError, ERROR_MESSAGES } from '../../errors';
import { NFTCollectionAttributesModel } from '../../models';
import { Utils } from '../../utils';

/**
 * Fetched token ids matching the collection and trait query
 * @param contractAddress
 * @param traits
 * @returns tokenIds
 */
export const getTokenIdsByCollectionAttributes = async (
  contractAddress: string,
  traits: any,
) => {
  console.time('trait-filter-time');
  const allTraits = {};
  const allTraitsArray = [];

  console.time('filter-query-time');
  const collAttributes = await NFTCollectionAttributesModel.findOne({
    contractAddress: utils.getAddress(contractAddress),
  }).lean();

  console.timeEnd('filter-query-time');

  const splitTraits = traits.split(',');
  for (const attributeKVP of splitTraits) {
    let [attribute, trait] = attributeKVP.split(':');

    attribute = attribute.trim();
    trait = trait.trim();

    try {
      const tokenIds = collAttributes.attributes[attribute][trait];

      if (!allTraits[attribute]) {
        allTraits[attribute] = [];
      }

      allTraits[attribute].push(...tokenIds);
    } catch (err) {
      // Attribute or Trait doesn't exist --> return [] (empty result set)
      return [];
    }
  }

  for (const attribute of Object.keys(allTraits)) {
    allTraitsArray.push(allTraits[attribute]);
  }

  let finalTokenIds = allTraitsArray[0];
  for (let i = 1; i < allTraitsArray.length; i++) {
    const attribute = allTraitsArray[i];
    finalTokenIds = Utils.findArrayIntersection(finalTokenIds, attribute);

    if (!finalTokenIds.length) {
      return [];
    }
  }

  console.timeEnd('trait-filter-time');
  return finalTokenIds;
};
