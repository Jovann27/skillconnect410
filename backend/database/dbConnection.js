import mongoose from "mongoose";
import logger from "../utils/logger.js";

export const dbConnection = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb+srv://skillconnect:16FapDsSca9IcpV2@skillconnect4b410.lceuwef.mongodb.net/?appName=Skillconnect4b410/skillconnect";

    if (mongoUri.includes("your-username") || mongoUri.includes("xxxxx")) {
      logger.info("⚠️  Please set up your MongoDB database:");
      logger.info("1. Go to https://mongodb.com/atlas/database");
      logger.info("2. Create a free cluster");
      logger.info("3. Get your connection string");
      logger.info("4. Replace MONGO_URI in backend/.env");
      logger.info("");
      logger.info("For now, using local MongoDB...");
    }

    await mongoose.connect(mongoUri, {
      dbName: "skillconnect"
    });
    logger.info("✅ Database connected successfully");
  } catch (err) {
    logger.error("❌ Database connection failed:", err.message);
    logger.info("");
    logger.info("🔧 To fix this:");
    logger.info("1. Install MongoDB locally: https://docs.mongodb.com/manual/installation/");
    logger.info("2. Or use MongoDB Atlas: https://mongodb.com/atlas/database");
    logger.info("3. Update MONGO_URI in backend/.env file");
    logger.info("");
    logger.info("Using fallback mode for development...");
    // Don't exit in development, allow the app to continue
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};
