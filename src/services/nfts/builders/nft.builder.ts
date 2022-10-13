import { INFTParameters } from '../../../interfaces';
import { getTokenIdsByCollectionAttributes } from '../../attributes/attributes.service';

enum NftSortOrderOptionsEnum {
  TokenIdAscending = 8,
  TokenIdDescending = 9,
}

const splitTokenIds = (tokenIds: string, reservoirIds: string) => {
  const t = (tokenIds || '').replace(/\s/g, '').split(',');
  const r = (reservoirIds || '').replace(/\s/g, '').split(',');
  const merged = [...r, ...t];
  return merged.filter(function (item, pos) {
    return merged.indexOf(item) == pos;
  });
};

export const buildNftQueryFilters = async (
  nftParams: INFTParameters,
  owners: any[] = [],
) => {
  const {
    contractAddress,
    tokenIds,
    reservoirIds,
    searchQuery,
    tokenType,
    traits,
    nftSort,
  } = nftParams;
  const filters = [] as any;
  const nftFilters = [] as any;

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
    filters.push({
      $or: [
        { tokenId: searchQuery },
        { 'metadata.name': { $regex: `.*${searchQuery}.*`, $options: 'i' } },
      ],
    });
  }

  const tokenIdsSplit = splitTokenIds(tokenIds, reservoirIds);

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

    if (!!tokenIds || !!reservoirIds) {
      const intersectedIds = tokenIdsSplit.filter((value) =>
        ids.includes(value),
      );
      filters.push({
        tokenId: { $in: intersectedIds },
      });

      if (!!sort.updatedAt) {
        // create a new field that will be used in the sorting by __id_posn
        nftFilters.push({
          $addFields: {
            __id_posn: { $indexOfArray: [intersectedIds, '$tokenId'] },
          },
        });

        // we need to delete the other sorting options and add a new one that sorts by array position
        delete sort.updatedAt;
        sort.__id_posn = 1;
      }
    } else {
      filters.push({
        tokenId: { $in: ids },
      });

      if (!!sort.updatedAt) {
        // create a new field that will be used in the sorting by __id_posn
        nftFilters.push({
          $addFields: { __id_posn: { $indexOfArray: [ids, '$tokenId'] } },
        });

        // we need to delete the other sorting options and add a new one that sorts by array position
        delete sort.updatedAt;
        sort.__id_posn = 1;
      }
    }
  } else if (!!tokenIds || !!reservoirIds) {
    filters.push({
      tokenId: { $in: tokenIdsSplit },
    });

    if (!!sort.updatedAt) {
      // create a new field that will be used in the sorting by __id_posn
      nftFilters.push({
        $addFields: {
          __id_posn: { $indexOfArray: [tokenIdsSplit, '$tokenId'] },
        },
      });

      // we need to delete the other sorting options and add a new one that sorts by array position
      delete sort.updatedAt;
      sort.__id_posn = 1;
    }
  }

  if (tokenType) {
    filters.push({ tokenType });
  }

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

  console.log('NFT FILTERS:');
  console.log(nftFilters);

  return {
    nftFilters,
    sort,
  };
};
