import { Request, Response } from "express";
import { fetchNfts } from "./services/query.service";

const mongoose = require("mongoose");

require("dotenv").config();

var client: any;

const getClient = async () => {
  const url = process.env.DB_URL;
  if (client && client.isConnected()) {
    console.log("MONGODB CLIENT ALREADY CONNECTED!");
  } else if (client instanceof Promise) {
    client = await client;
    console.log("MONGODB CLIENT RECONNECTED!");
  } else {
    try {
      client = await mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log("MONGODB CLIENT CONNECTED!");
    } catch (e) {
      throw e;
    }
  }

  return client;
};

export async function queryNfts(req: Request, res: Response) {
  try {
    const client = await getClient();
    console.log(req.query);
    const result = await fetchNfts(
      req.query.ownerAddress,
      req.query.tokenAddress,
      req.query.tokenType,
      req.query.searchQuery,
      req.query.page,
      req.query.limit,
      req.query.side,
      req.query.assetClass,
      req.query.tokenIds,
      req.query.beforeTimestamp,
      req.query.token,
      req.query.minPrice,
      req.query.maxPrice,
      req.query.sortBy,
      req.query.hasOffers
    );

    res.status(200);
    res.send(result);
  } catch (err) {
    res.status(500);
    res.send(err);
  }
}

if (process.env.NODE_ENV !== "production") {
  const express = require("express");
  const app = express();
  const port = 3000;

  app.get("/nftquery", (req, res) => {
    queryNfts(req, res);
  });

  app.listen(port, () => {
    console.log(`Local function is listening on port ${port}`);
  });
}
