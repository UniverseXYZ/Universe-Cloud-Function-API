import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

const DATABASE_URL = process.env.DATASCRAPER_DATABASE_URL || "";

export const connectDatascraperDB = async () => {
  try {
    await mongoose.connect(DATABASE_URL);
    console.error("Connection to Datascraper DB success");
  } catch (error) {
    console.error("Connection to Datascraper DB failed");
  }
};

const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection failed"));

const mongoClient = db.getClient();

export default mongoClient;
