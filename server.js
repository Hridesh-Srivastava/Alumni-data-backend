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

// Configure CORS - Simplified to allow all origins in development
app.use(
  cors({
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false, // Set to false to avoid preflight issues
  }),
)

// Simple route to check if the server is running
app.get("/", (req, res) => {
  res.send("HSST Alumni API is running")
})

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" })
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/alumni", alumniRoutes)
app.use("/api/contact", contactRoutes)
app.use("/api/academic-units", academicUnitRoutes)

// Improved MongoDB connection with better error handling
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log(`MongoDB connected successfully! host: ${mongoose.connection.host}`)
    return true
  } catch (error) {
    console.error("MongoDB connection error:", error.message)
    return false
  }
}

// Start server regardless of MongoDB connection status
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server running on port: http://localhost:${PORT}`)
  })
}

// Connect to MongoDB and start server
connectToMongoDB()
  .then(startServer)
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

