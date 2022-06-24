const mongoose = require('mongoose');

export const NFTTokenSchema = new mongoose.Schema({
  contractAddress: String,
  tokenId: String,
  tokenType: String,
  externalDomainViewUrl: String,
  metadata: {},
  firstOwner: String,
  metadataFetchError: String,
  processingSentAt: Date,
  sentAt: Date,
  sentForMediaAt: Date,
  alternativeMediaFiles: [{ url: String, type: String }],
  needToRefresh: Boolean,
  source: String,
});

export const TokenModel = mongoose.model('nft-tokens', NFTTokenSchema);
