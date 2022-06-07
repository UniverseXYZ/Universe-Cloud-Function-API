import { IPrice } from "../../interfaces";
import { TokenPriceModel } from "../../models";

/**
 * Fetches all of the available token prices from the Universe Database.
 * It trusts that there will always be accurate info about the prices in the DB
 * @returns tokens: IPrice[]
 */
export const fetchTokenPrices = async () => {
  // We trust that there will always be info about the prices in the DB
  const prices = await TokenPriceModel.find({});
  const pricesData: IPrice[] = prices.map((price) => ({
    coin: price.name,
    value: price.usd,
  }));

  return pricesData;
};
