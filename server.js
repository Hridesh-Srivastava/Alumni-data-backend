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

// Configure CORS - Updated to be more permissive for development
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests)
      // Or allow any origin in development mode
      const allowedOrigins = ["http://localhost:3000", "https://hsst-alumni.vercel.app"]

      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        console.log("Origin not allowed by CORS:", origin)
        callback(null, true) // Allow anyway for testing
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Simple route to check if the server is running
app.get("/", (req, res) => {
  res.send("HSST Alumni API is running")
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/alumni", alumniRoutes)
app.use("/api/contact", contactRoutes)
app.use("/api/academic-units", academicUnitRoutes)

// Improved MongoDB connection with retry logic
const connectToMongoDB = async (retryCount = 5, delay = 5000) => {
  let currentTry = 0

  while (currentTry < retryCount) {
    try {
      const connection = await mongoose.connect(process.env.MONGODB_URI, {
      })

      console.log(`MongoDB connected successfully! host: ${connection.connection.host}`)
      return true
    } catch (error) {
      currentTry++
      console.error(`MongoDB connection attempt ${currentTry} failed:`, error.message)

      if (currentTry >= retryCount) {
        console.error("Maximum retry attempts reached. Exiting...")
        process.exit(1)
      }

      console.log(`Retrying in ${delay / 1000} seconds...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

// Connect to MongoDB and start server
connectToMongoDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port: http://localhost:${PORT}`))
  })
  .catch((error) => {
    console.error("Failed to start the server:", error)
    process.exit(1)
  })

// Handle unexpected errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error)
  process.exit(1)
})

