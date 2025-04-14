import express from "express"
import axios from "axios"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const execAsync = promisify(exec)

// Create a test server on port 5001
const app = express()
const PORT = 5001

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  next()
})

// Simple test endpoint
app.get("/", (req, res) => {
  res.send("Test server is running")
})

app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

// Start the test server
const server = app.listen(PORT, "0.0.0.0", async () => {
  console.log("\x1b[36m=== HSST Alumni Connection Fix Tool ===\x1b[0m")
  console.log(`Test server running at http://localhost:${PORT}`)

  // Check if we can connect to our own test server
  try {
    console.log("\nTesting local connectivity...")

    // Try different ways to connect to our test server
    const endpoints = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, `http://[::1]:${PORT}`]

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to connect to: ${endpoint}`)
        const response = await axios.get(endpoint, { timeout: 2000 })
        console.log(`\x1b[32m✓ Successfully connected to: ${endpoint}\x1b[0m`)
      } catch (error) {
        console.log(`\x1b[31m❌ Failed to connect to: ${endpoint} - ${error.message}\x1b[0m`)
      }
    }

    // Check if the main backend server is running
    console.log("\nChecking if main backend server is running...")
    try {
      const mainBackendEndpoints = [
        "http://localhost:5001",
        "http://127.0.0.1:5001",
        "http://localhost:5001/health",
        "http://127.0.0.1:5001/health",
      ]

      let mainServerRunning = false

      for (const endpoint of mainBackendEndpoints) {
        try {
          console.log(`Trying to connect to: ${endpoint}`)
          const response = await axios.get(endpoint, { timeout: 2000 })
          console.log(`\x1b[32m✓ Successfully connected to main backend at: ${endpoint}\x1b[0m`)
          mainServerRunning = true
          break
        } catch (error) {
          console.log(`\x1b[31m❌ Failed to connect to main backend at: ${endpoint} - ${error.message}\x1b[0m`)
        }
      }

      if (!mainServerRunning) {
        console.log("\x1b[33m⚠ Main backend server does not appear to be running or is not accessible\x1b[0m")
      }
    } catch (error) {
      console.log(`\x1b[31m❌ Error checking main backend: ${error.message}\x1b[0m`)
    }

    // Check for potential firewall issues
    console.log("\nChecking for potential firewall issues...")
    try {
      const firewallResult = await execAsync("netsh advfirewall show allprofiles state")
      console.log("Firewall status:")
      console.log(firewallResult.stdout)

      console.log("\nChecking if Node.js is allowed through firewall...")
      const nodeFirewallResult = await execAsync('netsh advfirewall firewall show rule name="Node.js"')
      console.log(nodeFirewallResult.stdout)
    } catch (error) {
      console.log(`\x1b[33m⚠ Could not check firewall status: ${error.message}\x1b[0m`)
    }

    // Update frontend .env.local file
    console.log("\nUpdating frontend .env.local file...")
    try {
      const frontendEnvPath = path.join(__dirname, "..", "hsst-alumni-frontend", ".env.local")
      const envContent = `# Frontend environment variables
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api
`

      fs.writeFileSync(frontendEnvPath, envContent)
      console.log(`\x1b[32m✓ Updated frontend .env.local file to use 127.0.0.1 instead of localhost\x1b[0m`)
    } catch (error) {
      console.log(`\x1b[31m❌ Failed to update frontend .env.local: ${error.message}\x1b[0m`)
      console.log("Please manually update your frontend .env.local file to use:")
      console.log("NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api")
    }

    console.log("\n\x1b[36mRecommended actions:\x1b[0m")
    console.log("1. Stop your current backend server")
    console.log("2. Update your backend server.js to use the simplified CORS configuration:")
    console.log("   app.use(cors())  // Allow all origins for troubleshooting")
    console.log("3. Restart your backend server with: npm run dev")
    console.log("4. Restart your frontend with: npm run dev")
    console.log("5. If still not working, try temporarily disabling your firewall")
    console.log("6. If using a VPN, try disconnecting it")

    console.log("\nPress Ctrl+C to stop this test server")
  } catch (error) {
    console.error("Error during tests:", error)
  }
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

