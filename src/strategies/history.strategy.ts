import { ethers } from 'ethers';
import {
  IGeneralParameters,
  IHistoryParameters,
  INFTParameters,
  IOrderParameters,
  IOwnerParameters,
  IQueryParameters,
  IStrategy,
} from '../interfaces';
import {
  TokenModel,
  OrderModel,
  OrderStatus,
  OrderSide,
  TransferHistoryModel,
  AssetClass,
} from '../models';
import { buildHistoryQueryFilters } from '../services/history/builders/history.builder';
import { buildNftQueryFilters } from '../services/nfts/builders';
import { buildOrderQueryFilters } from '../services/orders/builders/order.builder';
import {
  buildOwnerQuery,
  getOwnersByTokens,
} from '../services/owners/owners.service';
import { getOrdersByTokens } from '../services/orders/orders.service';

/**
 * History strategy is an experimental strategy designed to support sorting
 * by transfer history (mints and transfers).
 * Unlike other strategies, history strategy gets triggered by a single sorting
 * query parameter - historySort, AND IT SUPPORTS ALL FILTERS from other strategies!
 */
export class HistoryStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryHistoryParams(
      parameters.nftParams,
      parameters.orderParams,
      parameters.ownerParams,
      parameters.historyParams,
      parameters.generalParams,
    );
  }

  count(parameters: IQueryParameters) {
    return this.countHistoryParams(
      parameters.nftParams,
      parameters.orderParams,
      parameters.ownerParams,
      parameters.historyParams,
      parameters.generalParams,
    );
  }

  private async countHistoryParams(
    nftParams: INFTParameters,
    orderParams: IOrderParameters,
    ownerParams: IOwnerParameters,
    historyParams: IHistoryParameters,
    generalParams: IGeneralParameters,
  ) {
    console.log('Counting history params');

    const { historyAggregation } = buildHistoryQueryFilters(
      nftParams.contractAddress,
      historyParams,
    );
    const { nftFilters } = await buildNftQueryFilters(nftParams);
    const { finalFilters } = await buildOrderQueryFilters(
      orderParams,
      generalParams,
    );

    // in fact nftParams is never empty because nftParams.contractAddress is required for this strategy!
    const isNftParamsEmpty = this.isEmptyParams(nftParams);
    const isOwnerParamsEmpty = this.isEmptyParams(ownerParams);
    const isOrderParamsEmpty = this.isEmptyParams(orderParams);

    console.time('query-time');
    const [historySortedNfts, nfts, owners, orders] = await Promise.all([
      TransferHistoryModel.aggregate([...historyAggregation]),
      isNftParamsEmpty
        ? Promise.resolve([])
        : TokenModel.aggregate(
            [...nftFilters, { $sort: { searchScore: -1 } }],
            {
              collation: {
                locale: 'en',
                strength: 2,
                numericOrdering: true,
              },
            },
          ),
      isOwnerParamsEmpty
        ? Promise.resolve([])
        : buildOwnerQuery(ownerParams, nftParams.tokenType.toString()),
      isOrderParamsEmpty
        ? Promise.resolve([])
        : OrderModel.aggregate([{ $match: finalFilters }], {
            collation: {
              locale: 'en',
              strength: 2,
              numericOrdering: true,
            },
          }),
    ]);
    console.timeEnd('query-time');

    if (
      !historySortedNfts.length ||
      (!isNftParamsEmpty && !nfts.length) ||
      (!isOwnerParamsEmpty && !owners.length) ||
      (!isOrderParamsEmpty && !orders.length)
    ) {
      return {
        count: 0,
      };
    }

    const filtered = [];
    for (let i = 0; i < historySortedNfts.length; i++) {
      const historyNft = historySortedNfts[i];

      // keeping in mind that isNftParamsEmpty is never true.
      const nft = nfts.find((nft) => {
        if (
          nft.tokenId === historyNft['tokenId'] &&
          nft.contractAddress === historyNft['contractAddress']
        ) {
          return true;
        }
        return false;
      });

      if (!nft) {
        continue;
      }

      if (!isOwnerParamsEmpty) {
        const ownersInfo = owners.filter(
          (owner) =>
            owner.tokenId === nft.tokenId &&
            owner.contractAddress.toLowerCase() ===
              nft.contractAddress.toLowerCase(),
        );

        if (!ownersInfo.length) {
          continue;
        }
      }

      if (!isOrderParamsEmpty) {
        const nftOrders = orders.filter((order) => {
          if (AssetClass.ERC721_BUNDLE == order.make.assetType.assetClass) {
            const contractIndex = order.make.assetType.contracts.indexOf(
              nft.contractAddress.toLowerCase(),
            );
            if (
              -1 !== contractIndex &&
              order.make.assetType.tokenIds[contractIndex] &&
              order.make.assetType.tokenIds[contractIndex].includes(nft.tokenId)
            ) {
              return true;
            }
            return false;
          } else {
            return (
              order.make.assetType.tokenId === nft.tokenId &&
              order.make.assetType.contract?.toLowerCase() ===
                nft.contractAddress.toLowerCase()
            );
          }
        });

        if (!nftOrders.length) {
          continue;
        }
      }

      filtered.push(nft);
    }

    return {
      count: filtered.length,
    };
  }

  private async queryHistoryParams(
    nftParams: INFTParameters,
    orderParams: IOrderParameters,
    ownerParams: IOwnerParameters,
    historyParams: IHistoryParameters,
    generalParams: IGeneralParameters,
  ) {
    console.log('Querying history params');
    const { page, limit } = generalParams;

    const { historyAggregation, sort } = buildHistoryQueryFilters(
      nftParams.contractAddress,
      historyParams,
    );
    const { nftFilters } = await buildNftQueryFilters(nftParams);
    const { finalFilters } = await buildOrderQueryFilters(
      orderParams,
      generalParams,
    );

    // in fact nftParams is never empty because nftParams.contractAddress is required for this strategy!
    const isNftParamsEmpty = this.isEmptyParams(nftParams);
    const isOwnerParamsEmpty = this.isEmptyParams(ownerParams);
    const isOrderParamsEmpty = this.isEmptyParams(orderParams);

    console.time('query-time');
    const [historySortedNfts, nfts, owners, orders] = await Promise.all([
      TransferHistoryModel.aggregate([...historyAggregation, { $sort: sort }]),
      isNftParamsEmpty
        ? Promise.resolve([])
        : TokenModel.aggregate(
            [...nftFilters, { $sort: { searchScore: -1 } }],
            {
              collation: {
                locale: 'en',
                strength: 2,
                numericOrdering: true,
              },
            },
          ),
      isOwnerParamsEmpty
        ? Promise.resolve([])
        : buildOwnerQuery(ownerParams, nftParams.tokenType.toString()),
      isOrderParamsEmpty
        ? Promise.resolve([])
        : OrderModel.aggregate([{ $match: finalFilters }], {
            collation: {
              locale: 'en',
              strength: 2,
              numericOrdering: true,
            },
          }),
    ]);
    console.timeEnd('query-time');

    if (
      !historySortedNfts.length ||
      (!isNftParamsEmpty && !nfts.length) ||
      (!isOwnerParamsEmpty && !owners.length) ||
      (!isOrderParamsEmpty && !orders.length)
    ) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    const filtered = [];
    for (let i = 0; i < historySortedNfts.length; i++) {
      const historyNft = historySortedNfts[i];

      // keeping in mind that isNftParamsEmpty is never true.
      const nft = nfts.find((nft) => {
        if (
          nft.tokenId === historyNft['tokenId'] &&
          nft.contractAddress === historyNft['contractAddress']
        ) {
          return true;
        }
        return false;
      });

      if (!nft) {
        continue;
      }

      if (!isOwnerParamsEmpty) {
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
      }

      if (!isOrderParamsEmpty) {
        const nftOrders = orders.filter((order) => {
          if (AssetClass.ERC721_BUNDLE == order.make.assetType.assetClass) {
            const contractIndex = order.make.assetType.contracts.indexOf(
              nft.contractAddress.toLowerCase(),
            );
            if (
              -1 !== contractIndex &&
              order.make.assetType.tokenIds[contractIndex] &&
              order.make.assetType.tokenIds[contractIndex].includes(nft.tokenId)
            ) {
              return true;
            }
            return false;
          } else {
            return (
              order.make.assetType.tokenId === nft.tokenId &&
              order.make.assetType.contract?.toLowerCase() ===
                nft.contractAddress.toLowerCase()
            );
          }
        });

        if (!nftOrders.length) {
          continue;
        }

        nft.orders = nftOrders;
      }

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

    // and finally add "lookups" here. doing it for the entire not paginated array of historyNfts
    // works too slow
    if (isOwnerParamsEmpty) {
      console.time('owners-query-time');
      const lookupOwners = await getOwnersByTokens(
        paginated,
        nftParams.tokenType.toString(),
      );
      console.timeEnd('owners-query-time');

      paginated.forEach((nft) => {
        const ownersInfo = lookupOwners.filter(
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

        nft.owners = ownerAddresses;
      });
    }

    if (isOrderParamsEmpty) {
      console.time('orders-query-time');
      const lookupOrders = await getOrdersByTokens(paginated);
      console.timeEnd('orders-query-time');

      paginated.forEach((nft) => {
        const orders = lookupOrders.filter((order) => {
          if (AssetClass.ERC721_BUNDLE == order.make.assetType.assetClass) {
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
          } else {
            if (
              order.make.assetType.contract ==
                nft.contractAddress.toLowerCase() &&
              order.make.assetType.tokenId == nft.tokenId
            ) {
              return true;
            }
            return false;
          }
        });

        nft.orders = orders;
      });
    }

    return {
      page: page,
      size: limit,
      nfts: paginated,
    };
  }

  /**
   * Returns true if the passed parameter object has any values
   * (i.e. the caller is filtering by any property in the passed parameter object).
   * Returns false owtherwise.
   * @param params
   * @returns {Boolean}
   */
  private isEmptyParams(
    params: INFTParameters | IOrderParameters | IOwnerParameters,
  ) {
    let value = true;

    const keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
      if ('undefined' != typeof params[keys[i]]) {
        if ('number' == typeof params[keys[i]] && !isNaN(params[keys[i]])) {
          value = false;
          break;
        } else if (
          'boolean' == typeof params[keys[i]] &&
          Boolean(params[keys[i]])
        ) {
          value = false;
          break;
        } else if ('string' == typeof params[keys[i]] && params[keys[i]]) {
          value = false;
          break;
        }
      }
    }

    return value;
  }
}
