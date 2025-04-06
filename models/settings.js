import mongoose from "mongoose"

const SettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update the updatedAt timestamp before saving
SettingsSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

const Settings = mongoose.model("Settings", SettingsSchema)

export default Settings