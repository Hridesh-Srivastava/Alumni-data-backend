import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "admin",
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
  },
  {
    timestamps: true,
  },
)

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next()
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

const User = mongoose.model("User", userSchema)

export default User

