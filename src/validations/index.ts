import { IExecutionParameters, TokenType } from "../interfaces";
import {
  ApiError,
  ERROR_MESSAGES,
  HTTP_STATUS_CODES,
  PositiveNumberValidationError,
  ValidationError,
} from "../errors";
import { ethers } from "ethers";
import { OrderSide, NFTAssetClasses } from "../models";

export enum CloudActions {
  QUERY = "query",
  COUNT = "count",
}

export const validateRequiredParameters = (params: IExecutionParameters) => {
  const { action } = params;
  if (action !== CloudActions.COUNT && action !== CloudActions.QUERY) {
    throw new ValidationError("action");
  }
};

export const validateNftParameters = (params: IExecutionParameters) => {
  const {
    tokenType,
    assetClass,
    beforeTimestamp,
    buyNow,
    contractAddress,
    hasOffers,
    limit,
    minPrice,
    maxPrice,
    ownerAddress,
    page,
    searchQuery,
    side,
    sortBy,
    tokenAddress,
    tokenIds,
    traits,
  } = params;

  if (beforeTimestamp && !isValidPositiveIntParam(beforeTimestamp)) {
    throw new PositiveNumberValidationError("beforeTimestamp");
  }

  if (limit && !isValidPositiveIntParam(limit)) {
    throw new PositiveNumberValidationError("limit");
  }

  if (maxPrice && !isValidPositiveIntParam(maxPrice)) {
    throw new PositiveNumberValidationError("maxPrice");
  }

  if (minPrice && !isValidPositiveIntParam(maxPrice)) {
    throw new PositiveNumberValidationError("minPrice");
  }

  if (page && !isValidPositiveIntParam(page)) {
    throw new PositiveNumberValidationError("page");
  }

  if (sortBy && !isValidPositiveIntParam(sortBy)) {
    throw new ValidationError("sortBy");
  }

  if (ownerAddress && !isValidContractAddress(ownerAddress)) {
    throw new ValidationError("ownerAddress");
  }

  if (contractAddress && !isValidContractAddress(contractAddress)) {
    throw new ValidationError("contractAddress");
  }

  if (tokenAddress && !isValidContractAddress(tokenAddress)) {
    throw new ValidationError("tokenAddress");
  }

  //TODO: Think of validation about this
  if (searchQuery && false) {
    throw new ValidationError("page");
  }

  if (
    side &&
    Number(side) !== OrderSide.SELL &&
    Number(side) !== OrderSide.BUY
  ) {
    throw new ValidationError("side");
  }

  if (tokenType && !Object.values(TokenType).includes(tokenType)) {
    throw new ValidationError("tokenType");
  }

  if (
    assetClass &&
    !Object.values(NFTAssetClasses).includes(assetClass as NFTAssetClasses)
  ) {
    throw new ValidationError("assetClass");
  }

  // if (buyNow && buyNow !== "true") {
  //   throw new ValidationError("buyNow");
  // }

  if (hasOffers && hasOffers !== "true") {
    throw new ValidationError("hasOffers");
  }

  if (tokenIds) {
    const ids = tokenIds.split(",");
    ids.forEach((id) => {
      if (!isValidPositiveIntParam(id)) {
        throw new PositiveNumberValidationError("tokenIds");
      }
    });
  }

  // In order to be able to perform a search in the collection-attributes table we need the contract address and traits
  const attributePairs = (traits || "").split(",");
  const hasinvalidTraitParams =
    !!traits && !!attributePairs.length && !contractAddress;

  if (hasinvalidTraitParams) {
    throw new ApiError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.ATTRIBUTE_CONTRACT_ADDRESS_REQUIRED
    );
  }

  if (contractAddress && traits && attributePairs.length > 0) {
    for (const attributeKVP of attributePairs) {
      let [attribute, trait] = attributeKVP.split(":");

      if (!attribute || !attribute.trim() || !trait || !trait.trim()) {
        throw new ApiError(
          HTTP_STATUS_CODES.BAD_REQUEST,
          ERROR_MESSAGES.INVALID_ATTRIBUTE_TRAIT_PAIR
        );
      }
    }
  }
};

export const validateCountParameters = (params: IExecutionParameters) => {
  const { ownerAddress, contractAddress } = params;

  if (!ownerAddress && !contractAddress) {
    throw new ApiError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      `ownerAddress or contractAddress parameter is required`
    );
  }

  if (ownerAddress && contractAddress) {
    throw new ApiError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      `Combination of ownerAddress and contractAddress parameters isn't allowed`
    );
  }

  if (ownerAddress && !isValidContractAddress(ownerAddress)) {
    throw new ValidationError("ownerAddress");
  }

  if (contractAddress && !isValidContractAddress(contractAddress)) {
    throw new ValidationError("contractAddress");
  }
};

export const isValidPositiveIntParam = (parameter: string) => {
  return !(
    isNaN(Number(parameter)) ||
    !Number.isInteger(Number(parameter)) ||
    Number(parameter) <= 0
  );
};

export const isValidContractAddress = (parameter: string) => {
  return ethers.utils.isAddress(parameter);
};
