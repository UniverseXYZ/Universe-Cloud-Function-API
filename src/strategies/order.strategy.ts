import { ethers, utils } from 'ethers';
import {
  IGeneralParameters,
  IOrderParameters,
  IQueryParameters,
  IStrategy,
} from '../interfaces';
import { AssetClass, OrderModel, TokenModel } from '../models';
import { buildOrderQueryFilters } from '../services/orders/builders/order.builder';
import { getOwnersByTokens } from '../services/owners/owners.service';
import { getNFTLookup } from '../services/nfts/lookups/nft.lookup';
import { getOrdersLookup } from '../services/orders/lookups/order.lookup';

export class OrderStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryOnlyOrderParams(
      parameters.orderParams,
      parameters.generalParams,
    );
  }

  count(parameters: IQueryParameters) {
    return this.countOnlyOrderParams(
      parameters.orderParams,
      parameters.generalParams,
    );
  }

  private async countOnlyOrderParams(
    orderParams: IOrderParameters,
    generalParams: IGeneralParameters,
  ) {
    console.log('Counting only order params');

    const { finalFilters, sort, sortingAggregation } =
      await buildOrderQueryFilters(orderParams, generalParams);

    console.log('Querying...');
    console.time('query-time');

    const data = await OrderModel.aggregate(
      [
        { $match: finalFilters },
        {
          $group: {
            _id: {
              contract: '$make.assetType.contract',
              tokenId: '$make.assetType.tokenId',
              contracts: '$make.assetType.contracts',
              tokenIds: '$make.assetType.tokenIds',
            },
          },
        },
        { $count: 'count' },
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

    return {
      count: data.length ? data[0].count : 0,
    };
  }

  /**
   * Returns an array (nested in the "nfts" property) with 3 types of elements:
   * 1. erc721 token with nested "owners" and "orders" (should have 1 order for erc721);
   * 2. erc1155 token with nested "owners" and "orders" (erc1155 can have multiple orders);
   * 3. bundle order with nested "nfts".
   * @param orderParams
   * @param generalParams
   * @returns {Object}
   */
  private async queryOnlyOrderParams(
    orderParams: IOrderParameters,
    generalParams: IGeneralParameters,
  ) {
    console.log('Querying only order params');

    const { page, limit } = generalParams;

    const { finalFilters, sort, sortingAggregation } =
      await buildOrderQueryFilters(orderParams, generalParams);

    console.log('FILTERS:');
    console.log(finalFilters);

    console.log('Querying...');
    console.time('query-time');

    const data = await OrderModel.aggregate(
      [
        { $match: finalFilters },
        ...sortingAggregation,
        { $sort: sort }, // sort before grouping to properly group erc1155s!
        {
          $group: {
            _id: {
              contract: '$make.assetType.contract',
              tokenId: '$make.assetType.tokenId',
              contracts: '$make.assetType.contracts',
              tokenIds: '$make.assetType.tokenIds',
            },
            contractAddress: { $first: '$make.assetType.contract' },
            contractAddresses: { $first: '$make.assetType.contracts' },
            tokenId: { $first: '$make.assetType.tokenId' },
            tokenIds: { $first: '$make.assetType.tokenIds' },
            // orderSort: { $first: '$orderSort' },
            // usd_value: { $first: '$usd_value' },
            // createdAt: { $first: '$createdAt' },
            doc: { $first: '$$ROOT' },
          },
        },
        // { $replaceRoot: { newRoot: "$doc" } },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                {
                  contractAddress: '$contractAddress',
                  contractAddresses: '$contractAddresses',
                  tokenId: '$tokenId',
                  tokenIds: '$tokenIds',
                },
                '$doc',
              ],
            },
          },
        },
        { $sort: sort }, // this is the actual sorting!
        { $skip: generalParams.skippedItems },
        { $limit: Number(limit) },
        // getNFTLookup(),
        getOrdersLookup(), // joining erc1155 and erc721 orders
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

    const tokens = [];
    data.forEach((order) => {
      if (order.contractAddresses) {
        for (let i = 0; i < order.contractAddresses.length; i++) {
          order.tokenIds[i].forEach((tokenId) => {
            tokens.push({
              tokenId: tokenId,
              contractAddress: utils.getAddress(order.contractAddresses[i]),
            });
          });
        }
      } else {
        tokens.push({
          tokenId: order.tokenId,
          contractAddress: utils.getAddress(order.contractAddress),
        });
      }
    });

    const [owners, nfts] = await Promise.all([
      getOwnersByTokens(tokens),
      TokenModel.find({ $or: tokens }).lean(),
    ]);

    const finalData = data.map((order) => {
      // assuming that an order cannot be created if the token in question is
      // absent in the "nft-token" table. i.e. there's always an NFT for an existing order.

      if (order.contractAddresses) {
        // if it's a bundle, the returning array element will be the bundle with nfts
        const bundleNfts = [];
        for (let i = 0; i < order.contractAddresses.length; i++) {
          order.tokenIds[i].forEach((tokenId) => {
            bundleNfts.push(
              nfts.find(
                (nft) =>
                  nft.contractAddress.toLowerCase() ===
                    order.contractAddresses[i] && nft.tokenId === tokenId,
              ),
            );
          });
        }

        return {
          ...order,
          nfts: bundleNfts,
        };
      } else {
        // if it's not a bundle, the returning array element will be the nft with
        // orders (to support erc1155) and owners.
        const nft = nfts.find(
          (nft) =>
            nft.contractAddress.toLowerCase() === order.contractAddress &&
            nft.tokenId === order.tokenId,
        );

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
          orders: order.orders,
        };
      }
    });

    return {
      page: page,
      size: limit,
      nfts: finalData,
    };
  }
}
