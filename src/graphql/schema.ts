import { gql } from 'apollo-server';

export const typeDefs =  gql`
  type Query {
    users: [User]
    price: Price
    tokens: [Tokens]
    collection: Collection
  }

  type Collection {
    contractAddress: String
    tokenType: String
    name: String
    owner: String
    symbol: String
  }

  type Tokens {
    contractAddress: String
    tokenId: String
    tokenType: String
  }

  type Price {
    coin: String
    value: String
  }

  type User {
    id: String
    name: String
    email: String
    projects: [Project]
    price: Price
    collection: Collection
  }

  type Project {
    id: Int
    title: String
    status: String
    members: [User]
  }
`;
