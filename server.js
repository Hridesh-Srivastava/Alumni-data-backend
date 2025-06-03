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
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import xss from "xss-clean"
import mongoSanitize from "express-mongo-sanitize"

dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "hridesh",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set in environment variables.")
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 5001

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Security Middleware
// Set security HTTP headers with better configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.cloudinary.com"],
      },
    },
  }),
)

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes",
})

// Strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes for auth
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts, please try again after 15 minutes",
})

// Apply rate limiting
app.use("/api/", generalLimiter)
app.use("/api/auth/login", authLimiter)
app.use("/api/auth/register", authLimiter)

// Data sanitization against XSS attacks
app.use(xss())

// Data sanitization against NoSQL query injection
app.use(mongoSanitize())

// Regular Middleware
app.use(express.json({ limit: "30mb" }))
app.use(express.urlencoded({ limit: "30mb", extended: true }))

// CORS configuration with credentials support
app.use(
  cors({
    origin: ["https://hsst-alumni-frontend.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Enable credentials for cookies
  }),
)

// Simple route to check if the server is running
app.get("/", (req, res) => {
  res.send("SST Alumni API is running securely")
})

// Enhanced health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running securely",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    security: {
      helmet: "enabled",
      rateLimit: "enabled",
      xssProtection: "enabled",
      mongoSanitization: "enabled",
    },
    cloudinary: {
      configured:
        !!(process.env.CLOUDINARY_CLOUD_NAME || "hridesh") &&
        !!process.env.CLOUDINARY_API_KEY &&
        !!process.env.CLOUDINARY_API_SECRET,
    },
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

// Enhanced error handling middleware
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

// MongoDB connection
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/hsst-alumni", {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    console.log(`MongoDB connected successfully! host: ${mongoose.connection.host}`)
    return true
  } catch (error) {
    console.error("MongoDB connection error:", error.message)
    return false
  }
}

const startServer = () => {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Secure server running on port: http://localhost:${PORT}`)
    console.log(`Security features enabled: Helmet, Rate Limiting, XSS Protection, Mongo Sanitization`)
  })

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`)
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
      console.log("MongoDB connection successful, starting secure server...")
    } else {
      console.warn("Failed to connect to MongoDB, starting server anyway...")
    }
    startServer()
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error)
    startServer()
  })

// Handle unexpected errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error)
})
