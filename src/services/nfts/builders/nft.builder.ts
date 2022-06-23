import { INFTParameters } from '../../../interfaces';
import { getTokenIdsByCollectionAttributes } from '../../attributes/attributes.service';

export const buildNftQueryFilters = async (
  nftParams: INFTParameters,
  owners: any[] = [],
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
          o.contractAddress.toLowerCase() === contractAddress.toLowerCase(),
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
        index: 'metadata.name',
        // text: {
        //   query: searchQuery,
        //   path: "metadata.name",
        // },
        regex: {
          query: `.*${searchQuery}*.`,
          path: 'metadata.name',
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

  // The user either is going to search by traits or by tokenIds (if its searching for a specific token info)
  if (contractAddress && traits && Object.keys(traits).length > 0) {
    const ids = await getTokenIdsByCollectionAttributes(
      contractAddress,
      traits,
    );

    if (!ids || !ids.length) {
      return [];
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
        searchScore: { $meta: 'searchScore' },
      },
    });
  }

  console.log('NFT FILTERS:');
  console.log(nftFilters);
  return nftFilters;
};
