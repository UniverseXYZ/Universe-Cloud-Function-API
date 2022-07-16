import {
  IExecutionParameters,
  IQueryParameters,
  TokenType,
} from '../../interfaces';

import {
  hasNftParamsOnly,
  hasOrderParamsOnly,
  hasOwnerParamsOnly,
} from './helpers/nft.helpers';

import { buildGeneralParams } from './builders';

import {
  NftOrderStrategy,
  NftOwnerOrderStrategy,
  NftOwnerStrategy,
  NftStrategy,
  OrderStrategy,
  OwnerOrderStrategy,
  OwnerStrategy,
  StrategyContext,
} from '../../strategies';
import { NFTTokenOwnerModel, TokenModel } from '../../models';
import { utils } from 'ethers';
import { CloudActions } from '../../validations';

/**
 * @param params Query Parameters from the URI
 */
export const fetchNfts = async (params: IExecutionParameters) => {
  const strategy = new StrategyContext(params);
  return strategy.run(CloudActions.QUERY);
};

/**
 * @param params Query Parameters from the URI
 */
export const countNfts = async (params: IExecutionParameters) => {
  const strategy = new StrategyContext(params);
  return strategy.run(CloudActions.COUNT);
};
