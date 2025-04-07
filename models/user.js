import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  resetToken: {
    type: String,
  },
  resetTokenExpiry: {
    type: Date,
  },
  settings: {
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      browser: {
        type: Boolean,
        default: false,
      },
    },
    privacy: {
      showEmail: {
        type: Boolean,
        default: false,
      },
      showProfile: {
        type: Boolean,
        default: true,
      },
    },
    appearance: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      fontSize: {
        type: String,
        enum: ["small", "medium", "large"],
        default: "medium",
      },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password)
  } catch (error) {
    console.error("Password comparison error:", error)
    return false
  }
}

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
  try {
    // Only hash the password if it's modified (or new)
    if (!this.isModified("password")) {
      return next()
    }

    // Generate salt
    const salt = await bcrypt.genSalt(10)

    // Hash password
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    console.error("Password hashing error:", error)
    next(error)
  }
})

// Initialize settings if they don't exist
UserSchema.pre("save", function (next) {
  // Initialize settings object if it doesn't exist
  if (!this.settings) {
    this.settings = {
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
    }
  } else {
    // Ensure all settings objects exist
    if (!this.settings.notifications) {
      this.settings.notifications = {
        email: true,
        browser: false,
      }
    }

    if (!this.settings.privacy) {
      this.settings.privacy = {
        showEmail: false,
        showProfile: true,
      }
    }

    if (!this.settings.appearance) {
      this.settings.appearance = {
        theme: "system",
        fontSize: "medium",
      }
    }
  }

  next()
})

const User = mongoose.model("User", UserSchema)

export default User

