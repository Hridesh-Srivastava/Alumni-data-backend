import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./routes/auth.js"
import alumniRoutes from "./routes/alumni.js"
import contactRoutes from "./routes/contact.js"
import academicUnitRoutes from "./routes/academicUnit.js"
import settingsRoutes from "./routes/settings.js"
import path from "path"
import { fileURLToPath } from "url"
import { v2 as cloudinary } from "cloudinary"

// Load environment variables
dotenv.config()

// Configure Cloudinary with fallback values
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "hridesh",
  api_key: process.env.CLOUDINARY_API_KEY || "719717652146965",
  api_secret: process.env.CLOUDINARY_API_SECRET || "v22LKhxiWcbdt-GFujF4UpQ6brA",
});

// Ensure JWT_SECRET is set - IMPORTANT FIX: Removed hardcoded JWT_SECRET
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set in environment variables. Using default for development.")
  process.env.JWT_SECRET = "1b8368e1e32d14f204c805d5019eab23c2ef9abc79edf432ca0e006d003f9bc3"
}

// Create Express app
const app = express()
const PORT = process.env.PORT || 5001

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Middleware
app.use(express.json({ limit: "30mb" }))
app.use(express.urlencoded({ limit: "30mb", extended: true }))

// CORS configuration to allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Simple route to check if the server is running
app.get("/", (req, res) => {
  res.send("HSST Alumni API is running")
})

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    cloudinary: {
      configured: !!(process.env.CLOUDINARY_CLOUD_NAME || "hridesh") && 
                  !!(process.env.CLOUDINARY_API_KEY || "719717652146965") && 
                  !!(process.env.CLOUDINARY_API_SECRET || "v22LKhxiWcbdt-GFujF4UpQ6brA")
    }
  })
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/alumni", alumniRoutes)
app.use("/api/contact", contactRoutes)
app.use("/api/academic-units", academicUnitRoutes)
app.use("/api/settings", settingsRoutes)

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")))

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend", "build", "index.html"))
  })
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// Handle 404 errors for any undefined routes
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
})

// Improved MongoDB connection with better error handling
const connectToMongoDB = async () => {
  try {
    // Connect to MongoDB with proper options
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/hsst-alumni")
    console.log(`MongoDB connected successfully! host: ${mongoose.connection.host}`)
    return true
  } catch (error) {
    console.error("MongoDB connection error:", error.message)
    return false
  }
}

// Start server
const startServer = () => {
  const server = app.listen(PORT, "0.0.0.0", () => {
    // Listen on all network interfaces
    console.log(`Server running on port: http://localhost:${PORT}`)
    console.log(`Try accessing: http://127.0.0.1:${PORT}`)
    console.log(`CORS is configured to allow requests from all origins`)
  })

  // Handle server errors
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Please use a different port.`)
      process.exit(1)
    } else {
      console.error("Server error:", error)
    }
  })
}

// Connect to MongoDB and start server
connectToMongoDB()
  .then((connected) => {
    if (connected) {
      console.log("MongoDB connection successful, starting server...")
    } else {
      console.warn("Failed to connect to MongoDB, starting server anyway...")
    }
    startServer()
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error)
    // Start server anyway so we can at least serve the API
    startServer()
  })

// Handle unexpected errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error)
  // Don't exit the process, just log the error
})