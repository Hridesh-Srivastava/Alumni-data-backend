import express from "express"
import { getUserSettings, updateUserSettings } from "../controllers/settings.js"
import { protect } from "../middleware/auth.js"

const router = express.Router()

// @route   GET /api/settings
// @desc    Get user settings
// @access  Private
router.get("/", protect, getUserSettings)

// @route   PUT /api/settings
// @desc    Update user settings
// @access  Private
router.put("/", protect, updateUserSettings)

export default router