import { ethers } from 'ethers';
import {
  IGeneralParameters,
  IOwnerParameters,
  IQueryParameters,
  IStrategy,
} from '../../interfaces';
import { TokenModel } from '../../models';
import { getOrdersLookup } from '../../services/orders/lookups/order.lookup';
import { buildOwnerQuery } from '../../services/owners/owners.service';
import { getBundleOrdersByTokens } from '../../services/orders/orders.service';

export class OwnerStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryOnlyOwnerParams(
      parameters.ownerParams,
      parameters.generalParams,
      parameters.nftParams.tokenType.toString(),
    );
  }

  count(parameters: IQueryParameters) {
    return this.countOnlyOwnerParams(
      parameters.ownerParams,
      parameters.nftParams.tokenType.toString(),
    );
  }

  private async countOnlyOwnerParams(
    ownerParams: IOwnerParameters,
    tokenType: string,
  ) {
    console.log('Counting only owner params');

    const ownerQuery = buildOwnerQuery(ownerParams, tokenType);

    console.time('query-time');
    const owners = await ownerQuery;
    console.timeEnd('query-time');

    let data = [];

    if (owners.length) {
      console.time('query-time2');
      data = await TokenModel.aggregate(
        [
          {
            $match: {
              $or: owners.map((owner) => ({
                tokenId: owner.tokenId,
                contractAddress: owner.contractAddress,
              })),
            },
          },
          { $count: 'count' },
        ],
        { collation: { locale: 'en', strength: 2 } },
      );
      console.timeEnd('query-time2');
    }

    return {
      count: data.length ? data[0].count : 0,
    };
  }

  private async queryOnlyOwnerParams(
    ownerParams: IOwnerParameters,
    generalParams: IGeneralParameters,
    tokenType: string,
  ) {
    console.log('Querying only owner params');
    const { page, limit } = generalParams;

    const ownerQuery = buildOwnerQuery(
      ownerParams,
      tokenType,
      generalParams.skippedItems,
      generalParams.limit,
    );

    console.time('query-time');
    const owners = await ownerQuery;

    console.timeEnd('query-time');

    if (!owners.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    console.time('query-time2');

    const data = await TokenModel.aggregate(
      [
        {
          $match: {
            $or: owners.map((owner) => ({
              tokenId: owner.tokenId,
              contractAddress: owner.contractAddress,
            })),
          },
        },
        getOrdersLookup(),
      ],
      { collation: { locale: 'en', strength: 2 } },
    );

    console.timeEnd('query-time2');

    // additionally looking up for bundle orders with found NFTs
    console.time('bundle-order-query-time');
    const bundleOrders = await getBundleOrdersByTokens(data);
    console.timeEnd('bundle-order-query-time');

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

      const orders = bundleOrders.filter((order) => {
        const contractIndex = order.make.assetType.contracts.indexOf(
          nft.contractAddress.toLowerCase(),
        );
        if (
          -1 !== contractIndex &&
          order.make.assetType.tokenIds[contractIndex].includes(nft.tokenId)
        ) {
          return true;
        }
        return false;
      });
      nft.orders.push(...orders);

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
