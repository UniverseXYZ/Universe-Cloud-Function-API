const mongoose = require('mongoose');

export const NFTCollectionAttributesSchema = new mongoose.Schema({
  contractAddress: String,
  attributes: {},
});

export const NFTCollectionAttributesModel = mongoose.model(
  'nft-collection-attributes',
  NFTCollectionAttributesSchema,
);
