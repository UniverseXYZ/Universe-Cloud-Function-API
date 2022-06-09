// Lookup to join the document representing the owner of the nft from nft-token-owners
export const getNFTOwnersLookup = () => ({
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
});
