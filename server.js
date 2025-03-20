import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./routes/auth.js"
import alumniRoutes from "./routes/alumni.js"
import contactRoutes from "./routes/contact.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json({ limit: "30mb" }))
app.use(express.urlencoded({ limit: "30mb", extended: true }))

// Configure CORS to accept requests from your frontend
app.use(
  cors({
    origin: ["http://localhost:3000", "https://hsst-alumni.vercel.app"],
    credentials: true,
  }),
)

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/alumni", alumniRoutes)
app.use("/api/contact", contactRoutes)

app.get("/", (req, res) => {
  res.send("HSST Alumni API is running")
})

mongoose
  .connect(process.env.MONGODB_URI)
  .then((connection) => {
    console.log(`MongoDB connected successfully! host: ${connection.connection.host}`)
    app.listen(PORT, () => console.log(`Server running on port: http://localhost:${PORT}`))
  })
  .catch((error) => console.log(`${error} did not connect`))

