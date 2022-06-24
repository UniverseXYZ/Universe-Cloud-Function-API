import { constants } from '../../../constants';
import { IGeneralParameters } from '../../../interfaces';

export const buildGeneralParams = (
  page: number,
  limit: number,
): IGeneralParameters => {
  const generalParams = {
    page: Number(page) > 0 ? Math.floor(Number(page)) : 1,
    limit:
      Number(limit) > 0 &&
      Math.floor(Number(limit)) <= constants.QUERY_SIZE_LIMIT
        ? Number(limit)
        : constants.DEFAULT_QUERY_SIZE,
  } as any;

  generalParams.skippedItems =
    (Number(generalParams.page) - 1) * Number(generalParams.limit);

  return generalParams;
};
