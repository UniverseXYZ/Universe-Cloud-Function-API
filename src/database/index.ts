const mongoose = require("mongoose");
import config from "../config";

var client: any;

/**
 * Reuses the existing DB connections. If none is available, connects to the database
 * @returns Mongoose (MongoDB) Client
 */
export const getDBClient = async () => {
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
