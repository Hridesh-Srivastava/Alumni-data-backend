import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user.js";

// Generate JWT - Updated to include more user data
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
    }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email" });
    }

    // Check if user exists - case insensitive search
    const userExists = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(), // Store email in lowercase
      password,
    });

    if (user) {
      const token = generateToken(user);

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ 
      message: "Server error during registration",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Check for user email - case insensitive search
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      message: "Server error during login",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update user settings
// @route   PUT /api/auth/settings
// @access  Private
export const updateUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (user) {
      // Update settings if provided
      if (req.body.settings) {
        // Fix for settings update - properly handle nested objects

        // Create a deep copy of the current settings
        const currentSettings = JSON.parse(JSON.stringify(user.settings || {}))

        // Notifications
        if (req.body.settings.notifications) {
          currentSettings.notifications = {
            ...currentSettings.notifications,
            ...req.body.settings.notifications,
          }
        }

        // Privacy
        if (req.body.settings.privacy) {
          currentSettings.privacy = {
            ...currentSettings.privacy,
            ...req.body.settings.privacy,
          }
        }

        // Appearance
        if (req.body.settings.appearance) {
          currentSettings.appearance = {
            ...currentSettings.appearance,
            ...req.body.settings.appearance,
          }
        }

        // Update the user's settings with the merged settings
        user.settings = currentSettings
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

