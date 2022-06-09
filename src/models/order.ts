const mongoose = require("mongoose");

export enum NFTAssetClasses {
  ERC721 = "ERC721",
  ERC1155 = "ERC1155",
  ERC721_BUNDLE = "ERC721_BUNDLE",
}

export enum AssetClass {
  ETH = "ETH",
  USDC = "USDC",
  XYZ = "XYZ",
  DAI = "DAI",
  WETH = "WETH",
  ERC20 = "ERC20",
  ERC721 = "ERC721",
  ERC721_BUNDLE = "ERC721_BUNDLE",
  ERC1155 = "ERC1155",
}

export enum OrderStatus {
  CREATED,
  PARTIALFILLED,
  FILLED,
  CANCELLED,
  STALE,
}

export enum OrderSide {
  BUY,
  SELL,
}
export class Asset {
  value: string; // have to use string for token decimal
}

export class OrderData {
  dataType?: string;
  revenueSplits?: IPart[];
}

export interface IPart {
  account: string;
  value: string;
}

export const OrderSchema = new mongoose.Schema({
  status: Number,
  hash: String,
  type: String,
  side: Number,
  maker: String,
  make: {
    value: String,
    assetType: {
      assetClass: String,
      contract: String,
      tokenId: String,
    },
  },
  taker: String,
  take: {
    value: String,
    assetType: {
      assetClass: String,
      contract: String,
      tokenId: String,
    },
  },
  salt: Number,
  start: Number,
  end: Number,
  data: {
    dataType: String,
    revenueSplits: [{ account: String, value: String }],
  },
  signature: String,
  fill: String,
  makeStock: String,
  makeBalance: String,
  cancelledTxHash: String,
  matchedTxHash: String,
});

export const OrderModel = mongoose.model("marketplace-orders", OrderSchema);
