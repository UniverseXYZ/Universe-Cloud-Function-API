import { OrderSide, AssetClass, OrderStatus } from '../../../models';
import { Utils, TOKENS } from '../../../utils';
import { fetchTokenPrices } from '../../token-prices/token-price.service';

export const addEndSortingAggregation = () => {
  // We want to show orders with offers in ascending order but also show offers without offers at the end
  return [
    {
      $addFields: {
        orderSort: {
          $switch: {
            branches: [
              {
                case: {
                  $eq: ['$end', 0],
                },
                // Workaround which is safe to use until year 2255
                then: Number.MAX_SAFE_INTEGER,
              },
            ],
            default: '$end',
          },
        },
      },
    },
  ];
};

export const addPriceSortingAggregation = async (orderSide: OrderSide) => {
  const [
    { value: ethPrice },
    { value: wethPrice },
    { value: daiPrice },
    { value: usdcPrice },
    { value: xyzPrice },
  ] = await fetchTokenPrices();

  console.log(`ETH Price: ${ethPrice}`);
  console.log(`USDC Price: ${usdcPrice}`);
  console.log(`XYZ Price: ${xyzPrice}`);
  console.log(`DAI Price: ${daiPrice}`);
  console.log(`WETH Price: ${wethPrice}`);

  if (orderSide === OrderSide.BUY) {
    return [
      {
        $addFields: {
          usd_value: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ['$make.assetType.assetClass', AssetClass.ETH],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: '$make.value' },
                      Math.pow(10, Utils.TOKEN_DECIMALS[TOKENS.ETH]) * ethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ['$make.assetType.contract', Utils.tokenAddresses.dai],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: '$make.value' },
                      Math.pow(10, Utils.TOKEN_DECIMALS[TOKENS.DAI]) * daiPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: [
                      '$make.assetType.contract',
                      Utils.tokenAddresses.weth,
                    ],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: '$make.value' },
                      Math.pow(10, Utils.TOKEN_DECIMALS[TOKENS.WETH]) *
                        wethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: [
                      '$make.assetType.contract',
                      Utils.tokenAddresses['usd-coin'],
                    ],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: '$make.value' },
                      Math.pow(10, Utils.TOKEN_DECIMALS[TOKENS.USDC]) *
                        usdcPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: [
                      '$make.assetType.contract',
                      Utils.tokenAddresses['universe-xyz'],
                    ],
                  },
                  then: {
                    $divide: [
                      { $toDecimal: '$make.value' },
                      Math.pow(10, Utils.TOKEN_DECIMALS[TOKENS.XYZ]) * xyzPrice,
                    ],
                  },
                },
              ],
              default: 0,
            },
          },
        },
      },
    ];
  } else {
    return [
      {
        $addFields: {
          usd_value: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ['$take.assetType.assetClass', AssetClass.ETH],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: '$take.value' },
                          { $pow: [10, Utils.TOKEN_DECIMALS[TOKENS.ETH]] },
                        ],
                      },
                      ethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: ['$take.assetType.contract', Utils.tokenAddresses.dai],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: '$take.value' },
                          { $pow: [10, Utils.TOKEN_DECIMALS[TOKENS.DAI]] },
                        ],
                      },
                      daiPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: [
                      '$take.assetType.contract',
                      Utils.tokenAddresses.weth,
                    ],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: '$take.value' },
                          { $pow: [10, Utils.TOKEN_DECIMALS[TOKENS.WETH]] },
                        ],
                      },
                      wethPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: [
                      '$take.assetType.contract',
                      Utils.tokenAddresses['usd-coin'],
                    ],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: '$take.value' },
                          { $pow: [10, Utils.TOKEN_DECIMALS[TOKENS.USDC]] },
                        ],
                      },
                      usdcPrice,
                    ],
                  },
                },
                {
                  case: {
                    $eq: [
                      '$take.assetType.contract',
                      Utils.tokenAddresses['universe-xyz'],
                    ],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $toDecimal: '$take.value' },
                          { $pow: [10, Utils.TOKEN_DECIMALS[TOKENS.XYZ]] },
                        ],
                      },
                      xyzPrice,
                    ],
                  },
                },
              ],
              default: 0,
            },
          },
        },
      },
    ];
  }
};

export const recentlyListedAggregation = async (timestamp: number) => {
  return [
    {
      $addFields: {
        active: {
          $cond: {
            if: {
              $and: [
                {
                  $in: [
                    '$status',
                    [OrderStatus.CREATED, OrderStatus.PARTIALFILLED],
                  ],
                },
                {
                  $or: [{ $lt: ['$start', timestamp] }, { $eq: ['$start', 0] }],
                },
                {
                  $or: [{ $gt: ['$end', timestamp] }, { $eq: ['$end', 0] }],
                },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
  ];
};
