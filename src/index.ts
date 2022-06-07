import { Request, Response } from "express";
import { fetchNfts } from "./services/nft/nft.service";
import config from "./config";
import { getDBClient } from "./database";

/** This is the entry point of the Cloud Function.
 * The name of the function shouldn't change because it also changes
 * the endpoint of the deployed Cloud Function
 */
export async function queryNfts(req: Request, res: Response) {
  res.set("Access-Control-Allow-Origin", "*");

  try {
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
    res.status(500);
    res.send(err);
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
