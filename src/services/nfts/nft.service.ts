import { IExecutionParameters } from '../../interfaces';
import { StrategyContext } from '../../strategies';
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
