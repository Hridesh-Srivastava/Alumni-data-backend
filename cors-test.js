import express from "express"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const PORT = 3333

// Enable CORS for all routes
app.use(cors())

// Simple test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "CORS test successful" })
})

// Start server
app.listen(PORT, () => {
  console.log(`CORS test server running at http://localhost:${PORT}`)
  console.log(`Try accessing http://localhost:${PORT}/test from your browser`)
  console.log(`If you can see the JSON response, CORS is not the issue`)
})

