import { ethers } from 'ethers';
import {
  IGeneralParameters,
  INFTParameters,
  IOwnerParameters,
  IQueryParameters,
  IStrategy,
} from '../interfaces';
import { TokenModel, OrderModel, OrderStatus, OrderSide } from '../models';
import { buildNftQueryFilters } from '../services/nfts/builders';
import { buildOwnerQuery } from '../services/owners/owners.service';
import { getBundleOrdersByTokens } from '../services/orders/orders.service';
import { getOrdersLookup } from '../services/orders/lookups/order.lookup';

export class NftOwnerStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryNftAndOwnerParams(
      parameters.nftParams,
      parameters.ownerParams,
      parameters.generalParams,
    );
  }

  count(parameters: IQueryParameters) {
    return this.countNftAndOwnerParams(
      parameters.nftParams,
      parameters.ownerParams,
    );
  }

  private async countNftAndOwnerParams(
    nftParams: INFTParameters,
    ownerParams: IOwnerParameters,
  ) {
    console.log('Counting nft and owner params');

    const ownerQuery = buildOwnerQuery(
      ownerParams,
      nftParams.tokenType.toString(),
    );

    console.time('owner-query-time');
    const owners = await ownerQuery;
    console.timeEnd('owner-query-time');

    const { nftFilters, sort } = await buildNftQueryFilters(
      nftParams,
      owners.map((owner) => ({
        contractAddress: owner.contractAddress,
        tokenId: owner.tokenId,
      })),
    );

    if (!nftFilters.length) {
      return {
        count: 0,
      };
    }

    console.time('nft-query-time');
    const nfts = await TokenModel.aggregate([...nftFilters], {
      collation: {
        locale: 'en',
        strength: 2,
        numericOrdering: true,
      },
    });
    console.timeEnd('nft-query-time');

    const filtered = [];

    if (!nfts.length || !owners.length) {
      return {
        count: 0,
      };
    }

    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];

      const nftOwners = owners.filter(
        (owner) =>
          owner.tokenId === nft.tokenId &&
          owner.contractAddress.toLowerCase() ===
            nft.contractAddress.toLowerCase(),
      );

      if (!nftOwners.length) {
        continue;
      }

      filtered.push(nft);
    }

    return {
      count: filtered.length,
    };
  }

  private async queryNftAndOwnerParams(
    nftParams: INFTParameters,
    ownerParams: IOwnerParameters,
    generalParams: IGeneralParameters,
  ) {
    console.log('Querying nft and owner params');

    const { page, limit } = generalParams;

    const ownerQuery = buildOwnerQuery(
      ownerParams,
      nftParams.tokenType.toString(),
    );

    console.time('owner-query-time');
    const owners = await ownerQuery;
    console.timeEnd('owner-query-time');

    const { nftFilters, sort } = await buildNftQueryFilters(
      nftParams,
      owners.map((owner) => ({
        contractAddress: owner.contractAddress,
        tokenId: owner.tokenId,
      })),
    );

    if (!nftFilters.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    // Apply Pagination
    console.time('nft-query-time');
    const nfts = await TokenModel.aggregate(
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

    console.timeEnd('nft-query-time');

    const filtered = [];

    if (!nfts.length || !owners.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];

      const nftOwners = owners.filter(
        (owner) =>
          owner.tokenId === nft.tokenId &&
          owner.contractAddress.toLowerCase() ===
            nft.contractAddress.toLowerCase(),
      );

      if (!nftOwners.length) {
        continue;
      }

      const ownerAddresses = nftOwners.map((owner) => ({
        owner: owner.address,
        value: owner.value
          ? owner.value.toString()
          : ethers.BigNumber.from(owner.value).toString(),
      }));

      filtered.push({ ...nft, owners: ownerAddresses });

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

    // additionally looking up for bundle orders with found NFTs
    console.time('bundle-order-query-time');
    const bundleOrders = await getBundleOrdersByTokens(paginated);
    console.timeEnd('bundle-order-query-time');

    const finalNfts = paginated.map((nft) => {
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

      return nft;
    });

    return {
      page: page,
      size: limit,
      nfts: finalNfts,
    };
  }
}
