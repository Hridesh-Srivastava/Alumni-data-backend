// This script helps diagnose common backend issues
import mongoose from "mongoose";
import http from "http";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Define __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

console.log("\x1b[36m=== HSST Alumni Backend Diagnostics ===\x1b[0m");

// Check if .env file exists
const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  console.error("\x1b[31m❌ .env file not found!\x1b[0m");
} else {
  console.log("\x1b[32m✓ .env file exists\x1b[0m");

  // Check required environment variables
  const requiredVars = ["PORT", "MONGODB_URI", "JWT_SECRET"];
  const missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error(`\x1b[31m❌ Missing environment variables: ${missingVars.join(", ")}\x1b[0m`);
  } else {
    console.log("\x1b[32m✓ All required environment variables are set\x1b[0m");
  }
}

// Check MongoDB connection
console.log("\n\x1b[36mTesting MongoDB connection...\x1b[0m");
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("\x1b[32m✓ Successfully connected to MongoDB\x1b[0m");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("\x1b[31m❌ Failed to connect to MongoDB:\x1b[0m", err.message);
  });

// Check if port is available
const port = process.env.PORT || 5000;
const testServer = http.createServer();

testServer.once("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\x1b[31m❌ Port ${port} is already in use. Another server might be running.\x1b[0m`);
  } else {
    console.error("\x1b[31m❌ Error checking port availability:\x1b[0m", err.message);
  }
});

testServer.once("listening", () => {
  console.log(`\x1b[32m✓ Port ${port} is available\x1b[0m`);
  testServer.close();
});

testServer.listen(port);

// Check Node.js version
const nodeVersion = process.version;
console.log(`\n\x1b[36mNode.js version: ${nodeVersion}\x1b[0m`);
const majorVersion = Number.parseInt(nodeVersion.slice(1).split(".")[0], 10);
if (majorVersion < 14) {
  console.warn("\x1b[33m⚠️ Node.js version is below 14. Consider upgrading for better performance and features.\x1b[0m");
} else {
  console.log("\x1b[32m✓ Node.js version is sufficient\x1b[0m");
}

console.log("\n\x1b[36mDiagnostics complete. Check the results above for any issues.\x1b[0m");