import { RESTDataSource } from "apollo-datasource-rest";
import DataLoader from "dataloader";
import { IPrice } from "../types";

export default class PriceAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = "https://api.coingecko.com/api/v3/simple/price?ids=";
  }

  private priceLoader = new DataLoader(async (coinIds) => {
    // console.log(coinIds);

    const pricePromises = coinIds.map(async (id: any) => {
      const priceData = await this.get(
        `price?ids=${encodeURIComponent(id)}&vs_currencies=usd`
      );
      const price: IPrice = {
        coin: id,
        value: priceData[id]?.usd,
      };
      return price;
    });

    const pricesData: IPrice[] = await Promise.all(pricePromises);
    return pricesData;
  });

  public getPrices = async (coinIds: string[]) => {
    const pricePromises = coinIds.map(async (id: any) => {
      const priceData = await this.get(
        `price?ids=${encodeURIComponent(id)}&vs_currencies=usd`
      );
      const price: IPrice = {
        coin: id,
        value: priceData[id]?.usd,
      };
      return price;
    });

    const pricesData: IPrice[] = await Promise.all(pricePromises);
    return pricesData;
  };

  async getPrice(id: string) {
    return this.priceLoader.load(id);
  }

  // Leave this here for a Demo of not using batching
  // async getPrice(coinId: string): Promise<Iprice> {
  //     console.log(coinId);
  //     try {
  //         const priceData = await this.get(`price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd`);
  //         const price: Iprice = {
  //             coin: coinId,
  //             value: priceData[coinId]?.usd
  //         }
  //         console.log(price);

  //         return price;
  //     } catch(e) {
  //         console.log(e);
  //         return {} as Iprice;
  //     }
  // }
}

// ethereum
// return axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
