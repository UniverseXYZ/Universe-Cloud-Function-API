import { ethers } from "ethers";
import {
  IGeneralParameters,
  IOwnerParameters,
  IQueryParameters,
  IStrategy,
} from "../interfaces";
import { TokenModel } from "../models";
import { getOrdersLookup } from "../services/orders/lookups/order.lookup";
import { buildOwnerQuery } from "../services/owners/owners.service";

export class OwnerStrategy implements IStrategy {
  execute(parameters: IQueryParameters) {
    return this.queryOnlyOwnerParams(
      parameters.ownerParams,
      parameters.generalParams,
      parameters.nftParams.tokenType.toString()
    );
  }

  private async queryOnlyOwnerParams(
    ownerParams: IOwnerParameters,
    generalParams: IGeneralParameters,
    tokenType: string
  ) {
    console.log("Querying only owner params");
    const { page, limit } = generalParams;

    const ownerQuery = buildOwnerQuery(
      ownerParams,
      tokenType,
      generalParams.skippedItems,
      generalParams.limit
    );

    console.time("query-time");
    const owners = await ownerQuery;

    console.timeEnd("query-time");

    if (!owners.length) {
      return {
        page: page,
        size: limit,
        nfts: [],
      };
    }

    console.time("query-time2");

    const data = await TokenModel.aggregate(
      [
        {
          $match: {
            $and: [
              {
                $or: owners.map((owner) => ({
                  tokenId: owner.tokenId,
                  contractAddress: owner.contractAddress,
                })),
              },
            ],
          },
        },
        { $skip: generalParams.skippedItems },
        { $limit: Number(limit) },
        getOrdersLookup(),
      ],
      { collation: { locale: "en", strength: 2 } }
    );

    console.timeEnd("query-time2");

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

    return {
      page: page,
      size: limit,
      nfts: finalData,
    };
  }
}
