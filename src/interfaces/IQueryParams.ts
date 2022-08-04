export enum TokenType {
  ERC721,
  ERC1155,
}
export interface INFTParameters {
  contractAddress: string;
  tokenType: TokenType;
  searchQuery: string;
  tokenIds: string;
  traits: string;
  nftSort: number;
}

export interface IOrderParameters {
  side: number;
  maker: string;
  assetClass: string;
  beforeTimestamp: number;
  minPrice: string;
  maxPrice: string;
  orderSort: number;
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
  contractAddress: string;
  tokenType: string;
  searchQuery: string;
  tokenIds: string;
  traits: string;
  nftSort: string;
  page: string;
  limit: string;
  side: string;
  maker: string;
  // NFT Type
  assetClass: string;
  // New checkbox
  beforeTimestamp: string;
  minPrice: string;
  maxPrice: string;
  orderSort: string;
  // Has offers checkbox
  hasOffers: string;
  //Buy Now checkbox
  buyNow: string;
  action: string;
}
