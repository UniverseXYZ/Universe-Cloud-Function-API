import fetch from "node-fetch";
import { TokenPriceModel } from "../models/tokenPrice";
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

  // const pricePromises = coinIds.map(async (id: any) => {
  //   const response = await fetch(
  //     `${baseURL}price?ids=${encodeURIComponent(id)}&vs_currencies=usd`
  //   );
  //   const priceData = (await response.json()) as any;

  //   const price: IPrice = {
  //     coin: id,
  //     value: priceData[id]?.usd,
  //   };
  //   return price;
  // });

  // const pricesData: IPrice[] = await Promise.all(pricePromises);
  // return pricesData;
};
