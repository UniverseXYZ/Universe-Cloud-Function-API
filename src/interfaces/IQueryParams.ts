// TODO:: Describe what TokenType could be
export enum TokenType {
  ERC721,
  ERC1155,
}
export interface INFTParameters {
  contractAddress: string;
  tokenType: TokenType;
  searchQuery: string;
  tokenIds: string;
  traits: any;
}

export interface IOrderParameters {
  side: number;
  assetClass: string;
  beforeTimestamp: number;
  minPrice: string;
  maxPrice: string;
  sortBy: number;
  hasOffers: boolean;
  tokenAddress: string;
  buyNow: boolean;
}

export interface IOwnerParameters {
  ownerAddress: string;
}

export interface IGeneralParameters {
  page: number;
  limit: number;
  skippedItems: number;
}

export interface IQueryParameters {
  nftParams: INFTParameters;
  orderParams: IOrderParameters;
  ownerParams: IOwnerParameters;
  generalParams: IGeneralParameters;
}

export interface IExecutionParameters {
  ownerAddress: string;
  tokenAddress: string;
  tokenType: string;
  searchQuery: string;
  page: string;
  limit: string;
  side: string;
  // NFT Type
  assetClass: string;
  tokenIds: string;
  // New checkbox
  beforeTimestamp: string;
  contractAddress: string;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  // Has offers checkbox
  hasOffers: string;
  //Buy Now checkbox
  buyNow: string;
}
