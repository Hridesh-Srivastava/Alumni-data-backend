import jwt from "jsonwebtoken"
import User from "../models/user.js"

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  })
}

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Check if user exists
    const userExists = await User.findOne({ email })

    if (userExists) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    })

    if (user) {
      const token = generateToken(user._id)

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
    res.status(500).json({ message: "Server error during registration" })
  }
}

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    // Check for user email
    const user = await User.findOne({ email })

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id)

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        settings: user.settings,
        token,
      })
    } else {
      res.status(401).json({ message: "Invalid email or password" })
    }
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login" })
  }
}

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        settings: user.settings,
      })
    } else {
      res.status(404).json({ message: "User not found" })
    }
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
    const user = await User.findById(req.user._id)

    if (user) {
      user.name = req.body.name || user.name
      user.email = req.body.email || user.email

      if (req.body.password) {
        user.password = req.body.password
      }

      const updatedUser = await user.save()
      const token = generateToken(updatedUser._id)

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        settings: updatedUser.settings,
        token,
      })
    } else {
      res.status(404).json({ message: "User not found" })
    }
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({ message: "Server error updating profile" })
  }
}

// @desc    Update user settings
// @route   PUT /api/auth/settings
// @access  Private
export const updateUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (user) {
      // Update settings if provided
      if (req.body.settings) {
        // Notifications
        if (req.body.settings.notifications) {
          user.settings.notifications.email =
            req.body.settings.notifications.email !== undefined
              ? req.body.settings.notifications.email
              : user.settings.notifications.email

          user.settings.notifications.browser =
            req.body.settings.notifications.browser !== undefined
              ? req.body.settings.notifications.browser
              : user.settings.notifications.browser
        }

        // Privacy
        if (req.body.settings.privacy) {
          user.settings.privacy.showEmail =
            req.body.settings.privacy.showEmail !== undefined
              ? req.body.settings.privacy.showEmail
              : user.settings.privacy.showEmail

          user.settings.privacy.showProfile =
            req.body.settings.privacy.showProfile !== undefined
              ? req.body.settings.privacy.showProfile
              : user.settings.privacy.showProfile
        }

        // Appearance
        if (req.body.settings.appearance) {
          user.settings.appearance.theme = req.body.settings.appearance.theme || user.settings.appearance.theme

          user.settings.appearance.fontSize = req.body.settings.appearance.fontSize || user.settings.appearance.fontSize
        }
      }

      const updatedUser = await user.save()

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        settings: updatedUser.settings,
      })
    } else {
      res.status(404).json({ message: "User not found" })
    }
  } catch (error) {
    console.error("Update settings error:", error)
    res.status(500).json({ message: "Server error updating settings" })
  }
}

