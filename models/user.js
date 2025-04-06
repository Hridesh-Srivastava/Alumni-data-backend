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
        default: "system",
      },
      fontSize: {
        type: String,
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
  return await bcrypt.compare(enteredPassword, this.password)
}

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified("password")) {
    return next()
  }

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10)

    // Hash password
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

const User = mongoose.model("User", UserSchema)

export default User

