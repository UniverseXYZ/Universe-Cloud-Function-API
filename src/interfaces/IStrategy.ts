import { IQueryParameters } from "./IQueryParams";

export interface IStrategy {
  execute(params: IQueryParameters);
}
