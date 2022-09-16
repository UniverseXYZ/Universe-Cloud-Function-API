import { ethers } from 'ethers';
import {
  IGeneralParameters,
  INFTParameters,
  IOrderParameters,
  IOwnerParameters,
  IQueryParameters,
  IStrategy,
} from '../../interfaces';
import { TokenModel } from '../../models';
import { buildNftQueryFilters } from '../../services/nfts/builders';
import { buildOwnerQuery } from '../../services/owners/owners.service';
import { getReservoirTokenIds } from '../../services/reservoir/reservoir.service';

export class ReservoirNftOwnerOrderStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryMixedParams(
      parameters.nftParams,
      parameters.orderParams,
      parameters.ownerParams,
      parameters.generalParams,
    );
  }

  count(parameters: IQueryParameters) {
    return this.countMixedParams(
      parameters.nftParams,
      parameters.orderParams,
      parameters.ownerParams,
      parameters.generalParams,
    );
  }

  private async countMixedParams(
    nftParams: INFTParameters,
    orderParams: IOrderParameters,
    ownerParams: IOwnerParameters,
    generalParams: IGeneralParameters,
  ) {
    console.log('Counting mixed params');

    const { nftFilters } = await buildNftQueryFilters(nftParams);

    if (!nftFilters.length) {
      return {
        count: 0,
      };
    }

    const ownerQuery = buildOwnerQuery(
      ownerParams,
      nftParams.tokenType.toString(),
    );

    console.time('query-time');
    const [nfts, owners, orderTokenIds] = await Promise.all([
      TokenModel.aggregate([...nftFilters], {
        collation: {
          locale: 'en',
          strength: 2,
          numericOrdering: true,
        },
      }),
      ownerQuery,
      // We always have contractAddress because of the NFT Embed Collection page
      // This strategy shouldn't execute if we're on Single Embed Page
      await getReservoirTokenIds(nftParams.contractAddress, orderParams),
    ]);
    console.timeEnd('query-time');

    if (!nfts.length || !owners.length || !orderTokenIds.length) {
      return {
        count: 0,
      };
    }

    const filtered = [];
    for (let i = 0; i < orderTokenIds.length; i++) {
      const tokenId = orderTokenIds[i];

      const nft = nfts.find((nft) => tokenId === nft.tokenId);

      if (!nft) {
        continue;
      }

      //TODO: Try to add contract address to owners query filter to speed it up?
      const ownersInfo = owners.filter(
        (owner) =>
          owner.tokenId === nft.tokenId &&
          owner.contractAddress.toLowerCase() ===
            nft.contractAddress.toLowerCase(),
      );

      if (!ownersInfo.length) {
        continue;
      }

      filtered.push(nft);
    }

    return {
      count: filtered.length,
    };
  }

  private async queryMixedParams(
    nftParams: INFTParameters,
    orderParams: IOrderParameters,
    ownerParams: IOwnerParameters,
    generalParams: IGeneralParameters,
  ) {
    console.log('Querying mixed params');

    const { page, limit } = generalParams;

    const { nftFilters } = await buildNftQueryFilters(nftParams);

    if (!nftFilters.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    const ownerQuery = buildOwnerQuery(
      ownerParams,
      nftParams.tokenType.toString(),
    );

    console.time('query-time');
    const [nfts, owners, orderTokenIds] = await Promise.all([
      TokenModel.aggregate([...nftFilters], {
        collation: {
          locale: 'en',
          strength: 2,
          numericOrdering: true,
        },
      }),
      ownerQuery,
      // We always have contractAddress because of the NFT Embed Collection page
      // This strategy shouldn't execute if we're on Single Embed Page
      await getReservoirTokenIds(nftParams.contractAddress, orderParams),
    ]);
    console.timeEnd('query-time');

    if (!nfts.length || !owners.length || !orderTokenIds.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    // Apply Pagination
    const filtered = [];
    for (let i = 0; i < orderTokenIds.length; i++) {
      const tokenId = orderTokenIds[i];

      const nft = nfts.find((nft) => tokenId === nft.tokenId);

      if (!nft) {
        continue;
      }

      const ownersInfo = owners.filter(
        (owner) =>
          owner.tokenId === nft.tokenId &&
          owner.contractAddress.toLowerCase() ===
            nft.contractAddress.toLowerCase(),
      );

      if (!ownersInfo.length) {
        continue;
      }

      const ownerAddresses = ownersInfo.map((owner) => ({
        owner: owner.address,
        value: owner.value
          ? owner.value.toString()
          : ethers.BigNumber.from(owner.value).toString(),
      }));

      nft.owners = ownerAddresses;

      filtered.push(nft);
      if (filtered.length === generalParams.skippedItems + limit) {
        break;
      }
    }

    if (!filtered.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    const paginated = filtered.slice(generalParams.skippedItems);

    return {
      page: page,
      size: limit,
      nfts: paginated,
    };
  }
}
