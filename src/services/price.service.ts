import fetch from "node-fetch";

interface IPrice {
  coin: string;
  value: number;
}

const baseURL = "https://api.coingecko.com/api/v3/simple/price?ids=";

export const getPrices = async (coinIds: string[]) => {
  const pricePromises = coinIds.map(async (id: any) => {
    const response = await fetch(
      `${baseURL}price?ids=${encodeURIComponent(id)}&vs_currencies=usd`
    );
    const priceData = (await response.json()) as any;

    const price: IPrice = {
      coin: id,
      value: priceData[id]?.usd,
    };
    return price;
  });

  const pricesData: IPrice[] = await Promise.all(pricePromises);
  return pricesData;
};
