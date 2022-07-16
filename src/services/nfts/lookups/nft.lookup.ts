export const getNFTLookup = () => ({
  $lookup: {
    from: 'nft-tokens',
    let: {
      makeTokenId: '$_id.tokenId',
      makeContractAddress: '$_id.contract',
    },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              {
                $eq: ['$tokenId', '$$makeTokenId'],
              },
              {
                $eq: ['$contractAddress', '$$makeContractAddress'],
              },
            ],
          },
        },
      },
      {
        $limit: 1,
      },
    ],
    as: 'nft',
  },
});
