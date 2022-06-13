import {
  IExecutionParameters,
  IQueryParameters,
  TokenType,
} from "../../interfaces";

import {
  hasNftParamsOnly,
  hasOrderParamsOnly,
  hasOwnerParamsOnly,
} from "./helpers/nft.helpers";

import { buildGeneralParams } from "./builders";

import {
  NftOrderStrategy,
  NftOwnerOrderStrategy,
  NftOwnerStrategy,
  NftStrategy,
  OrderStrategy,
  OwnerOrderStrategy,
  OwnerStrategy,
  StrategyContext,
} from "../../strategies";
import { NFTTokenOwnerModel } from "../../models";

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
    traits,
  } = params;

  const queryParams: IQueryParameters = {
    nftParams: {
      contractAddress,
      tokenIds,
      searchQuery,
      tokenType: TokenType[tokenType] || "",
      traits,
    },
    orderParams: {
      minPrice,
      maxPrice,
      sortBy: Number(sortBy),
      hasOffers: !!hasOffers,
      buyNow: !!buyNow,
      side: Number(side),
      assetClass,
      beforeTimestamp: Number(beforeTimestamp),
      tokenAddress,
    },
    ownerParams: {
      ownerAddress,
    },
    generalParams: buildGeneralParams(Number(page), Number(limit)),
  };

  const hasNftParams = !!(
    queryParams.nftParams.contractAddress ||
    queryParams.nftParams.tokenType ||
    queryParams.nftParams.searchQuery ||
    queryParams.nftParams.tokenIds ||
    (queryParams.nftParams.traits &&
      Object.keys(queryParams.nftParams.traits).length)
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
  // || queryParams.orderParams.buyNow

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

export const countNfts = async (params: IExecutionParameters) => {
  const { ownerAddress, contractAddress } = params;

  let filters = {} as any;
  let collationOptions = {} as any;

  if (ownerAddress) {
    filters = { address: ownerAddress };
    collationOptions = { collation: { locale: "en", strength: 2 } };
  } else if (contractAddress) {
    filters = { contractAddress };
  }

  const result = await NFTTokenOwnerModel.aggregate(
    [
      {
        $unionWith: {
          coll: "nft-erc1155-token-owners",
          pipeline: [],
        },
      },
      { $match: filters },
      { $group: { _id: null, count: { $sum: 1 } } },
    ],
    collationOptions
  );

  if (!result || !result.length) {
    throw new Error("Unexpected count query result");
  }

  const count = result[0].count;

  return { count };
};
