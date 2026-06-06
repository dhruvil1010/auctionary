import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

/**
 * Connect to MongoDB.
 * We append DB_NAME to the connection URI so Mongoose uses (and creates, if it
 * doesn't exist yet) a database called "auction". If the connection fails there
 * is no point keeping the server alive, so we exit the process with code 1.
 */
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n✅ MongoDB connected! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("❌ MONGODB connection FAILED: ", error);
    process.exit(1);
  }
};

export default connectDB;
