const mongoose = require('mongoose');

export const TokenPriceSchema = new mongoose.Schema({
  symbol: String,
  usd: Number,
  name: String,
});

export const TokenPriceModel = mongoose.model('token-price', TokenPriceSchema);
