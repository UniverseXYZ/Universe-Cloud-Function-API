import { ethers } from 'ethers';
import {
  IGeneralParameters,
  INFTParameters,
  IQueryParameters,
  IStrategy,
} from '../../interfaces';
import { TokenModel } from '../../models';
import { buildNftQueryFilters } from '../../services/nfts/builders';
import { getOrdersLookup } from '../../services/orders/lookups/order.lookup';
import { getOwnersByTokens } from '../../services/owners/owners.service';

export class NftStrategy implements IStrategy {
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
        getOrdersLookup(),
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

    // additionally looking up for bundle orders with found NFTs
    //TODO: Uncomment bundle functionality
    // console.time('bundle-order-query-time');
    // const bundleOrders = await getBundleOrdersByTokens(data);
    // console.timeEnd('bundle-order-query-time');

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

      // const orders = bundleOrders.filter((order) => {
      //   const contractIndex = order.make.assetType.contracts.indexOf(
      //     nft.contractAddress.toLowerCase(),
      //   );
      //   if (
      //     -1 !== contractIndex &&
      //     order.make.assetType.tokenIds[contractIndex].includes(nft.tokenId)
      //   ) {
      //     return true;
      //   }
      //   return false;
      // });
      // nft.orders.push(...orders);

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