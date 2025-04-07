import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import User from "../models/user.js"

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
      email: { $regex: new RegExp(`^${email}$`, "i") },
    })

    if (userExists) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(), // Store email in lowercase
      password,
    })

    if (user) {
      const token = generateToken(user)

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
    console.error("Register error:", error)
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

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" })
    }

    // Check for user email - case insensitive search
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, "i") },
    })

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const token = generateToken(user)

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      settings: user.settings,
      token,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Update user settings
// @route   PUT /api/auth/settings
// @access  Private
export const updateUserSettings = async (req, res) => {
  try {
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

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
export const updateUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

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
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(newPassword, salt)
    await user.save()

    res.json({ message: "Password updated successfully" })
  } catch (error) {
    console.error("Update password error:", error)
    res.status(500).json({ message: "Server error updating password" })
  }
}

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
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

