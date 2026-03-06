import { MongoClient } from "mongodb";

let client;

export const getDb = () => {
  if (!client) {
    throw new Error("MongoDB client not initialized. Call connectMongo() first.");
  }
  const dbName = process.env.MONGO_DB_NAME || "harmony_health_finance";
  return client.db(dbName);
};

export const connectMongo = async () => {
  if (client) return client;

  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
  client = new MongoClient(uri);
  await client.connect();
  return client;
};
