import { NFTToken } from "datascraper-schema";
import { ethers } from "ethers";
import { fetchUserNfts } from "../services/nft.services";
import { IDataSources } from "../types";

// let count = 0;

// const testMap = {
//   1: "0x8A539522FfdC1DD3EBF1fbd344319194bdC62a28",
//   2: "0x0abDDE07AB026d7eD41eD2Cc665C8B8AbaE1e365",
//   3: "0x0abDDE07AB026d7eD41eD2Cc665C8B8AbaE1e365",
// };

// export const resolvers = {
//   Query: {
//     users: async (
//       _: any,
//       __: any,
//       { dataSources }: { dataSources: IDataSources }
//     ) => {
//       const allUsers = await dataSources.userAPI.getUsers();
//       return allUsers;
//     },
//     price: async (
//       _: any,
//       __: any,
//       { dataSources }: { dataSources: IDataSources }
//     ) => {
//       return dataSources.priceAPI.getPrice("ethereum");
//     },
//     tokens: async (
//       _: any,
//       __: any,
//       { dataSources }: { dataSources: IDataSources }
//     ) => {
//       return dataSources.tokenAPI.getToken(
//         "0x0abDDE07AB026d7eD41eD2Cc665C8B8AbaE1e365"
//       );
//     },
//     collection: async (
//       _: any,
//       __: any,
//       { dataSources }: { dataSources: IDataSources }
//     ) => {
//       return dataSources.collectionAPI.getCollection(
//         "0x0abDDE07AB026d7eD41eD2Cc665C8B8AbaE1e365"
//       );
//     },
//   },
//   User: {
//     projects: (
//       user: any,
//       __: any,
//       { dataSources }: { dataSources: IDataSources }
//     ) => {
//       return dataSources.projectsAPI.getProject(user.id);
//     },
//     price: (
//       user: any,
//       __: any,
//       { dataSources }: { dataSources: IDataSources }
//     ) => {
//       return dataSources.priceAPI.getPrice("dai");
//     },
//     collection: (
//       user: any,
//       __: any,
//       { dataSources }: { dataSources: IDataSources }
//     ) => {
//       count += 1;
//       const collectionAddress = testMap[count as keyof typeof testMap];
//       return dataSources.collectionAPI.getCollection(collectionAddress);
//     },
//   },
// };

export const resolvers = {
  Query: {
    userNfts: async (
      parent: any,
      {
        ownerAddress,
        tokenAddress,
        searchQuery,
        tokenType,
        page,
        limit,
        side,
        assetClass,
        tokenIds,
        beforeTimestamp,
        token,
        minPrice,
        maxPrice,
        sortBy,
        hasOffers,
      }: {
        ownerAddress: string;
        tokenAddress: string;
        tokenType: string;
        searchQuery: string;
        page: number;
        limit: number;
        side: number;
        assetClass: string;
        tokenIds: string;
        beforeTimestamp: number;
        token: string;
        minPrice: string;
        maxPrice: string;
        sortBy: string;
        hasOffers: boolean;
      },
      { dataSources }: { dataSources: IDataSources }
    ) =>
      await fetchUserNfts(
        ownerAddress,
        tokenAddress,
        tokenType,
        searchQuery,
        page,
        limit,
        dataSources,
        side,
        assetClass,
        tokenIds,
        beforeTimestamp,
        token,
        minPrice,
        maxPrice,
        sortBy,
        hasOffers
      ),
  },
  NFT: {
    offers: () => [],
    activeListing: (
      parent: NFTToken,
      context: any,
      { dataSources }: { dataSources: IDataSources }
    ) => {
      const listing = dataSources.ordersAPI.getOrder(
        parent.tokenId,
        parent.contractAddress.toLowerCase()
      );

      return listing;
    },

    // We cannot fetch best and last offers as cloud function are stateless
    // and we need to keep the prices of ERC20 tokens in the server state.
    // We can leave them to be fetched on the FE asynchronously
    bestOffer: () => null,
    lastOffer: () => null,
  },
};
