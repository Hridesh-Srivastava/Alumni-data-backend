import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./routes/auth.js"
import alumniRoutes from "./routes/alumni.js"
import contactRoutes from "./routes/contact.js"
import academicUnitRoutes from "./routes/academicUnit.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(express.json({ limit: "30mb" }))
app.use(express.urlencoded({ limit: "30mb", extended: true }))

// IMPORTANT: Configure CORS properly - this is critical for frontend-backend communication
app.use(cors()) // Allow all origins for now to troubleshoot

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
  })
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/alumni", alumniRoutes)
app.use("/api/contact", contactRoutes)
app.use("/api/academic-units", academicUnitRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// Improved MongoDB connection with better error handling
const connectToMongoDB = async () => {
  try {
    // Connect to MongoDB with proper options
    await mongoose.connect(process.env.MONGODB_URI)
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
    console.log(`CORS is currently set to allow all origins for troubleshooting`)
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

