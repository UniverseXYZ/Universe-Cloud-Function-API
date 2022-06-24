const mongoose = require('mongoose');

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

export const NFTTokenOwnerModel = mongoose.model(
  'nft-token-owners',
  NFTTokenOwnerSchema,
);
