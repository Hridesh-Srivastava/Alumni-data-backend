import mongoose from "mongoose"

const alumniSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    academicUnit: {
      type: String,
      required: true,
    },
    program: {
      type: String,
      required: true,
    },
    passingYear: {
      type: String,
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    qualifiedExams: {
      examName: String,
      rollNumber: String,
      certificateUrl: String,
    },
    employment: {
      type: String,
      employerName: String,
      employerContact: String,
      employerEmail: String,
      documentUrl: String,
    },
    higherEducation: {
      institutionName: String,
      programName: String,
      documentUrl: String,
    },
    contactDetails: {
      email: String,
      phone: String,
      address: String,
    },
  },
  {
    timestamps: true,
  },
)

const Alumni = mongoose.model("Alumni", alumniSchema)

export default Alumni

