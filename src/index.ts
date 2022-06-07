import { Request, Response } from "express";
import { fetchNftsNew } from "./services/nft/nft.service";
import config from "./config";

const mongoose = require("mongoose");

var client: any;

const getClient = async () => {
  if (!config.db_url) {
    return console.error("Missing MONGODB Connection String !");
  }

  if (client && mongoose.connection.readyState === 1) {
    console.log("MONGODB CLIENT ALREADY CONNECTED!");
  } else if (
    client instanceof Promise ||
    mongoose.connection.readyState === 2
  ) {
    client = await client;
    console.log("MONGODB CLIENT RECONNECTED!");
  } else {
    try {
      client = await mongoose.connect(config.db_url, {
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
  res.set("Access-Control-Allow-Origin", "*");

  try {
    console.time("service-execution-time");
    console.time("db-connection-time");
    const client = await getClient();
    console.timeEnd("db-connection-time");
    console.log(req.query);
    const result = await fetchNftsNew(req.query);

    res.status(200);
    res.send(result);

    console.timeEnd("service-execution-time");

    // if (config.node_env === "production") {
    //   client.disconnect();
    // }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.send(err);
  }
}

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
