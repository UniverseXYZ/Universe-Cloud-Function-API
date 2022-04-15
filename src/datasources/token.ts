import { DataSource } from "apollo-datasource";
import { DataSourceConfig } from "../types";

export default class TokensAPI extends DataSource {
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

  async getTokensDetailsByTokens(
    tokenOwners: any[],
    searchQuery: string,
    tokenType: string,
    tokenAddress: string,
    page: number,
    limit: number
  ) {
    const query = {} as any;

    if (tokenType) {
      query.tokenType = tokenType;
    }

    if (tokenAddress) {
      //TODO: Validate address
      // query.contractAddress = utils.getAddress(tokenAddress);
      query.contractAddress = tokenAddress;
    }

    if (searchQuery) {
      query["metadata.name"] = { $regex: new RegExp(searchQuery, "i") };
    }

    query["$or"] = tokenOwners.map((owner) => {
      return {
        contractAddress: owner.contractAddress,
        tokenId: owner.tokenId,
      };
    });

    console.log("Fetching");
    const tokens = await this.store
      .find({ ...query })
      .sort({ updatedAt: -1 })
      .skip(page * limit)
      .limit(limit);
    const count = await this.store.count({ ...query });

    return { tokens, count };
  }
}
