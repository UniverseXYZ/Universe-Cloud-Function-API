import {
  IExecutionParameters,
  IQueryParameters,
  TokenType,
} from "../../interfaces";

import {
  hasNftParamsOnly,
  hasOrderParamsOnly,
  hasOwnerParamsOnly,
} from "./nft.service.helpers";

import { buildGeneralParams } from "./nft.service.builder";

import {
  NftOrderStrategy,
  NftOwnerOrderStrategy,
  NftOwnerStrategy,
  NftStrategy,
  OrderStrategy,
  OwnerOrderStrategy,
  OwnerStrategy,
  StrategyContext,
} from "./strategies";

// TODO:: Write down the minimum required params for the Cloud function
// to be able to return a result without timing out from the DB

/**
 * Analyses the query paramters and chooses the optimal query strategy based on the parameters
 * @param params Query Parameters from the URI
 * @returns
 */
export const fetchNfts = async (params: IExecutionParameters) => {
  const {
    ownerAddress,
    tokenAddress,
    tokenType,
    searchQuery,
    page,
    limit,
    side,
    assetClass,
    tokenIds,
    beforeTimestamp,
    contractAddress,
    minPrice,
    maxPrice,
    sortBy,
    hasOffers,
    buyNow,
    ...traits
  } = params;
  if (tokenType && !Object.values(TokenType).includes(tokenType)) {
    throw new Error("Invalid token type");
  }

  const queryParams: IQueryParameters = {
    nftParams: {
      contractAddress,
      tokenIds,
      searchQuery,
      tokenType: TokenType[tokenType],
      traits,
    },
    orderParams: {
      minPrice,
      maxPrice,
      sortBy,
      hasOffers,
      side,
      assetClass,
      beforeTimestamp,
      tokenAddress,
    },
    ownerParams: {
      ownerAddress,
    },
    generalParams: buildGeneralParams(page, limit),
  };

  const hasNftParams = !!(
    queryParams.nftParams.contractAddress ||
    queryParams.nftParams.tokenType ||
    queryParams.nftParams.searchQuery ||
    queryParams.nftParams.tokenIds ||
    Object.keys(queryParams.nftParams.traits).length
  );

  const hasOrderParams = !!(
    queryParams.orderParams.side ||
    queryParams.orderParams.assetClass ||
    queryParams.orderParams.minPrice ||
    queryParams.orderParams.maxPrice ||
    queryParams.orderParams.beforeTimestamp ||
    queryParams.orderParams.tokenAddress ||
    queryParams.orderParams.sortBy ||
    queryParams.orderParams.hasOffers
  );

  const hasOwnerParams = !!queryParams.ownerParams.ownerAddress;

  const onlyNftsParams = hasNftParamsOnly(
    hasNftParams,
    hasOrderParams,
    hasOwnerParams
  );

  const onlyOrderParams = hasOrderParamsOnly(
    hasNftParams,
    hasOrderParams,
    hasOwnerParams
  );

  const onlyOwnerParams = hasOwnerParamsOnly(
    hasNftParams,
    hasOrderParams,
    hasOwnerParams
  );

  const strategy = new StrategyContext();

  if (onlyNftsParams) {
    strategy.setStrategy(new NftStrategy());
  }

  if (onlyOrderParams) {
    strategy.setStrategy(new OrderStrategy());
  }

  if (onlyOwnerParams) {
    strategy.setStrategy(new OwnerStrategy());
  }

  if (hasNftParams && hasOwnerParams && !hasOrderParams) {
    strategy.setStrategy(new NftOwnerStrategy());
  }

  if (hasNftParams && hasOrderParams && !hasOwnerParams) {
    strategy.setStrategy(new NftOrderStrategy());
  }

  if (hasOrderParams && hasOwnerParams && !hasNftParams) {
    strategy.setStrategy(new OwnerOrderStrategy());
  }

  if (hasNftParams && hasOrderParams && hasOwnerParams) {
    strategy.setStrategy(new NftOwnerOrderStrategy());
  }
  return strategy.executeStrategy(queryParams);
};
