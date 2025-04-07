import jwt from "jsonwebtoken"

// Middleware to verify JWT token
const protect = (req, res, next) => {
  // Get token from header
  const authHeader = req.header("Authorization")
  let token = null

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "")
  }

  // Check if no token
  if (!token) {
    console.log("No token provided in request")
    return res.status(401).json({ message: "No token, authorization denied" })
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-for-development")

    console.log("Token verified successfully for user:", decoded.id || decoded.user?.id)

    // Set user in request object
    if (decoded.id) {
      // Token format: { id: '...' }
      req.user = { id: decoded.id }
    } else if (decoded.user && decoded.user.id) {
      // Token format: { user: { id: '...' } }
      req.user = decoded.user
    } else {
      throw new Error("Invalid token structure")
    }

    next()
  } catch (error) {
    console.error("Token verification error:", error)

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired" })
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" })
    }

    res.status(401).json({ message: "Token is not valid" })
  }
}

// Middleware to check if user is admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next()
  } else {
    res.status(401).json({ message: "Not authorized as an admin" })
  }
}

// Named exports
export { protect, admin }

// Default export - this allows 'import auth from "../middleware/auth.js"' to work
const auth = { protect, admin }
export default auth

