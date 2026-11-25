/* eslint-disable @typescript-eslint/no-require-imports -- plain Node script: `node test-mongo.js` */
const mongoose = require("mongoose");
require("dotenv").config();

async function test() {
  try {
    console.log("Testing connection...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 1,
    });
    console.log("✅ Connected successfully!");
    console.log("Database:", mongoose.connection.db.databaseName);
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Connection failed:");
    console.error(err.message);
    process.exit(1);
  }
}

test();
