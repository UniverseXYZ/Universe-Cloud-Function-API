import { ethers } from 'ethers';
import { ApiError, ERROR_MESSAGES, HTTP_STATUS_CODES } from '../../../errors';
import { IHistoryParameters } from '../../../interfaces';

export enum SortHistoryOptionsEnum {
  MintedAscending = 1,
  MintedDescending = 2,
  LastTransferredAscending = 3,
  LastTransferredDescending = 4,
}

/**
 * Returns aggregation stages and sorting for the history strategy.
 * @param contractAddress
 * @param historyParams
 * @returns {Object}
 * @throws {ApiError}
 */
export const buildHistoryQueryFilters = (
  contractAddress: string,
  historyParams: IHistoryParameters,
) => {
  if (!ethers.utils.isAddress(contractAddress)) {
    throw new ApiError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_PARAMETER('historySort'),
    );
  }

  const sort = {} as any;
  const filters = {} as any;

  const { historySort } = historyParams;

  filters.contractAddress = ethers.utils.getAddress(
    contractAddress.toLowerCase(),
  );

  const historyAggregation: any = [
    // first stage is $match and it's added later ITT.
    // getting maxBlockNum by grouping by token id.
    {
      $group: {
        _id: {
          contractAddress: '$contractAddress',
          tokenId: '$tokenId',
        },
        maxBlockNum: { $max: '$blockNum' },
      },
    },
    // joining with same table to get transfers in each block for each token id.
    {
      $lookup: {
        from: 'nft-transfer-histories',
        let: {
          tokenId: '$_id.tokenId',
          contractAddress: '$_id.contractAddress',
          maxBlockNum: '$maxBlockNum',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$tokenId', '$$tokenId'],
                  },
                  {
                    $eq: ['$contractAddress', '$$contractAddress'],
                  },
                  {
                    $eq: ['$blockNum', '$$maxBlockNum'],
                  },
                ],
              },
            },
          },
        ],
        as: 'transfersInBlock',
      },
    },
    // getting maxLogIndex for each token id by grouping by token id & maxBlockNum
    {
      $group: {
        _id: {
          contractAddress: '$_id.contractAddress',
          tokenId: '$_id.tokenId',
          maxBlockNum: '$maxBlockNum',
        },
        maxLogIndex: { $max: '$transfersInBlock.logIndex' },
      },
    },
    // probably unnecessary stage
    // {
    //   $lookup: {
    //     from: 'nft-transfer-histories',
    //     let: {
    //       tokenId: '$_id.tokenId',
    //       contractAddress: '$_id.contractAddress',
    //       maxBlockNum: '$_id.maxBlockNum',
    //       maxLogIndex: { $first: '$maxLogIndex' },
    //     },
    //     pipeline: [
    //       {
    //         $match: {
    //           $expr: {
    //             $and: [
    //               {
    //                 $eq: ['$tokenId', '$$tokenId'],
    //               },
    //               {
    //                 $eq: ['$contractAddress', '$$contractAddress'],
    //               },
    //               {
    //                 $eq: ['$blockNum', '$$maxBlockNum'],
    //               },
    //               {
    //                 $eq: ['$logIndex', '$$maxLogIndex'],
    //               },
    //             ],
    //           },
    //         },
    //       },
    //     ],
    //     as: 'transfer',
    //   },
    // },
    {
      $project: {
        tokenId: '$_id.tokenId',
        contractAddress: '$_id.contractAddress',
        maxLogIndex: { $first: '$maxLogIndex' },
      },
    },
  ];

  switch (Number(historySort)) {
    case SortHistoryOptionsEnum.MintedAscending:
      // @TODO: all aggregation steps are redundant in this case
      filters.from = ethers.constants.AddressZero;
      sort['_id.maxBlockNum'] = 1;
      sort['maxLogIndex'] = 1;
      break;
    case SortHistoryOptionsEnum.MintedDescending:
      // @TODO: all aggregation steps are redundant in this case
      filters.from = ethers.constants.AddressZero;
      sort['_id.maxBlockNum'] = -1;
      sort['maxLogIndex'] = -1;
      break;
    case SortHistoryOptionsEnum.LastTransferredAscending:
      sort['_id.maxBlockNum'] = 1;
      sort['maxLogIndex'] = 1;
      break;
    case SortHistoryOptionsEnum.LastTransferredDescending:
      sort['_id.maxBlockNum'] = -1;
      sort['maxLogIndex'] = -1;
      break;
    default:
      throw new ApiError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_PARAMETER('historySort'),
      );
      break;
  }

  historyAggregation.unshift({ $match: filters });

  console.log('HISTORY FILTERS:');
  console.log(historyAggregation);

  return {
    historyAggregation,
    sort,
  };
};
