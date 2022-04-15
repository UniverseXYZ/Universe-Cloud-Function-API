import { ethers } from "ethers";
import { IDataSources } from "../types";

export const fetchUserNfts = async (
  ownerAddress: string,
  tokenAddress: string,
  tokenType: string,
  searchQuery: string,
  page: number,
  limit: number,
  dataSources: IDataSources
) => {
  console.log("Starting to fetch owned tokens");
  const tokenOwners = await dataSources.tokenOwnersAPI.getOwnedTokens(
    ownerAddress,
    tokenAddress
  );
  console.log("Fetched owned tokens");

  if (!tokenOwners.length) {
    return {
      page: page,
      size: limit,
      total: 0,
      data: [],
    };
  }
  console.log("Starting to fetch nfts");

  // Owners query might be unnecessary as we already have the info in tokenOwners
  const [{ tokens, count }, owners] = await Promise.all([
    dataSources.tokenAPI.getTokensDetailsByTokens(
      tokenOwners,
      searchQuery,
      tokenType,
      tokenAddress,
      page,
      limit
    ),
    dataSources.tokenOwnersAPI.getOwners(tokenOwners),
  ]);

  console.log("Fetched nfts");

  const data = tokens.map((token: any) => {
    const ownersInfo = owners.filter(
      (owner: any) =>
        owner.contractAddress === token.contractAddress &&
        owner.tokenId === token.tokenId
    );
    const ownerAddresses = ownersInfo.map((owner: any) => ({
      owner: owner.address,
      value: owner.value
        ? owner.value.toString()
        : ethers.BigNumber.from(owner.value).toString(),
    }));
    return {
      contractAddress: token.contractAddress,
      tokenId: token.tokenId,
      tokenType: token.tokenType,
      metadata: token.metadata,
      externalDomainViewUrl: token.externalDomainViewUrl,
      alternativeMediaFiles: token.alternativeMediaFiles,
      owners: [...ownerAddresses],
    };
  });
  console.log("Mapped nfts");

  return {
    page: page,
    size: limit,
    total: count,
    nfts: data,
  };
};

export const fetchUserNfts2 = async (
  ownerAddress: string,
  tokenAddress: string,
  tokenType: string,
  searchQuery: string,
  page: number,
  limit: number,
  dataSources: IDataSources
) => {
  const nftFilters = [] as any;
  nftFilters.push({
    "owner.address": ownerAddress,
  });
  if (tokenAddress) {
    nftFilters.push({ contractAddress: tokenAddress });
  }
  if (tokenType) {
    nftFilters.push({ tokenType });
  }

  if (searchQuery) {
    nftFilters.push({
      "metadata.name": { $regex: new RegExp(searchQuery, "i") },
    });
  }
  console.log(nftFilters);
  console.log(limit);
  console.log(page);
  // const data1 = await dataSources.tokenAPI.store.find();
  // console.log("data1:");
  // console.log(data1);

  const mandatoryAggregation = [
    {
      $lookup: {
        from: "nft-token-owners",
        let: {
          tokenId: "$tokenId",
          contractAddress: "$contractAddress",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$tokenId", "$$tokenId"],
                  },
                  {
                    $eq: ["$contractAddress", "$$contractAddress"],
                  },
                ],
              },
            },
          },
        ],
        as: "owner",
      },
    },
    { $unwind: "$owner" },
    { $match: { $and: nftFilters } },
  ];
  const skippedItems = (page - 1) * limit;

  const [data, count] = await Promise.all([
    dataSources.tokenAPI.store.aggregate([
      ...mandatoryAggregation,
      { $skip: skippedItems },
      { $limit: limit },
      { $sort: { updatedAt: -1 } },
    ]),
    dataSources.tokenAPI.store.aggregate([
      ...mandatoryAggregation,
      { $count: "tokenId" },
    ]),
  ]);

  // console.log(data.owner((a: any) => a.owner));
  console.log(data);
  console.log(count);
  console.log(`skip: ${skippedItems}`);

  return {
    page: page,
    size: limit,
    total: !count.length ? 0 : count[0].tokenId,
    nfts: data,
  };
};
