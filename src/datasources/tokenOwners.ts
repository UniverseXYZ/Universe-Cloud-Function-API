import { DataSource } from "apollo-datasource";
import { DataSourceConfig } from "../types";

export default class TokenOwnersAPI extends DataSource {
  store: any;
  context: any;
  constructor({ store }: { store: any }) {
    super();
    this.store = store;
  }

  initialize(config: DataSourceConfig) {
    this.context = config.context;
  }

  async getToken(id: any) {
    const tokens = await this.store.find({ contractAddress: id }).limit(10);

    return tokens;
  }

  async getOwnedTokens(ownerAddress: string, tokenAddress: string) {
    const query = {} as any;

    if (ownerAddress) {
      query.address = ownerAddress;
    }

    // if (searchQuery?.tokenType) {
    //   query.tokenType = searchQuery.tokenType;
    // }

    if (tokenAddress) {
      //TODO: Add validation
      // query.contractAddress = utils.getAddress(tokenAddress);

      query.contractAddress = tokenAddress;
    }

    const tokenOwners = await this.store.find({ ...query });

    return tokenOwners;
  }

  async getOwners(tokenOwners: any[]) {
    const query = tokenOwners.map((token) => ({
      contractAddress: token.contractAddress,
      tokenId: token.tokenId,
    }));

    return await this.store.find({ $or: query });
  }
}
