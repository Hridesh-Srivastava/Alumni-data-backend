import jwt from "jsonwebtoken"

// Middleware to verify JWT token
const protect = (req, res, next) => {
  // Get token from header
  const token = req.header("Authorization")?.replace("Bearer ", "")

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" })
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Fix for user extraction from token
    // Check if decoded has user property or if it's the ID directly
    if (decoded.user) {
      // Token format: { user: { id: '...' } }
      req.user = decoded.user
    } else if (decoded.id) {
      // Token format: { id: '...' }
      req.user = { id: decoded.id }
    } else {
      throw new Error("Invalid token structure")
    }

    next()
  } catch (error) {
    console.error("Token verification error:", error)
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

