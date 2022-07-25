import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const DBhandler = async () => {
  const mongod = await MongoMemoryServer.create();
  return {
    start: async () => {
      await mongoose.connect(mongod.getUri());
    },
    stop: async () => mongod.stop(),
  };
};
