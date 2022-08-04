import { ethers, utils } from 'ethers';
import { IOrderParameters, IGeneralParameters } from '../../../interfaces';
import {
  OrderSide,
  OrderStatus,
  AssetClass,
  OrderModel,
} from '../../../models';

import {
  addEndSortingAggregation,
  addPriceSortingAggregation,
} from '../aggregations/order.aggregations';

import { Utils } from '../../../utils';

enum SortOrderOptionsEnum {
  RecentlyListed = 1,
  HighestPrice = 2,
  LowestPrice = 3,
  TokenIdAscending = 8,
  TokenIdDescending = 9,
}

export const buildOrderQueryFilters = async (
  orderParams: IOrderParameters,
  generalParams: IGeneralParameters,
) => {
  const { page, limit } = generalParams;

  const utcTimestamp = Utils.getUtcTimestamp();

  const filters = [] as any;

  const {
    minPrice,
    maxPrice,
    orderSort,
    hasOffers,
    side,
    maker,
    assetClass,
    beforeTimestamp,
    tokenAddress,
  } = orderParams;

  //assuming that, when querying orders, certain filtering should exist by default
  if (!side) {
    filters.push({
      side: OrderSide.SELL,
    });
  }
  filters.push({
    status: { $in: [OrderStatus.CREATED, OrderStatus.PARTIALFILLED] },
  });
  filters.push({
    $or: [{ start: { $lt: utcTimestamp } }, { start: 0 }],
  });
  filters.push({
    $or: [{ end: { $gt: utcTimestamp } }, { end: 0 }],
  });

  // ORDER FILTERS
  if (minPrice) {
    const weiPrice = ethers.utils.parseUnits(minPrice as string, 18).toString();
    // TODO: If possible remove $expr because it can't use the mulitykey index

    filters.push({
      $expr: {
        $gte: [{ $toDecimal: '$take.value' }, parseFloat(weiPrice)],
      },
    });
  }

  if (maxPrice) {
    const weiPrice = ethers.utils.parseUnits(maxPrice as string, 18).toString();

    // TODO: If possible remove $expr because it can't use the mulitykey index
    filters.push({
      $expr: {
        $lte: [{ $toDecimal: '$take.value' }, parseFloat(weiPrice)],
      },
    });
  }

  if (beforeTimestamp) {
    const milisecTimestamp = Number(beforeTimestamp) * 1000;
    const utcDate = new Date(milisecTimestamp);

    filters.push({
      createdAt: { $gt: utcDate.toDateString() },
    });
  }

  if (tokenAddress) {
    const sideToFilter = side && OrderSide.BUY === side ? 'make' : 'take';
    if (tokenAddress === ethers.constants.AddressZero) {
      filters.push({
        [`${sideToFilter}.assetType.assetClass`]: AssetClass.ETH,
      });
    } else {
      const checkSumAddress = utils.getAddress(tokenAddress.toLowerCase());
      filters.push({
        $or: [
          {
            [`${sideToFilter}.assetType.contract`]:
              checkSumAddress.toLowerCase(),
          },
          // passing array with single element to only get bundles with single contract!
          {
            [`${sideToFilter}.assetType.contracts`]: [
              checkSumAddress.toLowerCase(),
            ],
          },
        ],
      });
    }
  }

  if (assetClass) {
    const assetClasses = assetClass.replace(/\s/g, '').split(',');

    filters.push({ 'make.assetType.assetClass': { $in: assetClasses } });
  }

  if (!!hasOffers) {
    // Get all buy orders
    const buyOffers = await OrderModel.find({
      $and: [
        {
          $or: [{ start: { $lt: utcTimestamp } }, { start: 0 }],
        },
        { $or: [{ end: { $gt: utcTimestamp } }, { end: 0 }] },
        {
          status: OrderStatus.CREATED,
          side: OrderSide.BUY,
        },
      ],
    });

    const innerQuery: any[] = [];
    // Search for any sell orders that have offers
    buyOffers.forEach((offer: any) => {
      // Offers(buy orders) have the nft info in 'take'
      const tokenId = offer.take.assetType.tokenId;
      const contract = offer.take.assetType.contract;
      if (tokenId && contract) {
        innerQuery.push({
          'make.assetType.tokenId': tokenId,
          'make.assetType.contract': contract.toLowerCase(),
        });
      }
    });
    console.log('INNER QUERY:');
    console.log(innerQuery);

    // If query is empty --> there are no orders with offers
    if (!innerQuery.length) {
      return {
        page: Number(page),
        size: Number(limit),
        total: 0,
        nfts: [],
      };
    }

    filters.push({ $or: innerQuery });
  }

  if (side) {
    filters.push({
      side: Number(side),
    });
  }

  if (maker) {
    filters.push({
      maker: maker.toLowerCase(),
    });
  }

  const sort = {} as any;
  let sortingAggregation = [] as any;
  const sorting = orderSort;
  switch (sorting) {
    // case SortOrderOptionsEnum.EndingSoon:
    //   sortingAggregation = addEndSortingAggregation();
    //   sort.orderSort = 1;
    //   break;
    case SortOrderOptionsEnum.HighestPrice:
      sortingAggregation = await addPriceSortingAggregation(OrderSide.SELL);
      sort.usd_value = -1;
      break;
    case SortOrderOptionsEnum.LowestPrice:
      sortingAggregation = await addPriceSortingAggregation(OrderSide.SELL);
      sort.usd_value = 1;
      break;
    case SortOrderOptionsEnum.RecentlyListed:
      sort.createdAt = -1;
      break;
    case SortOrderOptionsEnum.TokenIdAscending:
      sort.tokenId = 1;
      break;
    case SortOrderOptionsEnum.TokenIdDescending:
      sort.tokenId = -1;
      break;
    default:
      sort.createdAt = -1;
      break;
  }

  // _id is unique and will return consistent sorting
  // results because other sorting params are not unique
  // sort = {
  //   ...sort,
  //   updatedAt: -1,
  //   _id: -1,
  // };

  const finalFilters = { $and: filters };

  return { finalFilters, sortingAggregation, sort };
};
