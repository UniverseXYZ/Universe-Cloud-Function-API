import { OrderSide, AssetClass } from '../../../models';
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
                    $eq: ['$make.assetType.contract', daiPrice],
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
                    $eq: ['$make.assetType.contract', wethPrice],
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
                    $eq: ['$make.assetType.contract', usdcPrice],
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
                    $eq: ['$make.assetType.contract', xyzPrice],
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
                    $eq: ['$take.assetType.contract', daiPrice],
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
                    $eq: ['$take.assetType.contract', wethPrice],
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
                    $eq: ['$take.assetType.contract', usdcPrice],
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
                    $eq: ['$take.assetType.contract', xyzPrice],
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
