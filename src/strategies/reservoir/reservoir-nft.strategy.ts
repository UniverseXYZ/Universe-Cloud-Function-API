import { ethers } from 'ethers';
import {
  IGeneralParameters,
  INFTParameters,
  IQueryParameters,
  IStrategy,
} from '../../interfaces';
import { TokenModel } from '../../models';
import { buildNftQueryFilters } from '../../services/nfts/builders';
import { getOwnersByTokens } from '../../services/owners/owners.service';

export class ReservoirNftStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryOnlyNftParams(
      parameters.nftParams,
      parameters.generalParams,
    );
  }

  count(parameters: IQueryParameters) {
    return this.countOnlyNftParams(parameters.nftParams);
  }

  private async countOnlyNftParams(nftParams: INFTParameters) {
    console.log('Counting only nft params');

    const { nftFilters } = await buildNftQueryFilters(nftParams);

    if (!nftFilters.length) {
      return 0;
    }

    console.log('Querying...');
    console.time('query-time');

    const data = await TokenModel.aggregate(
      [...nftFilters, { $count: 'count' }],
      {
        collation: {
          locale: 'en',
          strength: 2,
          numericOrdering: true,
        },
      },
    );

    console.timeEnd('query-time');

    return {
      count: data.length ? data[0].count : 0,
    };
  }

  private async queryOnlyNftParams(
    nftParams: INFTParameters,
    generalParams: IGeneralParameters,
  ) {
    console.log('Querying only nft params');
    const { page, limit } = generalParams;

    const { nftFilters, sort } = await buildNftQueryFilters(nftParams);

    if (!nftFilters.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    console.log('Querying...');
    console.time('query-time');

    const data = await TokenModel.aggregate(
      [
        ...nftFilters,
        { $sort: sort },
        { $skip: generalParams.skippedItems },
        { $limit: Number(limit) },
      ],
      {
        collation: {
          locale: 'en',
          strength: 2,
          numericOrdering: true,
        },
      },
    );

    console.timeEnd('query-time');

    if (!data.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    const owners = await getOwnersByTokens(
      data,
      nftParams.tokenType.toString(),
    );

    const finalData = data.map((nft) => {
      const ownersInfo = owners.filter(
        (owner) =>
          owner.contractAddress === nft.contractAddress &&
          owner.tokenId === nft.tokenId,
      );

      const ownerAddresses = ownersInfo.map((owner) => ({
        owner: owner.address,
        value: owner.value
          ? owner.value.toString()
          : ethers.BigNumber.from(owner.value).toString(),
      }));

      return {
        ...nft,
        owners: ownerAddresses,
      };
    });

    return {
      page: page,
      size: limit,
      nfts: finalData,
    };
  }
}
