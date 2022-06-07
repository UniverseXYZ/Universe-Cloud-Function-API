import { TokenPriceModel } from "../../models/tokenPrice";
interface IPrice {
  coin: string;
  value: number;
}

export const getPrices = async () => {
  // We trust that there will always be info about the prices in the DB
  const prices = await TokenPriceModel.find({});
  const pricesData: IPrice[] = prices.map((price) => ({
    coin: price.name,
    value: price.usd,
  }));

  return pricesData;
};
