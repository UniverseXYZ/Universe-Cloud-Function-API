import { IExecutionParameters } from '../../interfaces';
import { StrategyContext, ReservoirStrategyContext } from '../../strategies';
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


/**
 * @param params Query Parameters from the URI
 */
 export const reservoirFetchNfts = async (params: IExecutionParameters) => {
  const strategy = new ReservoirStrategyContext(params);
  return strategy.run(CloudActions.QUERY);
};

/**
 * @param params Query Parameters from the URI
 */
export const reservoirCountNfts = async (params: IExecutionParameters) => {
  const strategy = new ReservoirStrategyContext(params);
  return strategy.run(CloudActions.COUNT);
};

