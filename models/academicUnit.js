import mongoose from "mongoose"

const AcademicUnitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  shortName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
})

const AcademicUnit = mongoose.model("AcademicUnit", AcademicUnitSchema)

export default AcademicUnit

