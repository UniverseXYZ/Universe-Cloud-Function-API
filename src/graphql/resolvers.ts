import { IDataSources } from '../types';

let count = 0;

const testMap = {
  1: '0x8A539522FfdC1DD3EBF1fbd344319194bdC62a28',
  2: '0x0abDDE07AB026d7eD41eD2Cc665C8B8AbaE1e365',
  3: '0x0abDDE07AB026d7eD41eD2Cc665C8B8AbaE1e365',
}

export const resolvers = {
	Query: {
		users: async (_: any, __: any, { dataSources }:{ dataSources: IDataSources}) => {
      const allUsers = await dataSources.userAPI.getUsers();
      return allUsers;
    },
		price: async (_: any, __: any, { dataSources }:{ dataSources: IDataSources}) => {
      return dataSources.priceAPI.getPrice('ethereum');
    },
    tokens: async (_: any, __: any, { dataSources }:{ dataSources: IDataSources}) => {
      return dataSources.tokenAPI.getToken('0x0abDDE07AB026d7eD41eD2Cc665C8B8AbaE1e365');
    },
    collection: async (_: any, __: any, { dataSources }:{ dataSources: IDataSources}) => {
      return dataSources.collectionAPI.getCollection('0x0abDDE07AB026d7eD41eD2Cc665C8B8AbaE1e365');
    },
	},
  User: {
    projects: (user: any, __: any, { dataSources }:{ dataSources: dataSources}) => {
      return dataSources.projectsAPI.getProject(user.id);
    },
    price: (user: any, __: any, { dataSources }:{ dataSources: dataSources}) => {
      return dataSources.priceAPI.getPrice('dai');
    },
    collection: (user: any, __: any, { dataSources }:{ dataSources: dataSources}) => {
      count+= 1;
      const collectionAddress = testMap[count as keyof typeof testMap];
      return dataSources.collectionAPI.getCollection(collectionAddress);
    },
  }
};