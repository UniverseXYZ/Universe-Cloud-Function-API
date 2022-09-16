import { constants } from 'ethers';
import config from '../config';

export enum TOKENS {
  ETH = 'ethereum',
  WETH = 'weth',
  DAI = 'dai',
  XYZ = 'universe-xyz',
  USDC = 'usd-coin',
  APE = 'apecoin',
}

export class Utils {
  /**
   * Returns current UTC timestamp in seconds.
   */
  public static getUtcTimestamp() {
    return Math.floor(new Date().getTime() / 1000);
  }

  public static findArrayIntersection(a, b) {
    let t;
    if (b.length > a.length) (t = b), (b = a), (a = t); // indexOf to loop over shorter
    let value = a.filter(function (e) {
      return b.indexOf(e) > -1;
    });
    value = [...new Set(value)];

    return value;
  }

  public static DEV_TOKEN_ADDRESSES: { [key in TOKENS]: string } = {
    [TOKENS.ETH]: constants.AddressZero,
    [TOKENS.WETH]: '0xc778417e063141139fce010982780140aa0cd5ab',
    [TOKENS.DAI]: '0x308a025592d230f997330E45E0D5a705cf8A0556',
    [TOKENS.XYZ]: '0x5F5C23FBf069E6C2B1D778FDE3Ee2FD9FD4A553F',
    [TOKENS.USDC]: '0x81B5Be5957dEAd02105CbDb389a3A7a25Aa925ec',
    [TOKENS.APE]: '0xBBff46A835d95832aD9F519DDCc2Dde0aCc59b29',
  };

  public static PROD_TOKEN_ADDRESSES: { [key in TOKENS]: string } = {
    [TOKENS.ETH]: constants.AddressZero,
    [TOKENS.WETH]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    [TOKENS.DAI]: '0x6b175474e89094c44da98b954eedeac495271d0f',
    [TOKENS.XYZ]: '0x618679dF9EfCd19694BB1daa8D00718Eacfa2883',
    [TOKENS.USDC]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    [TOKENS.APE]: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
  };

  public static TOKEN_DECIMALS: { [key in TOKENS]: number } = {
    [TOKENS.ETH]: 18,
    [TOKENS.WETH]: 18,
    [TOKENS.DAI]: 18,
    [TOKENS.XYZ]: 18,
    [TOKENS.APE]: 18,
    //USDC Rinkeby Token has 18 decimals, mainnet has 6
    [TOKENS.USDC]: config.chain_id === '1' ? 6 : 18,
  };

  public static tokenAddresses =
    config.chain_id === '1'
      ? this.PROD_TOKEN_ADDRESSES
      : this.DEV_TOKEN_ADDRESSES;
}
