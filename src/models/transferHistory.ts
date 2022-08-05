const mongoose = require('mongoose');

export const NFTTransferHistorySchema = new mongoose.Schema({
  contractAddress: String,
  tokenId: String,
  hash: String,
  blockNum: Number,
  logIndex: Number,
  createdAt: Date,
  category: String,
  from: String,
  to: String,
  updatedAt: Date,
  erc721TokenId: String,
});

export const TransferHistoryModel = mongoose.model(
  'nft-transfer-histories',
  NFTTransferHistorySchema,
);
