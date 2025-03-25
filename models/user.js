import mongoose from "mongoose"

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

const User = mongoose.model("User", UserSchema)

export default User

