import { ethers } from "ethers";
import {
  IGeneralParameters,
  INFTParameters,
  IQueryParameters,
  IStrategy,
} from "../../../interfaces";
import { TokenModel } from "../../../models";
import {
  buildNftQueryFilters,
  getOrdersLookup,
  getOwnersByTokens,
} from "../nft.service.builder";

export class NftStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryOnlyNftParams(
      parameters.nftParams,
      parameters.generalParams
    );
  }

  private async queryOnlyNftParams(
    nftParams: INFTParameters,
    generalParams: IGeneralParameters
  ) {
    console.log("Querying only nft params");
    const { page, limit } = generalParams;

    const nftFilters = await buildNftQueryFilters(nftParams);

    console.log("Querying...");
    console.time("query-time");

    const data = await TokenModel.aggregate(
      [
        ...nftFilters,
        { $skip: generalParams.skippedItems },
        { $limit: Number(limit) },
        getOrdersLookup(),
        { $sort: { searchScore: -1, updatedAt: -1 } },
      ],
      { collation: { locale: "en", strength: 2 } }
    );

    if (!data.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }
    const owners = await getOwnersByTokens(
      data,
      nftParams.tokenType.toString()
    );

    const finalData = data.map((nft) => {
      const ownersInfo = owners.filter(
        (owner) =>
          owner.contractAddress === nft.contractAddress &&
          owner.tokenId === nft.tokenId
      );

      const ownerAddresses = ownersInfo.map((owner) => ({
        owner: owner.address,
        value: owner.value
          ? owner.value.toString()
          : ethers.BigNumber.from(owner.value).toString(),
      }));

      return {
        ...nft,
        owners: ownerAddresses,
      };
    });

    console.timeEnd("query-time");

    return {
      page: page,
      size: limit,
      nfts: finalData,
    };
  }
}
