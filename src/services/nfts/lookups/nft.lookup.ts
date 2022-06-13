export const getNFTLookup = () => ({
  $lookup: {
    from: "nft-tokens",
    let: {
      // makeTokenId: "$make.assetType.tokenId",
      makeTokenId: "$_id.tokenId",
      //TODO: WE NEED COLLATION INDEX HERE
      // makeContractAddress: "$make.assetType.contract",
      makeContractAddress: "$_id.contract",
    },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              {
                $eq: ["$tokenId", "$$makeTokenId"],
              },
              {
                $eq: ["$contractAddress", "$$makeContractAddress"],
              },
            ],
          },
        },
      },
      {
        $limit: 1,
      },
    ],
    as: "nft",
  },
});
