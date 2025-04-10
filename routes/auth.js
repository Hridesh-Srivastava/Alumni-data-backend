import express from "express"
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateUserSettings,
  updateUserPassword,
} from "../controllers/auth.js"
import { protect } from "../middleware/auth.js"
import nodemailer from "nodemailer"
import crypto from "crypto"
import User from "../models/user.js"
import { check, validationResult } from "express-validator"
import bcrypt from "bcryptjs"

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

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post("/forgot-password", [check("email", "Please include a valid email").isEmail()], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array())
    return res.status(400).json({ errors: errors.array() })
  }

  const { email } = req.body

  try {
    console.log("Looking for user with email:", email)
    const user = await User.findOne({ email })

    if (!user) {
      console.log("User not found for email:", email)
      return res.status(404).json({ message: "User with this email does not exist" })
    }

    console.log("User found:", user)

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = Date.now() + 3600000 // Token valid for 1 hour

    user.resetToken = resetToken
    user.resetTokenExpiry = resetTokenExpiry
    await user.save()

    console.log("Reset token generated and saved:", resetToken)

    // Create a nodemailer transporter with detailed logging
    console.log("Setting up email transporter with:", {
      service: process.env.EMAIL_SERVICE,
      user: process.env.EMAIL_USER,
      // Password hidden for security
    })

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      debug: true, // Enable debug output
      logger: true, // Log information about the transport mechanism
    })

    // Verify the transporter configuration
    try {
      console.log("Verifying email transporter configuration...")
      await transporter.verify()
      console.log("Email transporter verification successful")
    } catch (verifyError) {
      console.error("Email transporter verification failed:", verifyError)
      return res.status(500).json({ message: "Email service configuration error" })
    }

    // Email content
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

    // Use the same email for FROM as the authenticated user
    const mailOptions = {
      from: `"Password Reset" <${process.env.EMAIL_USER}>`, // Use the authenticated email address
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested a password reset. Please click the button below to reset your password:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you did not request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">This is an automated email, please do not reply.</p>
        </div>
      `,
    }

    console.log("Sending email to:", email)
    console.log("Reset URL:", resetUrl)
    console.log("Email from:", mailOptions.from)

    // Send the email with detailed error handling
    try {
      const info = await transporter.sendMail(mailOptions)
      console.log("Email sent successfully:", info.response)
      console.log("Message ID:", info.messageId)
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info))

      res.json({ message: "Password reset instructions sent to your email" })
    } catch (emailError) {
      console.error("Email sending failed:", emailError)
      return res.status(500).json({ message: "Failed to send email. Please try again later." })
    }
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/auth/reset-password
// @desc    Reset user password with token
// @access  Public
router.post(
  "/reset-password",
  [
    check("token", "Token is required").not().isEmpty(),
    check("newPassword", "Please enter a password with 6 or more characters").isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array())
      return res.status(400).json({ errors: errors.array() })
    }

    const { token, newPassword } = req.body

    try {
      console.log("Looking for user with reset token:", token)
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() },
      })

      if (!user) {
        console.log("Invalid or expired token")
        return res.status(400).json({ message: "Password reset token is invalid or has expired" })
      }

      console.log("User found, resetting password")

      // Hash the new password
      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(newPassword, salt)

      // Clear the reset token fields
      user.resetToken = undefined
      user.resetTokenExpiry = undefined

      await user.save()

      console.log("Password reset successful")
      res.json({ message: "Password has been reset successfully" })
    } catch (error) {
      console.error("Reset password error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

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
