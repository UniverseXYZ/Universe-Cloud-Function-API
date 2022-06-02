// TODO:: Describe what TokenType could be
export interface INFTParams {
  tokenAddress: string;
  tokenType: string;
  searchQuery: string;
  tokenIds: string;
}

export interface IOrderParams {
  side: number;
  assetClass: string;
  beforeTimestamp: number;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  hasOffers: boolean;
  collection: string;
}

export interface IOwnerParams {
  ownerAddress: string;
  tokenType: string;
}

export interface IGeneralParams {
  page: number;
  limit: number;
}

export interface IQueryParams {
  nftParams: INFTParams;
  orderParams: IOrderParams;
  ownerParams: IOwnerParams;
  generalParams: IGeneralParams;
}
