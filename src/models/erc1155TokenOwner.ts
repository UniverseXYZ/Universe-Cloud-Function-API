const mongoose = require("mongoose");

export const NFTTokenOwnerSchema = new mongoose.Schema({
  contractAddress: String,
  tokenId: String,
  address: String,
  blockNum: Number,
  logIndex: Number,
  transactionHash: String,
  value: String,
  tokenType: String,
  tokenName: String,
});

export const ERC1155NFTTokenOwnerModel = mongoose.model(
  "nft-erc1155-token-owners",
  NFTTokenOwnerSchema
);
