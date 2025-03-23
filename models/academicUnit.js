import mongoose from "mongoose"

const academicUnitSchema = mongoose.Schema(
  {
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
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

const AcademicUnit = mongoose.model("AcademicUnit", academicUnitSchema)

export default AcademicUnit

