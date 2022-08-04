import {
  IExecutionParameters,
  IQueryParameters,
  IStrategy,
  TokenType,
} from '../interfaces';
import { ApiError, ERROR_MESSAGES, HTTP_STATUS_CODES } from '../errors';
import {
  hasNftParamsOnly,
  hasOrderParamsOnly,
  hasOwnerParamsOnly,
} from '../services/nfts/helpers/nft.helpers';
import { buildGeneralParams } from '../services/nfts/builders';
import {
  NftOrderStrategy,
  NftOwnerOrderStrategy,
  NftOwnerStrategy,
  NftStrategy,
  OrderStrategy,
  OwnerOrderStrategy,
  OwnerStrategy,
} from '../strategies';
import { CloudActions } from '../validations';
import { utils } from 'ethers';

// The context defines the interface of interest to clients.
export class StrategyContext {
  // The context maintains a reference to one of the strategy
  // objects. The context doesn't know the concrete class of a
  // strategy. It should work with all strategies via the
  // strategy interface.
  private strategy: IStrategy;

  private queryParams: IQueryParameters;

  public constructor(params: IExecutionParameters) {
    // TODO:: Write down the minimum required params for the Cloud function
    // to be able to return a result without timing out from the DB

    // Analysing the query paramters and chooses the optimal query strategy based on the parameters
    const {
      ownerAddress,
      tokenAddress,
      contractAddress,
      tokenType,
      searchQuery,
      tokenIds,
      traits,
      nftSort,
      page,
      limit,
      side,
      maker,
      assetClass,
      beforeTimestamp,
      minPrice,
      maxPrice,
      hasOffers,
      buyNow,
    } = params;

    const orderSort = params.orderSort;

    this.queryParams = {
      nftParams: {
        contractAddress: contractAddress
          ? utils.getAddress(contractAddress)
          : '',
        tokenIds,
        searchQuery,
        tokenType: TokenType[tokenType] || '',
        traits,
        nftSort: Number(nftSort),
      },
      orderParams: {
        minPrice,
        maxPrice,
        orderSort: Number(orderSort),
        hasOffers: !!hasOffers,
        buyNow: !!buyNow,
        side: Number(side),
        maker: maker ? utils.getAddress(maker) : '',
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
      this.queryParams.nftParams.contractAddress ||
      this.queryParams.nftParams.tokenType ||
      this.queryParams.nftParams.searchQuery ||
      this.queryParams.nftParams.tokenIds ||
      (this.queryParams.nftParams.traits &&
        Object.keys(this.queryParams.nftParams.traits).length) ||
      this.queryParams.nftParams.nftSort
    );

    const hasOrderParams = !!(
      this.queryParams.orderParams.side ||
      this.queryParams.orderParams.maker ||
      this.queryParams.orderParams.assetClass ||
      this.queryParams.orderParams.minPrice ||
      this.queryParams.orderParams.maxPrice ||
      this.queryParams.orderParams.beforeTimestamp ||
      this.queryParams.orderParams.tokenAddress ||
      this.queryParams.orderParams.orderSort ||
      this.queryParams.orderParams.hasOffers
    );
    // || this.queryParams.orderParams.buyNow

    const hasOwnerParams = !!this.queryParams.ownerParams.ownerAddress;

    const onlyNftsParams = hasNftParamsOnly(
      hasNftParams,
      hasOrderParams,
      hasOwnerParams,
    );

    const onlyOrderParams = hasOrderParamsOnly(
      hasNftParams,
      hasOrderParams,
      hasOwnerParams,
    );

    const onlyOwnerParams = hasOwnerParamsOnly(
      hasNftParams,
      hasOrderParams,
      hasOwnerParams,
    );

    if (onlyNftsParams) {
      this.setStrategy(new NftStrategy());
    }

    if (onlyOrderParams) {
      this.setStrategy(new OrderStrategy());
    }

    if (onlyOwnerParams) {
      this.setStrategy(new OwnerStrategy());
    }

    if (hasNftParams && hasOwnerParams && !hasOrderParams) {
      this.setStrategy(new NftOwnerStrategy());
    }

    if (hasNftParams && hasOrderParams && !hasOwnerParams) {
      this.setStrategy(new NftOrderStrategy());
    }

    if (hasOrderParams && hasOwnerParams && !hasNftParams) {
      this.setStrategy(new OwnerOrderStrategy());
    }

    if (hasNftParams && hasOrderParams && hasOwnerParams) {
      this.setStrategy(new NftOwnerOrderStrategy());
    }
  }

  public run(action: CloudActions) {
    if (!this.strategy || !this.queryParams) {
      throw new ApiError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        ERROR_MESSAGES.STRATEGY_NOT_INITIALIZED,
      );
    }

    switch (action) {
      case CloudActions.QUERY:
        return this.strategy.execute(this.queryParams);
        break;
      case CloudActions.COUNT:
        return this.strategy.count(this.queryParams);
        break;
      default:
        throw new ApiError(
          HTTP_STATUS_CODES.BAD_REQUEST,
          ERROR_MESSAGES.INVALID_PARAMETER('action'),
        );
        break;
    }
  }

  // Usually the context accepts a strategy through the
  // constructor, and also provides a setter so that the
  // strategy can be switched at runtime.
  private setStrategy(strategy: IStrategy) {
    this.strategy = strategy;
  }
}
