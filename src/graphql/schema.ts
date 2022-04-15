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
    orders: [Order]
    offers: [Order]
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
  }
`;
