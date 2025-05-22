import mongoose from "mongoose"
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import path from "path"
import fs from "fs"

// Define __filename and __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

console.log("\x1b[36m=== SST Alumni MongoDB Connection Fix ===\x1b[0m")

// Check if .env file exists
const envPath = path.join(__dirname, ".env")
if (!fs.existsSync(envPath)) {
  console.error("\x1b[31m❌ .env file not found!\x1b[0m")
  process.exit(1)
} else {
  console.log("\x1b[32m✓ .env file exists\x1b[0m")
}

// Check MongoDB connection string
const mongoUri = process.env.MONGODB_URI
if (!mongoUri) {
  console.error("\x1b[31m❌ MONGODB_URI not found in .env file\x1b[0m")
  process.exit(1)
}

console.log("\x1b[36mTesting MongoDB connection...\x1b[0m")

// Connect to MongoDB
mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("\x1b[32m✓ Successfully connected to MongoDB\x1b[0m")

    // Check if collections exist
    const collections = await mongoose.connection.db.listCollections().toArray()
    console.log("\x1b[36mExisting collections:\x1b[0m")

    if (collections.length === 0) {
      console.log("  No collections found. Creating default collections...")

      // Create default collections if they don't exist
      try {
        await mongoose.connection.db.createCollection("users")
        await mongoose.connection.db.createCollection("alumni")
        await mongoose.connection.db.createCollection("academicunits")
        await mongoose.connection.db.createCollection("contacts")
        console.log("\x1b[32m✓ Default collections created\x1b[0m")
      } catch (error) {
        console.error("\x1b[31m❌ Error creating collections:\x1b[0m", error.message)
      }

      // List collections again
      const updatedCollections = await mongoose.connection.db.listCollections().toArray()
      updatedCollections.forEach((collection) => {
        console.log(`  - ${collection.name}`)
      })
    } else {
      collections.forEach((collection) => {
        console.log(`  - ${collection.name}`)
      })
    }

    // Close connection
    await mongoose.connection.close()
    console.log("\x1b[32m✓ Connection closed\x1b[0m")
    console.log("\x1b[36mMongoDB connection test completed successfully.\x1b[0m")
    console.log("\x1b[33mNow start your backend server with: npm run dev\x1b[0m")
  })
  .catch((err) => {
    console.error("\x1b[31m❌ Failed to connect to MongoDB:\x1b[0m", err.message)

    if (err.message.includes("ECONNREFUSED")) {
      console.log("\x1b[33mPossible solutions:\x1b[0m")
      console.log("1. Make sure MongoDB is running")
      console.log("2. Check if the MongoDB connection string is correct")
      console.log("3. Check if MongoDB is accessible from your network")
    }

    process.exit(1)
  })

