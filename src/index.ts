import { Request, Response } from "express";
import { fetchNfts } from "./services/query.service";
import { fetchNftsNew } from "./services/query.service.new";

const mongoose = require("mongoose");

require("dotenv").config();

var client: any;

const getClient = async () => {
  const DB_URL = process.env.DB_URL;
  if (!DB_URL) {
    return console.error("Missing MONGODB Connection String !");
  }

  if (client instanceof Promise) {
    console.log("MONGODB CLIENT RECONNECTED!");
  } else if (client) {
    client = await client;
    console.log("MONGODB CLIENT ALREADY CONNECTED!");
  } else {
    try {
      client = await mongoose.connect(DB_URL, {
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

    if (process.env.NODE_ENV === "production") {
      client.disconnect();
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.send(err);
  }
}

if (process.env.NODE_ENV !== "production") {
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
