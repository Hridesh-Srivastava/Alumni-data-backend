import express from "express"
import { check } from "express-validator"
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateUserSettings,
  updateUserPassword,
} from "../controllers/auth.js"
import { protect } from "../middleware/auth.js"

const router = express.Router()

// @route   GET /api/auth/health
// @desc    Health check endpoint
// @access  Public
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Auth service is running" })
})

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Please enter a password with 6 or more characters").isLength({ min: 6 }),
  ],
  registerUser,
)

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  [check("email", "Please include a valid email").isEmail(), check("password", "Password is required").exists()],
  loginUser,
)

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", protect, getUserProfile)

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", protect, updateUserProfile)

// @route   PUT /api/auth/settings
// @desc    Update user settings
// @access  Private
router.put("/settings", protect, updateUserSettings)

// @route   PUT /api/auth/password
// @desc    Update user password
// @access  Private
router.put(
  "/password",
  [
    protect,
    check("currentPassword", "Current password is required").exists(),
    check("newPassword", "Please enter a new password with 6 or more characters").isLength({ min: 6 }),
  ],
  updateUserPassword,
)

export default router

