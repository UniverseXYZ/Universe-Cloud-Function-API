import { INFTParameters } from '../../../interfaces';
import { getTokenIdsByCollectionAttributes } from '../../attributes/attributes.service';
import config from '../../../config';

enum NftSortOrderOptionsEnum {
  TokenIdAscending = 8,
  TokenIdDescending = 9,
}

export const buildNftQueryFilters = async (
  nftParams: INFTParameters,
  owners: any[] = [],
) => {
  const { contractAddress, tokenIds, searchQuery, tokenType, traits, nftSort } =
    nftParams;
  const filters = [] as any;

  if (contractAddress) {
    if (!owners.length) {
      filters.push({ contractAddress });
    } else {
      const filteredOwners: any[] = owners.filter(
        (o: any) =>
          o.contractAddress.toLowerCase() === contractAddress.toLowerCase(),
      );

      if (!filteredOwners.length) {
        return {
          nftFilters: [],
        };
      }
      owners = filteredOwners;
    }
  }

  if (searchQuery) {
    filters.push({ $or: [
      { tokenId: searchQuery },
      {'metadata.name': { $regex: `.*${searchQuery}.*`, $options: 'i' } }
    ]});
  }

  // The user either is going to search by traits or by tokenIds (if its searching for a specific token info)
  if (contractAddress && traits && Object.keys(traits).length > 0) {
    const ids = await getTokenIdsByCollectionAttributes(
      contractAddress,
      traits,
    );

    if (!ids || !ids.length) {
      return {
        nftFilters: [],
      };
    }

    filters.push({
      tokenId: { $in: ids },
    });
  } else if (tokenIds) {
    const tokenIdsSplit = tokenIds.replace(/\s/g, '').split(',');

    filters.push({
      tokenId: { $in: tokenIdsSplit },
    });
  }

  if (tokenType) {
    filters.push({ tokenType });
  }

  const nftFilters = [] as any;
  // Assemble final order of filters


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

  const sort = {} as any;
  switch (nftSort) {
    case NftSortOrderOptionsEnum.TokenIdAscending:
      sort.tokenId = 1;
      break;
    case NftSortOrderOptionsEnum.TokenIdDescending:
      sort.tokenId = -1;
      break;
    default:
      sort.updatedAt = -1;
      break;
  }


  if (tokenIds) { 
    const tokenIdsSplit = tokenIds.replace(/\s/g, '').split(',');

    // create a new field that will be used in the sorting by __id_posn
    nftFilters.push({
      "$addFields" : { "__id_posn" : { "$indexOfArray" : [ tokenIdsSplit, "$tokenId" ] } } 
    })

    // we need to delete the other sorting options and add a new one that sorts by array position
    delete sort.tokenId
    delete sort.updatedAt
    sort.__id_posn = 1
  }

  console.log('NFT FILTERS:');
  console.log(nftFilters);

  return {
    nftFilters,
    sort,
  };
};
