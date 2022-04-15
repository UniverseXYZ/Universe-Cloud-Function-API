import { Model, model } from "mongoose";
import { NFTToken, NFTTokensSchema } from "datascraper-schema";

const TokenModel: Model<NFTToken> = model<NFTToken>(
  "Token",
  NFTTokensSchema,
  "nft-tokens"
);
export default TokenModel;
