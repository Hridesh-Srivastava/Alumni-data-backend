import express from "express"
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  updateUserSettings,
} from "../controllers/auth.js"
import { protect } from "../middleware/auth.js"
import User from "../models/user.js"
import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"
import crypto from "crypto"
import { check, validationResult } from "express-validator"
import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import { CloudinaryStorage } from "multer-storage-cloudinary"
import axios from "axios"

// Configure Cloudinary storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "hsst-alumni-avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill" }],
  },
})

// Configure multer for avatar uploads
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
})

// Generate JWT token function
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

// Function to upload Google profile picture to Cloudinary
const uploadGoogleAvatarToCloudinary = async (googleAvatarUrl, userId) => {
  try {
    if (!googleAvatarUrl) return null

    if (process.env.NODE_ENV === 'development') {
      console.log("Starting Google avatar upload to Cloudinary for user:", userId)
      console.log("Google avatar URL:", googleAvatarUrl)
    }

    // Download the image from Google
    const response = await axios.get(googleAvatarUrl, {
      responseType: 'arraybuffer'
    })

    if (process.env.NODE_ENV === 'development') {
      console.log("Downloaded image from Google, size:", response.data.length, "bytes")
    }

    // Convert to base64
    const buffer = Buffer.from(response.data, 'binary')
    const base64Image = buffer.toString('base64')
    const dataURI = `data:${response.headers['content-type']};base64,${base64Image}`

    if (process.env.NODE_ENV === 'development') {
      console.log("Converted to base64, content type:", response.headers['content-type'])
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'hsst-alumni-avatars',
      public_id: `google_avatar_${userId}`,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' }
      ]
    })

    if (process.env.NODE_ENV === 'development') {
      console.log("Successfully uploaded to Cloudinary:", uploadResult.secure_url)
    }

    return uploadResult.secure_url
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error uploading Google avatar to Cloudinary:", error)
      console.error("Error details:", error.message)
    }
    // Return original URL if Cloudinary upload fails
    return googleAvatarUrl
  }
}

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
    if (process.env.NODE_ENV === 'development') {
      console.log("Looking for user with email:", email)
    }
    // Use case-insensitive search for email
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
    })

    if (!user) {
      if (process.env.NODE_ENV === 'development') {
      console.log("User not found for email:", email)
    }
      return res.status(404).json({ message: "User with this email does not exist" })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("User found:", user)
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = Date.now() + 3600000 // Token valid for 1 hour

    user.resetToken = resetToken
    user.resetTokenExpiry = resetTokenExpiry
    await user.save()

    if (process.env.NODE_ENV === 'development') {
      console.log("Reset token generated and saved:", resetToken)
    }

    // Create a nodemailer transporter with detailed logging
    if (process.env.NODE_ENV === 'development') {
      console.log("Setting up email transporter with:", {
        service: process.env.EMAIL_SERVICE,
        user: process.env.EMAIL_USER,
        // Password hidden for security
      })
    }

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
          if (process.env.NODE_ENV === 'development') {
      console.log("Verifying email transporter configuration...")
    }
    await transporter.verify()
    if (process.env.NODE_ENV === 'development') {
      console.log("Email transporter verification successful")
    }
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

    if (process.env.NODE_ENV === 'development') {
      console.log("Sending email to:", email)
      console.log("Reset URL:", resetUrl)
      console.log("Email from:", mailOptions.from)
    }

    // Send the email with detailed error handling
    try {
      const info = await transporter.sendMail(mailOptions)
      if (process.env.NODE_ENV === 'development') {
        console.log("Email sent successfully:", info.response)
        console.log("Message ID:", info.messageId)
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info))
      }

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
            if (process.env.NODE_ENV === 'development') {
        console.log("Validation errors:", errors.array())
      }
      return res.status(400).json({ errors: errors.array() })
    }

    const { token, newPassword } = req.body

    try {
      if (process.env.NODE_ENV === 'development') {
      console.log("Looking for user with reset token:", token)
    }
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() },
      })

      if (!user) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Invalid or expired token")
        }
        return res.status(400).json({ message: "Password reset token is invalid or has expired" })
      }

      if (process.env.NODE_ENV === 'development') {
        console.log("User found, resetting password")
      }

      // Set the new password - let the pre-save hook handle the hashing
      user.password = newPassword

      // Clear the reset token fields
      user.resetToken = undefined
      user.resetTokenExpiry = undefined

      await user.save()

      if (process.env.NODE_ENV === 'development') {
        console.log("Password reset successful")
      }
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

// OAuth verification route
router.post("/verify-oauth", async (req, res) => {
  try {
    const { email, otp, oauthData } = req.body

    // For OAuth users, we skip OTP verification since Google already verified them
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: oauthData.email },
        { googleId: oauthData.googleId }
      ]
    })

    if (existingUser) {
      // Update existing user with OAuth info if needed
      if (!existingUser.googleId) {
        existingUser.googleId = oauthData.googleId
        existingUser.isOAuthUser = true
        if (oauthData.avatar) {
          // Upload Google profile picture to Cloudinary if it's from Google
          if (oauthData.avatar.includes('googleusercontent.com')) {
            try {
              const cloudinaryAvatarUrl = await uploadGoogleAvatarToCloudinary(oauthData.avatar, existingUser._id)
              if (cloudinaryAvatarUrl) {
                existingUser.avatar = cloudinaryAvatarUrl
              } else {
                existingUser.avatar = oauthData.avatar
              }
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error("Failed to upload Google avatar to Cloudinary:", error)
              }
              existingUser.avatar = oauthData.avatar
            }
          } else {
            existingUser.avatar = oauthData.avatar
          }
        }
        await existingUser.save()
      }

      // Generate token for existing user
      const token = generateToken(existingUser)

      const responseData = {
        _id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        avatar: existingUser.avatar,
        isOAuthUser: existingUser.isOAuthUser,
        settings: existingUser.settings,
        token,
      }

      if (process.env.NODE_ENV === 'development') {
      console.log("OAuth verification successful (existing user), sending response:", responseData)
    }
      res.json(responseData)
    } else {
      // Create new user with OAuth data
      const newUser = await User.create(oauthData)
      
      // Upload Google profile picture to Cloudinary if it exists
      if (oauthData.avatar && oauthData.avatar.includes('googleusercontent.com')) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Found Google avatar for new user, attempting upload to Cloudinary")
        }
        try {
          const cloudinaryAvatarUrl = await uploadGoogleAvatarToCloudinary(oauthData.avatar, newUser._id)
          if (cloudinaryAvatarUrl) {
            newUser.avatar = cloudinaryAvatarUrl
            await newUser.save()
            if (process.env.NODE_ENV === 'development') {
              console.log("Successfully updated user avatar to Cloudinary URL")
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error("Failed to upload Google avatar to Cloudinary:", error)
          }
          // Continue with original avatar if upload fails
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log("No Google avatar found or not a Google URL:", oauthData.avatar)
        }
      }
      
      // Generate token
      const token = generateToken(newUser)

      const responseData = {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        isOAuthUser: newUser.isOAuthUser,
        settings: newUser.settings,
        token,
      }

      if (process.env.NODE_ENV === 'development') {
      console.log("OAuth verification successful, sending response:", responseData)
    }
      res.json(responseData)
    }
  } catch (error) {
    console.error("OAuth verification error:", error)
    res.status(500).json({ message: "Failed to verify OAuth user" })
  }
})

// Avatar upload route
router.post("/upload-avatar", uploadAvatar.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No avatar file uploaded" })
    }

    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" })
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update user avatar with Cloudinary URL
    user.avatar = req.file.path
    await user.save()

    // Generate new token with updated user info
    const token = generateToken(user)

    res.json({
      message: "Avatar uploaded successfully",
      avatarUrl: req.file.path,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        settings: user.settings,
      },
      token,
    })
  } catch (error) {
    console.error("Avatar upload error:", error)
    res.status(500).json({ message: "Failed to upload avatar" })
  }
})

// Remove avatar route
router.post("/remove-avatar", async (req, res) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" })
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Remove avatar from Cloudinary if it exists
    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      try {
        const cloudinaryModule = await import("cloudinary")
        const cloudinary = cloudinaryModule.v2
        
        // Extract public_id from Cloudinary URL
        const urlParts = user.avatar.split('/')
        const filename = urlParts[urlParts.length - 1].split('.')[0]
        const folder = urlParts[urlParts.length - 2]
        const publicId = `${folder}/${filename}`
        
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(publicId)
        if (process.env.NODE_ENV === 'development') {
      console.log("Avatar removed from Cloudinary:", publicId)
    }
      } catch (cloudinaryError) {
        console.error("Error removing from Cloudinary:", cloudinaryError)
        // Continue even if Cloudinary deletion fails
      }
    }

    // Clear avatar field
    user.avatar = undefined
    await user.save()

    // Generate new token with updated user info
    const token = generateToken(user)

    res.json({
      message: "Avatar removed successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isOAuthUser: user.isOAuthUser,
        settings: user.settings,
      },
      token,
    })
  } catch (error) {
    console.error("Avatar remove error:", error)
    res.status(500).json({ message: "Failed to remove avatar" })
  }
})

// Google OAuth routes
router.get("/google", async (req, res) => {
  try {
    const { google } = await import("googleapis")
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:5001/api/auth/google/callback"
    )

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    })

    res.json({ authUrl })
  } catch (error) {
    console.error("Google OAuth error:", error)
    res.status(500).json({ message: "Failed to generate Google OAuth URL" })
  }
})

router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query
    const { google } = await import("googleapis")
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:5001/api/auth/google/callback"
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    if (process.env.NODE_ENV === 'development') {
      console.log("Google user data received:", {
        name: data.name,
        email: data.email,
        hasPicture: !!data.picture,
        pictureUrl: data.picture
      })
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: data.email },
        { googleId: data.id }
      ]
    })

    if (existingUser) {
      // Update existing user with Google info if needed
      if (!existingUser.googleId) {
        existingUser.googleId = data.id
        existingUser.isOAuthUser = true
        if (data.picture) {
          // Upload Google profile picture to Cloudinary if it's from Google
          if (data.picture.includes('googleusercontent.com')) {
            try {
              const cloudinaryAvatarUrl = await uploadGoogleAvatarToCloudinary(data.picture, existingUser._id)
              if (cloudinaryAvatarUrl) {
                existingUser.avatar = cloudinaryAvatarUrl
              } else {
                existingUser.avatar = data.picture
              }
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error("Failed to upload Google avatar to Cloudinary:", error)
              }
              existingUser.avatar = data.picture
            }
          } else {
            existingUser.avatar = data.picture
          }
        }
        await existingUser.save()
      }

             // Generate token and redirect
       const token = generateToken(existingUser)
       const userData = {
         _id: existingUser._id,
         name: existingUser.name,
         email: existingUser.email,
         role: existingUser.role,
         avatar: existingUser.avatar,
         isOAuthUser: existingUser.isOAuthUser,
         settings: existingUser.settings,
       }
       const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`
       res.redirect(redirectUrl)
    } else {
      // For new OAuth users, redirect to OTP verification
      // This follows the same flow as regular registration
      const oauthData = {
        name: data.name,
        email: data.email,
        googleId: data.id,
        avatar: data.picture,
        isOAuthUser: true,
        role: "admin",
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
      }

      if (process.env.NODE_ENV === 'development') {
        console.log("OAuth data prepared for new user:", {
          name: oauthData.name,
          email: oauthData.email,
          hasAvatar: !!oauthData.avatar,
          avatarUrl: oauthData.avatar
        })
      }

      // Redirect to OTP verification with OAuth data
      const redirectUrl = `${process.env.FRONTEND_URL}/verify-otp?email=${encodeURIComponent(data.email)}&oauth=true&oauthData=${encodeURIComponent(JSON.stringify(oauthData))}`
      res.redirect(redirectUrl)
    }
  } catch (error) {
    console.error("Google OAuth callback error:", error)
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`)
  }
})

export default router
