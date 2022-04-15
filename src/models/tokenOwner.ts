import { Model, model } from "mongoose";
import {
  NFTToken,
  NFTTokenOwner,
  NFTTokenOwnerSchema,
  NFTTokensSchema,
} from "datascraper-schema";

const TokenOwnersModel: Model<NFTTokenOwner> = model<NFTTokenOwner>(
  "TokenOwner",
  NFTTokenOwnerSchema,
  "nft-token-owners"
);
export default TokenOwnersModel;
