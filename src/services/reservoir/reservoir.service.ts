import axios from 'axios';
import { constants } from 'ethers';
import { IReservoirOrderParameters } from '../../interfaces';
import { SortOrderOptionsEnum } from '../orders/builders/order.builder';

export const getReservoirTokenIds = async (
  contractAddress: string,
  params: IReservoirOrderParameters,
) => {
  let filteredTokenIds = [];
  let tokenPrices = await getBestPriceForEveryToken(contractAddress);

  switch (params.orderSort) {
    case SortOrderOptionsEnum.HighestPrice:
      tokenPrices = Object.fromEntries(
        Object.entries(tokenPrices).sort(
          ([, a]: [string, number], [, b]: [string, number]) => b - a,
        ),
      );
      break;
    case SortOrderOptionsEnum.LowestPrice:
      tokenPrices = Object.fromEntries(
        Object.entries(tokenPrices).sort(
          ([, a]: [string, number], [, b]: [string, number]) => a - b,
        ),
      );
      break;
    case SortOrderOptionsEnum.TokenIdAscending:
      tokenPrices = Object.fromEntries(
        Object.entries(tokenPrices).sort(
          ([a]: [string, number], [b]: [string, number]) =>
            Number(a) - Number(b),
        ),
      );
      break;
    case SortOrderOptionsEnum.TokenIdDescending:
      tokenPrices = Object.fromEntries(
        Object.entries(tokenPrices).sort(
          ([a]: [string, number], [b]: [string, number]) =>
            Number(b) - Number(a),
        ),
      );
      break;
    default:
      break;
  }

  if (params.maxPrice || params.minPrice || params.buyNow) {
    if (params.buyNow && !params.maxPrice && !params.minPrice) {
      filteredTokenIds = Object.values(tokenPrices);
    } else {
      Object.keys(tokenPrices).forEach((tokenId) => {
        const price = tokenPrices[tokenId];
        if (
          (params.minPrice && !params.maxPrice && price >= params.minPrice) ||
          (params.maxPrice && !params.minPrice && price <= params.maxPrice) ||
          (params.maxPrice &&
            params.minPrice &&
            price >= params.minPrice &&
            price <= params.maxPrice)
        ) {
          filteredTokenIds.push(tokenId);
        }
      });
    }
    if (!filteredTokenIds.length) {
      return [];
    }
  }
  return filteredTokenIds;
};

export const getReservoirOrdersByOrderParameters = async (
  finalTokens: any[],
  contractAddress: string,
  params: IReservoirOrderParameters,
  continuationToken: string,
) => {
  let endpoint = `${process.env.RESERVOIR_API_URL}/tokens/v5?limit=100`;
  let filteredTokenIds = [];
  let tokenPrices = {};

  if (params.maxPrice || params.minPrice || params.buyNow) {
    tokenPrices = await getBestPriceForEveryToken(contractAddress);
    if (params.buyNow && !params.maxPrice && !params.minPrice) {
      filteredTokenIds = Object.values(tokenPrices);
    } else {
      Object.keys(tokenPrices).forEach((tokenId) => {
        const price = tokenPrices[tokenId];
        if (
          (params.minPrice && !params.maxPrice && price >= params.minPrice) ||
          (params.maxPrice && !params.minPrice && price <= params.maxPrice) ||
          (params.maxPrice &&
            params.minPrice &&
            price >= params.minPrice &&
            price <= params.maxPrice)
        ) {
          filteredTokenIds.push(tokenId);
        }
      });
    }
    if (!filteredTokenIds.length) {
      return [];
    }
  }

  switch (params.orderSort) {
    case SortOrderOptionsEnum.HighestPrice:
      endpoint += `&sortBy=floorAskPrice&sortDirection=desc`;
      break;
    case SortOrderOptionsEnum.LowestPrice:
      endpoint += `&sortBy=floorAskPrice&sortDirection=asc`;
      break;
    case SortOrderOptionsEnum.TokenIdAscending:
      endpoint += `&sortBy=tokenId&sortDirection=asc`;
      break;
    case SortOrderOptionsEnum.TokenIdDescending:
      endpoint += `&sortBy=tokenId&sortDirection=desc`;
      break;
    default:
      break;
  }

  if (!filteredTokenIds.length) {
    endpoint += `&collection=${contractAddress}`;
  } else {
    filteredTokenIds.forEach((token) => {
      endpoint += `&tokens=${contractAddress}:${token}`;
    });
  }

  if (continuationToken) {
    endpoint += `&continuation=${continuationToken}`;
  }
  console.log(endpoint);
  const response = await sendReservoirRequestWithHeader(endpoint);
  const { tokens, continuation } = response.data;

  // Recursively call the same function until continuation token disappears
  // This means we've gathered all the orders matching our filter
  if (continuation) {
    finalTokens.push(...tokens);
    getReservoirOrdersByOrderParameters(
      finalTokens,
      contractAddress,
      params,
      continuationToken,
    );
  }
  const orders = tokens.map(({ token, market }) =>
    convertFloorAskToUniverseOrder(
      market.floorAsk,
      token.contract,
      token.tokenId,
    ),
  );
  return orders;
};

export const getBestPriceForEveryToken = async (contract) => {
  const endpoint = `${process.env.RESERVOIR_API_URL}/tokens/floor/v1?contract=${contract}`;
  const response = await sendReservoirRequestWithHeader(endpoint);
  return response.data.tokens;
};

export const getReservoirOrdersByTokenIds = async (nftData) => {
  const nftsOrders = await nftData.reduce(async (acc, nft) => {
    const tokenSetId = `${nft.contractAddress.toLowerCase()}:${nft.tokenId}`;
    const endpoint = `${process.env.RESERVOIR_API_URL}/orders/asks/v3?token=${tokenSetId}&status=active&includePrivate=false&includeMetadata=false&includeRawData=false&sortBy=createdAt&limit=50`;
    console.log(tokenSetId);
    const response = await sendReservoirRequestWithHeader(endpoint);

    return {
      ...(await acc),
      [tokenSetId]: response.data.orders,
    };
  }, {});

  Object.keys(nftsOrders).forEach(function (key) {
    const convertedOrders = nftsOrders[key].map((order) =>
      convertReservoirToUniverseOrder(order),
    );
    nftsOrders[key] = convertedOrders;
  });

  return nftsOrders;
};

const convertReservoirToUniverseOrder = (order) => {
  const c = {
    maker: order.maker,
    taker: order.taker,
    make: {
      assetType: {
        contract: order.contract.toLowerCase(),
        tokenId: order.tokenSetId.split(':')[2],
      },
      value: 1,
    },
    take: {
      assetType: {
        ...(order.price.currency.contract !== constants.AddressZero && {
          contract: order.price.currency.contract,
        }),
        ...(order.price.currency.contract !== constants.AddressZero
          ? { type: 'ERC20' }
          : { type: 'ETH' }),
      },
      value: order.price.amount.raw,
    },
    start: order.validFrom,
    end: order.validUntil,
    reservoirOrder: order,
  };

  return c;
};

const convertFloorAskToUniverseOrder = (order, contractAddress, tokenId) => {
  const c = {
    maker: order.maker,
    taker: constants.AddressZero,
    make: {
      assetType: {
        contract: contractAddress.toLowerCase(),
        tokenId: tokenId,
      },
      value: 1,
    },
    take: {
      assetType: {
        ...(order.price.currency.contract !== constants.AddressZero && {
          contract: order.price.currency.contract,
        }),
        ...(order.price.currency.contract !== constants.AddressZero
          ? { type: 'ERC20' }
          : { type: 'ETH' }),
      },
      value: order.price.amount.raw,
    },
    start: order.validFrom,
    end: order.validUntil,
    reservoirOrder: order,
  };

  return c;
};

const sendReservoirRequestWithHeader = async (url) =>
  await axios.get(url, {
    headers: {
      'x-api-key': process.env.RESERVOIR_API_KEY,
    },
  });
