const mongoose = require('mongoose');

export const NFTCollectionSchema = new mongoose.Schema({
  contractAddress: String,
  tokenType: String,
  createdAtBlock: Number,
  ignoreForRetrieveCreatedAtBlock: Boolean,
  firstProcessedBlock: Number,
  lastProcessedBlock: Number,
  targetBlock: Number,
  sentAt: Date,
  isProcessing: Boolean,
  name: String,
  symbol: String,
  owner: String,
  vip: Boolean,
});

export const NFTCollectionModel = mongoose.model(
  'nft-collections',
  NFTCollectionSchema,
);
