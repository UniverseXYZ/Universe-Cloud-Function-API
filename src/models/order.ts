import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Model, model } from "mongoose";

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

@Schema({ timestamps: true, collection: "marketplace-orders" })
export class Order {
  @Prop({ trim: true, required: true, enum: OrderStatus })
  status: number;

  @Prop({ trim: true })
  hash: string;

  @Prop({ trim: true })
  type: string;

  @Prop({ trim: true, required: true, enum: OrderSide })
  side: number;

  @Prop({ trim: true, required: true })
  maker: string;

  @Prop({ type: Asset, trim: true, required: true })
  make: Asset;

  @Prop({ trim: true, required: true })
  taker: string;

  @Prop({ trim: true, required: true })
  take: Asset;

  @Prop({ trim: true, required: true })
  salt: number;

  @Prop({ trim: true, required: true })
  start: number;

  @Prop({ trim: true, required: true })
  end: number;

  @Prop({ type: OrderData, trim: true, required: true })
  data: OrderData;

  @Prop({ trim: true, required: true })
  signature: string;

  @Prop({ trim: true })
  fill: string;

  @Prop({ trim: true })
  makeStock: string;

  @Prop({ trim: true })
  makeBalance: string;

  @Prop({ trim: true })
  cancelledTxHash: string;

  @Prop({ trim: true })
  matchedTxHash: string;
}

type OrderDocument = Order & Document;

const OrderSchema = SchemaFactory.createForClass(Order);

const OrderModel: Model<Order> = model<Order>(
  "Order",
  OrderSchema as any,
  "marketplace-orders"
);

export { OrderDocument, OrderSchema, OrderModel };
