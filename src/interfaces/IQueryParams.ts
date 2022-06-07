// TODO:: Describe what TokenType could be
export interface INFTParams {
  contractAddress: string;
  tokenType: string;
  searchQuery: string;
  tokenIds: string;
  traits: any;
}

export interface IOrderParams {
  side: number;
  assetClass: string;
  beforeTimestamp: number;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  hasOffers: boolean;
  tokenAddress: string;
}

export interface IOwnerParams {
  ownerAddress: string;
}

export interface IGeneralParams {
  page: number;
  limit: number;
  skippedItems: number;
}

export interface IQueryParams {
  nftParams: INFTParams;
  orderParams: IOrderParams;
  ownerParams: IOwnerParams;
  generalParams: IGeneralParams;
}

export interface FetchParams {
  ownerAddress: string;
  tokenAddress: string;
  tokenType: string;
  searchQuery: string;
  page: number;
  limit: number;
  side: number;
  // NFT Type
  assetClass: string;
  tokenIds: string;
  // New checkbox
  beforeTimestamp: number;
  contractAddress: string;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  // Has offers checkbox
  hasOffers: boolean;
  //Buy Now checkbox
  buyNow: boolean;
}
