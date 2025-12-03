import mongoose from "mongoose";

export const dbConnection = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb+srv://skillconnect:16FapDsSca9IcpV2@skillconnect4b410.lceuwef.mongodb.net/?appName=Skillconnect4b410/skillconnect";

    if (mongoUri.includes("your-username") || mongoUri.includes("xxxxx")) {
      console.log("⚠️  Please set up your MongoDB database:");
      console.log("1. Go to https://mongodb.com/atlas/database");
      console.log("2. Create a free cluster");
      console.log("3. Get your connection string");
      console.log("4. Replace MONGO_URI in backend/.env");
      console.log("");
      console.log("For now, using local MongoDB...");
    }

    await mongoose.connect(mongoUri, {
      dbName: "skillconnect"
    });
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    console.log("");
    console.log("🔧 To fix this:");
    console.log("1. Install MongoDB locally: https://docs.mongodb.com/manual/installation/");
    console.log("2. Or use MongoDB Atlas: https://mongodb.com/atlas/database");
    console.log("3. Update MONGO_URI in backend/.env file");
    console.log("");
    console.log("Using fallback mode for development...");
    // Don't exit in development, allow the app to continue
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};
