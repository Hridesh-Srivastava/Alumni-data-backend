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


app.set("trust proxy", 1)

app.use(
  cors({
    origin: [
      "https://hsst-alumni-frontend.vercel.app",
      "http://localhost:3000",
      "https://hsst-alumni-backend.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browser support
  }),
)

// Handle preflight requests explicitly
app.options("*", cors())


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
    crossOriginEmbedderPolicy: false, 
  }),
)

// Custom rate limiter that returns JSON with CORS headers
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || "unknown"
    },
    handler: (req, res) => {
      res.header("Access-Control-Allow-Origin", req.headers.origin || "*")
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
      res.header("Access-Control-Allow-Credentials", "true")

      res.status(429).json({
        error: "Too Many Requests",
        message: message,
        retryAfter: Math.round(windowMs / 1000),
      })
    },
    skip: (req) => {
      // Skip rate limiting for OPTIONS requests (preflight)
      return req.method === "OPTIONS"
    },
  })
}

// More lenient rate limiting
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  200, // Increased from 100 to 200 requests
  "Too many requests from this IP, please try again after 15 minutes",
)

const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20, // Increased from 5 to 20 attempts for auth
  "Too many authentication attempts, please try again after 15 minutes",
)

// Apply rate limiting after CORS
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

// Simple route to check if the server is running
app.get("/", (req, res) => {
  res.json({
    message: "SST Alumni API is running securely",
    ip: req.ip,
    ips: req.ips,
    trustProxy: app.get("trust proxy"),
  })
})

// Enhanced health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running securely",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    network: {
      ip: req.ip,
      ips: req.ips,
      trustProxy: app.get("trust proxy"),
      userAgent: req.get("User-Agent"),
    },
    cors: {
      enabled: true,
      origins: ["https://hsst-alumni-frontend.vercel.app", "http://localhost:3000"],
    },
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

// Enhanced error handling middleware with CORS headers
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)

  // Ensure CORS headers are set even for errors
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
  res.header("Access-Control-Allow-Credentials", "true")

  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// Handle 404 errors for any undefined routes
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.originalUrl}`)

  // Ensure CORS headers for 404s too
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
  res.header("Access-Control-Allow-Credentials", "true")

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
    console.log(`Trust proxy setting: ${app.get("trust proxy")}`)
    console.log(`Security features enabled: Helmet, Rate Limiting, XSS Protection, Mongo Sanitization`)
    console.log(`CORS is configured to allow requests from specified origins`)
    console.log(`CORS origins: https://hsst-alumni-frontend.vercel.app, http://localhost:3000`)
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


process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error)
})
