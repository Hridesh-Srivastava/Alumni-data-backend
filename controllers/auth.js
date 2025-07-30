import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import User from "../models/user.js"
import { logAuthAttempt, logError } from "../utils/debug.js"

// Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    },
  )
}

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body

    logAuthAttempt("register", { name, email, passwordLength: password?.length })

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" })
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email" })
    }

    // Check if user exists - case insensitive search
    const userExists = await User.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
    })

    if (userExists) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(), // Store email in lowercase
      password,
      role: "admin", // Default role
      settings: {
        notifications: {
          email: true,
          browser: false,
        },
        privacy: {
          showEmail: false,
          showProfile: true,
        },
        appearance: {
          theme: "system",
          fontSize: "medium",
        },
      },
    })

    if (user) {
      const token = generateToken(user)

      console.log("User registered successfully:", { id: user._id, email: user.email })

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        settings: user.settings,
        token,
      })
    } else {
      res.status(400).json({ message: "Invalid user data" })
    }
  } catch (error) {
    logError("registerUser", error)
    res.status(500).json({
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    logAuthAttempt("login", { email, passwordLength: password?.length })

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" })
    }

    // Sanitize email - convert to lowercase and trim
    const sanitizedEmail = email.toLowerCase().trim()

    // Check for user email - case insensitive search
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${sanitizedEmail.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
    })

    if (!user) {
      console.log("Login failed: User not found for email:", sanitizedEmail)
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Check if user is OAuth-only (no password)
    if (user.isOAuthUser && !user.password) {
      return res.status(401).json({ 
        message: "This account was created with Google. Please use Google Sign-In to access your account." 
      })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      console.log("Login failed: Password mismatch for user:", user.email)
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const token = generateToken(user)

    console.log("User logged in successfully:", { id: user._id, email: user.email })

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      settings: user.settings,
      token,
    })
  } catch (error) {
    logError("loginUser", error)
    res.status(500).json({
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    console.log("Get profile request received for user ID:", req.user.id)

    const user = await User.findById(req.user.id).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ message: "Server error fetching profile" })
  }
}

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    console.log("Update profile request received for user ID:", req.user.id)

    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update fields
    if (req.body.name) user.name = req.body.name
    if (req.body.email) user.email = req.body.email.toLowerCase().trim()
    if (req.body.avatar) user.avatar = req.body.avatar
    if (req.body.isOAuthUser !== undefined) user.isOAuthUser = req.body.isOAuthUser

    // Save user
    await user.save()

    // Create a new token with updated user info
    const token = generateToken(user)

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isOAuthUser: user.isOAuthUser,
      settings: user.settings,
      token,
    })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({ message: "Server error updating profile" })
  }
}

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
export const updateUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    console.log("Update password request received for user ID:", req.user.id)

    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password)

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({ message: "Password updated successfully" })
  } catch (error) {
    console.error("Update password error:", error)
    res.status(500).json({ message: "Server error updating password" })
  }
}

// @desc    Update user settings
// @route   PUT /api/auth/settings
// @access  Private
export const updateUserSettings = async (req, res) => {
  try {
    console.log("Update settings request received for user ID:", req.user.id)

    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update settings if provided
    if (req.body.settings) {
      // Initialize settings object if it doesn't exist
      if (!user.settings) {
        user.settings = {
          notifications: {},
          privacy: {},
          appearance: {},
        }
      }

      // Update settings with deep merge
      if (req.body.settings.notifications) {
        // Initialize if doesn't exist
        if (!user.settings.notifications) {
          user.settings.notifications = {}
        }

        // Update notifications settings
        user.settings.notifications = {
          ...user.settings.notifications,
          ...req.body.settings.notifications,
        }
      }

      if (req.body.settings.privacy) {
        // Initialize if doesn't exist
        if (!user.settings.privacy) {
          user.settings.privacy = {}
        }

        // Update privacy settings
        user.settings.privacy = {
          ...user.settings.privacy,
          ...req.body.settings.privacy,
        }
      }

      if (req.body.settings.appearance) {
        // Initialize if doesn't exist
        if (!user.settings.appearance) {
          user.settings.appearance = {}
        }

        // Update appearance settings
        user.settings.appearance = {
          ...user.settings.appearance,
          ...req.body.settings.appearance,
        }
      }
    }

    // Save user
    await user.save()

    res.json({
      settings: user.settings,
      message: "Settings updated successfully",
    })
  } catch (error) {
    console.error("Update settings error:", error)
    res.status(500).json({ message: "Server error updating settings" })
  }
}

