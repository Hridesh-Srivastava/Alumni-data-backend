import mongoose from "mongoose"

const AcademicUnitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  shortName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
})

// Create a compound index for unique name per user
AcademicUnitSchema.index({ name: 1, createdBy: 1 }, { unique: true })

const AcademicUnit = mongoose.model("AcademicUnit", AcademicUnitSchema)

export default AcademicUnit

