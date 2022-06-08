import { Request, Response } from "express";
import { fetchNfts } from "./services/nft/nft.service";
import config from "./config";
import { getDBClient } from "./database";
import {
  ERROR_MESSAGES,
  ValidationError,
  PositiveNumberValidationError,
} from "./errors";
import { IExecutionParameters, TokenType } from "./interfaces";
import { AssetClass, OrderSide } from "./models";
import { ethers } from "ethers";

/** This is the entry point of the Cloud Function.
 * The name of the function shouldn't change because it also changes
 * the endpoint of the deployed Cloud Function
 */
export async function queryNfts(req: Request, res: Response) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Content-Type", "application/json");

  try {
    validateParameters(req.query);

    console.time("service-execution-time");
    console.time("db-connection-time");
    const client = await getDBClient();
    console.timeEnd("db-connection-time");
    console.log(req.query);
    const result = await fetchNfts(req.query);

    res.status(200);
    res.send(result);

    console.timeEnd("service-execution-time");

    if (config.node_env === "production") {
      client.disconnect();
      console.log("Disconnected from DB");
    }
  } catch (err) {
    console.log(err);
    res.status(err.statusCode || 500).send({
      status: err.statusCode || 500,
      message: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
    });
  }
}

/**  In order to allow for an easier development and debugging experience
we spin up an express server with a single endpoint
mimicking the behaviour of the cloud function endpoint
*/
if (config.node_env !== "production") {
  const express = require("express");
  const app = express();
  const port = 3000;

  app.get("/queryNfts", (req, res) => {
    queryNfts(req, res);
  });

  app.listen(port, () => {
    console.log(`Local function is listening on port ${port}`);
  });
}

const validateParameters = (params: IExecutionParameters) => {
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
    !Object.values(AssetClass).includes(assetClass as AssetClass)
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
};

const isValidPositiveIntParam = (parameter: string) => {
  return !(
    isNaN(Number(parameter)) ||
    !Number.isInteger(Number(parameter)) ||
    Number(parameter) <= 0
  );
};

const isValidContractAddress = (parameter: string) => {
  return ethers.utils.isAddress(parameter);
};
