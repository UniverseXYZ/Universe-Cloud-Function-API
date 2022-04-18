import { gql } from "apollo-server";

export const typeDefs = gql`
  type Query {
    userNfts(
      ownerAddress: String!
      tokenAddress: String
      searchQuery: String
      tokenType: String
      page: Int!
      limit: Int!
      side: Int
      assetClass: String
      tokenIds: String
      beforeTimestamp: Int!
      token: String
      minPrice: String
      maxPrice: String
      sortBy: String
      hasOffers: Boolean
    ): NFTResponse
  }

  type NFTResponse {
    page: Int!
    size: Int!
    total: Int!
    nfts: [NFT]
  }

  type NFT {
    contractAddress: String
    tokenId: String
    tokenType: String
    externalDomainViewUrl: String
    alternativeMediaFiles: [MediaFile]
    metadata: Metadata
    owners: [Owner]
    activeListing: Order
    offers: [Order]
    orders: [Order]
    bestOffer: Order
    lastOffer: Order
  }

  type Metadata {
    name: String
    description: String
    external_url: String
    animation_url: String
    image: String
    image_url: String
    image_original_url: String
    image_preview_url: String
    image_thumbnail_url: String
    gif: String
    attributes: [Attribute]
  }

  type Attribute {
    trait_type: String
    value: String
  }

  type MediaFile {
    type: String
    url: String
  }

  type Owner {
    owner: String
    value: Int
  }

  type Order {
    _id: ID
    status: Int!
    hash: String!
    type: String!
    side: Int!
    maker: String!
    make: Asset
    taker: String!
    take: Asset
    salt: Int!
    start: Int!
    end: Int!
    data: OrderData
    signature: String!
    fill: String
    makeStock: String
    makeBalance: String
    cancelledTxHash: String
    matchedTxHash: String
  }

  type Asset {
    value: String
    assetType: AssetType
  }

  type AssetType {
    tokenId: String
    contract: String
    assetClass: String
  }

  type OrderData {
    dataType: String
    revenueSplit: [Part]
  }

  type Part {
    account: String
    value: String
  }
`;
