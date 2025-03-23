import { spawn } from "child_process";
import path from "path";
import fs from "fs";


const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  console.error("\x1b[31mError: .env file not found!\x1b[0m");
  process.exit(1);
}

console.log("\x1b[36mStarting backend server...\x1b[0m");

const server = spawn("node", ["server.js"], {
  stdio: "inherit",
  shell: true,
});

server.on("error", (error) => {
  console.error("\x1b[31mFailed to start server:\x1b[0m", error.message);
});

server.on("exit", (code, signal) => {
  if (code !== 0) {
    console.error(`\x1b[31mServer process exited with code ${code}\x1b[0m`);
  }
});

process.on("SIGINT", () => {
  console.log("\x1b[36mShutting down server...\x1b[0m");
  server.kill("SIGINT");
  process.exit(0);
});