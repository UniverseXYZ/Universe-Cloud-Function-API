import {
  AssetClass,
  OrderModel,
  OrderSide,
  OrderStatus,
  TokenModel,
} from '../../models';
import { Utils } from '../../utils';

/**
 * Returns active SELL bundle orders that contain passed tokens.
 * The returning bundles are not limited to the passed tokens and may have other
 * tokens within the order.
 * @param tokens  - array of tokens returned by TokenModel.find()/.aggregate().
 * @returns {Array}
 */
export const getBundleOrdersByTokens = async (tokens) => {
  const value = [];

  if (!tokens.length) {
    return [];
  }

  const utcTimestamp = Utils.getUtcTimestamp();

  const contractsTokensMap = {};
  tokens.forEach((token) => {
    if (
      contractsTokensMap.hasOwnProperty(token.contractAddress.toLowerCase())
    ) {
      contractsTokensMap[token.contractAddress.toLowerCase()].push(
        token.tokenId,
      );
    } else {
      contractsTokensMap[token.contractAddress.toLowerCase()] = [token.tokenId];
    }
  });

  const bundleOrders = await OrderModel.find({
    $and: [
      { side: OrderSide.SELL },
      { status: OrderStatus.CREATED },
      { 'make.assetType.assetClass': AssetClass.ERC721_BUNDLE },
      { $or: [{ start: { $lt: utcTimestamp } }, { start: 0 }] },
      { $or: [{ end: { $gt: utcTimestamp } }, { end: 0 }] },
      {
        'make.assetType.contracts': {
          $in: Object.keys(contractsTokensMap),
        },
      },
    ],
  });

  bundleOrders.forEach((bundleOrder) => {
    // "contracts" and "tokenIds" magically disapear from bundleOrder.make.assetType!
    // I cannot explain that, try it yourself:
    // console.log(bundleOrder.make.assetType)
    // console.log(bundleOrder.make.assetType.contracts)
    // console.log(bundleOrder.make.assetType.tokenIds)
    bundleOrder = JSON.parse(JSON.stringify(bundleOrder));

    for (let i = 0; i < bundleOrder.make.assetType.contracts.length; i++) {
      if (
        contractsTokensMap.hasOwnProperty(
          bundleOrder.make.assetType.contracts[i],
        ) &&
        Utils.findArrayIntersection(
          contractsTokensMap[bundleOrder.make.assetType.contracts[i]],
          bundleOrder.make.assetType.tokenIds[i],
        ).length
      ) {
        value.push(bundleOrder);
        break;
      }
    }
  });

  return value;
};
