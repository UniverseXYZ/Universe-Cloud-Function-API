import { IQueryParameters, IStrategy } from "../../../interfaces";
import { ApiError, ERROR_MESSAGES } from "../../../errors";
// The context defines the interface of interest to clients.
export class StrategyContext {
  // The context maintains a reference to one of the strategy
  // objects. The context doesn't know the concrete class of a
  // strategy. It should work with all strategies via the
  // strategy interface.
  private strategy: IStrategy;

  // Usually the context accepts a strategy through the
  // constructor, and also provides a setter so that the
  // strategy can be switched at runtime.
  public setStrategy(strategy: IStrategy) {
    this.strategy = strategy;
  }

  // The context delegates some work to the strategy object
  // instead of implementing multiple versions of the
  // algorithm on its own.
  public executeStrategy(parameters: IQueryParameters) {
    if (!this.strategy) {
      throw new ApiError(400, ERROR_MESSAGES.STRATEGY_NOT_SET);
    }

    return this.strategy.execute(parameters);
  }
}
