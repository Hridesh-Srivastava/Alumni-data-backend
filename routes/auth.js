import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { check, validationResult } from "express-validator"
import User from "../models/user.js"
import { protect } from "../middleware/auth.js"
import nodemailer from "nodemailer"
import crypto from "crypto"

const router = express.Router()

// @route   GET /api/auth/health
// @desc    Health check endpoint
// @access  Public
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Auth service is running" })
})

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Please enter a password with 6 or more characters").isLength({ min: 6 }),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, email, password } = req.body

    try {
      // Check if user already exists
      let user = await User.findOne({ email })

      if (user) {
        return res.status(400).json({ message: "User already exists" })
      }

      // Create new user with default settings structure
      user = new User({
        name,
        email,
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

      // Hash password
      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password, salt)

      // Save user to database
      await user.save()

      // Create JWT payload
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      }

      // Sign token
      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" }, (err, token) => {
        if (err) throw err
        res.json({
          token,
          _id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          settings: user.settings,
        })
      })
    } catch (error) {
      console.error("Error in register:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  [check("email", "Please include a valid email").isEmail(), check("password", "Password is required").exists()],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    try {
      // Check if user exists
      const user = await User.findOne({ email })

      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" })
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password)

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password" })
      }

      // Create JWT payload
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      }

      // Sign token
      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" }, (err, token) => {
        if (err) throw err
        res.json({
          token,
          _id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          settings: user.settings,
        })
      })
    } catch (error) {
      console.error("Error in login:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", protect, async (req, res) => {
  try {
    // Get user without password
    const user = await User.findById(req.user.id).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error("Error in get profile:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body

    // Get user
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update fields
    if (name) user.name = name
    if (email) user.email = email

    // If updating password
    if (currentPassword && newPassword) {
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password)

      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" })
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(newPassword, salt)
    }

    // Save user
    await user.save()

    // Create a new token with updated user info
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    }

    // Sign token
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" }, (err, token) => {
      if (err) throw err

      // Return user without password and with new token
      const updatedUser = {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        settings: user.settings,
        token: token,
      }

      res.json(updatedUser)
    })
  } catch (error) {
    console.error("Error in update profile:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/auth/settings
// @desc    Update user settings
// @access  Private
router.put("/settings", protect, async (req, res) => {
  try {
    const { settings } = req.body

    if (!settings) {
      return res.status(400).json({ message: "Settings are required" })
    }

    // Get user
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Initialize settings object if it doesn't exist
    if (!user.settings) {
      user.settings = {
        notifications: {},
        privacy: {},
        appearance: {},
      }
    }

    // Update settings with deep merge
    if (settings.notifications) {
      // Initialize if doesn't exist
      if (!user.settings.notifications) {
        user.settings.notifications = {}
      }
      
      // Update notifications settings
      user.settings.notifications = {
        ...user.settings.notifications,
        ...settings.notifications,
      }
    }

    if (settings.privacy) {
      // Initialize if doesn't exist
      if (!user.settings.privacy) {
        user.settings.privacy = {}
      }
      
      // Update privacy settings
      user.settings.privacy = {
        ...user.settings.privacy,
        ...settings.privacy,
      }
    }

    if (settings.appearance) {
      // Initialize if doesn't exist
      if (!user.settings.appearance) {
        user.settings.appearance = {}
      }
      
      // Update appearance settings
      user.settings.appearance = {
        ...user.settings.appearance,
        ...settings.appearance,
      }
    }

    // Save user
    await user.save()

    res.json({ settings: user.settings })
  } catch (error) {
    console.error("Error in update settings:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post("/forgot-password", [check("email", "Please include a valid email").isEmail()], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { email } = req.body

  try {
    // Find user by email
    const user = await User.findOne({ email })

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        message: "If an account with that email exists, we've sent a password reset link.",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex")
    const resetTokenExpiry = Date.now() + 3600000 // 1 hour

    // Save reset token to user
    user.resetToken = resetToken
    user.resetTokenExpiry = resetTokenExpiry
    await user.save()

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${resetToken}`

    // Setup email transporter
    let transporter

    if (process.env.NODE_ENV === "production") {
      // Use real email service in production
      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      })
    } else {
      // Use ethereal.email for testing in development
      const testAccount = await nodemailer.createTestAccount()

      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })
    }

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@hsstalumni.com",
      to: user.email,
      subject: "Password Reset - HSST Alumni System",
      text: `You requested a password reset. Please click the following link to reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset</h2>
          <p>You requested a password reset for your HSST Alumni System account.</p>
          <p>Please click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        </div>
      `,
    }

    // Send email
    const info = await transporter.sendMail(mailOptions)

    console.log("Password reset email sent:", info.messageId)

    if (process.env.NODE_ENV !== "production") {
      // Log preview URL for development
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info))
    }

    res.json({
      message: "If an account with that email exists, we've sent a password reset link.",
    })
  } catch (error) {
    console.error("Error in forgot password:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  "/reset-password",
  [
    check("token", "Token is required").not().isEmpty(),
    check("newPassword", "Please enter a password with 6 or more characters").isLength({ min: 6 }),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { token, newPassword } = req.body

    try {
      console.log("Resetting password with token:", token)

      // Find user by reset token and check if token is still valid
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() },
      })

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" })
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(newPassword, salt)

      // Clear reset token fields
      user.resetToken = undefined
      user.resetTokenExpiry = undefined

      // Save user
      await user.save()

      res.json({ message: "Password has been reset successfully" })
    } catch (error) {
      console.error("Error in reset password:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

export default router