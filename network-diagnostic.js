import http from "http"
import axios from "axios"
import dotenv from "dotenv"
import { exec } from "child_process"
import { promisify } from "util"

dotenv.config()

const execAsync = promisify(exec)
const PORT = process.env.PORT || 5000
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"

console.log("\x1b[36m=== SST Alumni Network Diagnostics ===\x1b[0m")

// Check if port is in use
async function checkPort() {
  return new Promise((resolve) => {
    const server = http.createServer()

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log(`\x1b[33m⚠ Port ${PORT} is already in use\x1b[0m`)
        resolve(false)
      } else {
        console.log(`\x1b[31m❌ Error checking port: ${err.message}\x1b[0m`)
        resolve(false)
      }
    })

    server.once("listening", () => {
      server.close()
      console.log(`\x1b[32m✓ Port ${PORT} is available\x1b[0m`)
      resolve(true)
    })

    server.listen(PORT)
  })
}

// Check if localhost resolves correctly
async function checkLocalhost() {
  try {
    const result = await execAsync("ping -n 1 localhost")
    console.log(`\x1b[32m✓ localhost resolves correctly\x1b[0m`)
    return true
  } catch (error) {
    console.log(`\x1b[31m❌ localhost resolution issue: ${error.message}\x1b[0m`)
    return false
  }
}

// Check if we can connect to our own server
async function checkSelfConnection() {
  // Create a simple server
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("OK")
  })

  return new Promise((resolve) => {
    server.listen(8000, async () => {
      try {
        const response = await axios.get("http://localhost:8000", { timeout: 2000 })
        console.log(`\x1b[32m✓ Self-connection test passed\x1b[0m`)
        server.close()
        resolve(true)
      } catch (error) {
        console.log(`\x1b[31m❌ Self-connection test failed: ${error.message}\x1b[0m`)
        server.close()
        resolve(false)
      }
    })

    server.on("error", (err) => {
      console.log(`\x1b[31m❌ Self-connection test error: ${err.message}\x1b[0m`)
      resolve(false)
    })
  })
}

// Check firewall status
async function checkFirewall() {
  try {
    const result = await execAsync("netsh advfirewall show allprofiles state")
    console.log("\x1b[36mFirewall Status:\x1b[0m")
    console.log(result.stdout)
    return true
  } catch (error) {
    console.log(`\x1b[33m⚠ Could not check firewall status: ${error.message}\x1b[0m`)
    return false
  }
}

// Run all checks
async function runDiagnostics() {
  console.log("\x1b[36mRunning network diagnostics...\x1b[0m")

  await checkPort()
  await checkLocalhost()
  await checkSelfConnection()
  await checkFirewall()

  console.log("\x1b[36m\nTroubleshooting suggestions:\x1b[0m")
  console.log("1. Try accessing your backend directly in the browser: http://localhost:5001")
  console.log("2. Check if your firewall is blocking Node.js or port 5001")
  console.log("3. Try changing the backend port in .env to 3001 or another free port")
  console.log("4. Make sure NEXT_PUBLIC_API_URL in frontend .env.local matches your backend URL")
  console.log("5. Try using 127.0.0.1 instead of localhost in your API URL")

  console.log("\x1b[36m\nTo fix the connection issue, try these steps:\x1b[0m")
  console.log("1. Update your frontend .env.local to use:")
  console.log("   NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api")
  console.log("2. Restart both your backend and frontend servers")
  console.log("3. Temporarily disable your firewall for testing")
  console.log("4. If using a VPN, try disconnecting it")
}

runDiagnostics()

