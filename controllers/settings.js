import Settings from "../models/settings.js"
import User from "../models/user.js"

// @desc    Get user settings
// @route   GET /api/settings
// @access  Private
export const getUserSettings = async (req, res) => {
  try {
    // First try to get settings from the Settings collection
    let settings = await Settings.findOne({ userId: req.user.id })

    if (!settings) {
      // If no settings found in Settings collection, check User model
      const user = await User.findById(req.user.id)
      
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      // If user has settings in User model, create settings in Settings collection
      if (user.settings) {
        settings = await Settings.create({
          userId: user._id,
          ...user.settings,
        })
      } else {
        // Create default settings
        settings = await Settings.create({
          userId: user._id,
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
        })

        // Update user with settings reference
        user.settings = settings._id
        await user.save()
      }
    }

    res.json(settings)
  } catch (error) {
    console.error("Error getting settings:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// @desc    Update user settings
// @route   PUT /api/settings
// @access  Private
export const updateUserSettings = async (req, res) => {
  try {
    const { notifications, privacy, appearance } = req.body

    // Find settings or create if not exists
    let settings = await Settings.findOne({ userId: req.user.id })

    if (!settings) {
      // Create new settings
      settings = new Settings({
        userId: req.user.id,
        notifications: notifications || {
          email: true,
          browser: false,
        },
        privacy: privacy || {
          showEmail: false,
          showProfile: true,
        },
        appearance: appearance || {
          theme: "system",
          fontSize: "medium",
        },
      })
    } else {
      // Update existing settings
      if (notifications) {
        settings.notifications = {
          ...settings.notifications,
          ...notifications,
        }
      }

      if (privacy) {
        settings.privacy = {
          ...settings.privacy,
          ...privacy,
        }
      }

      if (appearance) {
        settings.appearance = {
          ...settings.appearance,
          ...appearance,
        }
      }
    }

    // Save settings
    await settings.save()

    // Also update user's settings reference
    const user = await User.findById(req.user.id)
    if (user) {
      // Store settings in user model for backward compatibility
      user.settings = {
        notifications: settings.notifications,
        privacy: settings.privacy,
        appearance: settings.appearance,
      }
      await user.save()
    }

    res.json(settings)
  } catch (error) {
    console.error("Error updating settings:", error)
    res.status(500).json({ message: "Server error" })
  }
}