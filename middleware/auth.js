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
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    console.log("Token verified successfully for user:", decoded.id || decoded.user?.id)

    // Set user in request object with all token data
    if (decoded.id) {
      // Token format: { id: '...', email: '...', role: '...' }
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      }
      console.log("User set from decoded token:", req.user)
    } else if (decoded.user && decoded.user.id) {
      // Token format: { user: { id: '...', email: '...', role: '...' } }
      req.user = decoded.user
      console.log("User set from decoded.user:", req.user)
    } else {
      console.log("Invalid token structure - decoded:", decoded)
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
  console.log("Admin middleware - User object:", req.user)
  console.log("Admin middleware - User role:", req.user?.role)
  
  if (req.user && req.user.role === "admin") {
    console.log("Admin access granted")
    next()
  } else {
    console.log("Admin access denied - User role:", req.user?.role)
    res.status(403).json({ message: "Not authorized as an admin" })
  }
}

// Named exports
export { protect, admin }

// Default export - this allows 'import auth from "../middleware/auth.js"' to work
const auth = { protect, admin }
export default auth

