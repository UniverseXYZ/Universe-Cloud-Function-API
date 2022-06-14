import { IOwnerParameters } from "../../interfaces";
import { NFTTokenOwnerModel, ERC1155NFTTokenOwnerModel } from "../../models";

export const buildOwnerQuery = (
  ownerParams: IOwnerParameters,
  tokenType: string,
  skip = 0,
  limit = 0
) => {
  const filters = [] as any;
  const limitFilters = [] as any;
  filters.push({
    address: ownerParams.ownerAddress,
  });

  if (skip) {
    limitFilters.push({ $skip: skip });
  }
  
  if (limit) {
    limitFilters.push({ $limit: limit });
  }
  
  const finalFilters = { $and: filters };

  switch (tokenType) {
    case "ERC721":
      return NFTTokenOwnerModel.aggregate(
        [{ $match: finalFilters }, ...limitFilters],
        { collation: { locale: "en", strength: 2 } }
      );
    case "ERC1155":
      return ERC1155NFTTokenOwnerModel.aggregate(
        [{ $match: finalFilters }, ...limitFilters],
        { collation: { locale: "en", strength: 2 } }
      );
    default:
      return NFTTokenOwnerModel.aggregate(
        [
          {
            $unionWith: {
              coll: "nft-erc1155-token-owners",
              pipeline: [],
            },
          },
          { $match: finalFilters },
          ...limitFilters,
        ],
        { collation: { locale: "en", strength: 2 } }
      );
  }
};

export const getOwnersByTokens = async (tokens, tokenType: string = "") => {
  const query = {
    $or: tokens.map((token) => ({
      contractAddress: token.contractAddress,
      tokenId: token.tokenId,
    })),
  };

  switch (tokenType) {
    case "ERC721":
      return NFTTokenOwnerModel.aggregate([{ $match: query }], {
        collation: { locale: "en", strength: 2 },
      });
    case "ERC1155":
      return ERC1155NFTTokenOwnerModel.aggregate([{ $match: query }], {
        collation: { locale: "en", strength: 2 },
      });
    default:
      return NFTTokenOwnerModel.aggregate(
        [
          {
            $unionWith: {
              coll: "nft-erc1155-token-owners",
              pipeline: [],
            },
          },
          { $match: query },
        ],
        { collation: { locale: "en", strength: 2 } }
      );
  }
};
