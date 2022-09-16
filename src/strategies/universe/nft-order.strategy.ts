import {
  IGeneralParameters,
  INFTParameters,
  IOrderParameters,
  IQueryParameters,
  IStrategy,
} from '../../interfaces';
import { TokenModel, OrderModel, AssetClass } from '../../models';

import { buildNftQueryFilters } from '../../services/nfts/builders';

import { buildOrderQueryFilters } from '../../services/orders/builders/order.builder';

export class NftOrderStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryNftAndOrderParams(
      parameters.nftParams,
      parameters.orderParams,
      parameters.generalParams,
    );
  }

  count(parameters: IQueryParameters) {
    return this.countNftAndOrderParams(
      parameters.nftParams,
      parameters.orderParams,
      parameters.generalParams,
    );
  }

  private async countNftAndOrderParams(
    nftParams: INFTParameters,
    orderParams: IOrderParameters,
    generalParams: IGeneralParameters,
  ) {
    console.log('Counting nft and order params');

    const { page, limit } = generalParams;

    const { nftFilters } = await buildNftQueryFilters(nftParams);
    if (!nftFilters.length) {
      return {
        count: 0,
      };
    }
    //TODO: Try to transfer filters like contractAddress, ownerAddress... to narrow down order search
    const { finalFilters, sortingAggregation, sort } =
      await buildOrderQueryFilters(orderParams, generalParams);

    const [nfts, orders] = await Promise.all([
      TokenModel.aggregate([...nftFilters], {
        collation: {
          locale: 'en',
          strength: 2,
          numericOrdering: true,
        },
      }),
      OrderModel.aggregate([{ $match: finalFilters }], {
        collation: {
          locale: 'en',
          strength: 2,
          numericOrdering: true,
        },
      }),
    ]);

    if (!nfts.length || !orders.length) {
      return {
        count: 0,
      };
    }

    const filtered = [];

    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];

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

      filtered.push(nft);
    }

    return {
      count: filtered.length,
    };
  }

  private async queryNftAndOrderParams(
    nftParams: INFTParameters,
    orderParams: IOrderParameters,
    generalParams: IGeneralParameters,
  ) {
    console.log('Querying nft and order params');

    const { page, limit } = generalParams;

    const { nftFilters } = await buildNftQueryFilters(nftParams);
    if (!nftFilters.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }
    //TODO: Try to transfer filters like contractAddress, ownerAddress... to narrow down order search
    const { finalFilters, sortingAggregation, sort } =
      await buildOrderQueryFilters(orderParams, generalParams);

    const [nfts, orders] = await Promise.all([
      TokenModel.aggregate([...nftFilters], {
        collation: {
          locale: 'en',
          strength: 2,
          numericOrdering: true,
        },
      }),
      OrderModel.aggregate(
        [{ $match: finalFilters }, ...sortingAggregation, { $sort: sort }],
        {
          collation: {
            locale: 'en',
            strength: 2,
            numericOrdering: true,
          },
        },
      ),
    ]);

    if (!nfts.length || !orders.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    const filtered = [];
    // Apply Pagination:
    // Check if we have orderSort parameter
    // If yes --> ALWAYS iterate over the sorted orders to find the nfts, otherwise the sorting won't be persited to the response
    // If no --> we iterate over the nfts to find the orders
    if (orderParams.orderSort) {
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];

        const nft = nfts.find((nft) => {
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
              order.make.assetType.contract ===
                nft.contractAddress.toLowerCase()
            );
          }
        });

        if (!nft) {
          continue;
        }

        // ERC1155 may have more than one active listing
        let nftOrders = [];
        if (AssetClass.ERC721_BUNDLE != order.make.assetType.assetClass) {
          nftOrders = orders.filter(
            (o) =>
              o.make.assetType.contract === order.make.assetType.contract &&
              o.make.assetType.tokenId === order.make.assetType.tokenId,
          );
        }

        nft.orders = nftOrders;
        filtered.push(nft);

        if (filtered.length === generalParams.skippedItems + limit) {
          break;
        }
      }
    } else {
      for (let i = 0; i < nfts.length; i++) {
        const nft = nfts[i];

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
        filtered.push(nft);

        if (filtered.length === generalParams.skippedItems + limit) {
          break;
        }
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
