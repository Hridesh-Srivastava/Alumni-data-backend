import mongoose from "mongoose"

const AlumniSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  academicUnit: {
    type: String,
    required: true,
    default: "Himalayan School of Science and Technology", // Default to HSST
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
  contactDetails: {
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
  },
  qualifiedExams: {
    examName: {
      type: String,
    },
    rollNumber: {
      type: String,
    },
    certificateUrl: {
      type: String,
    },
  },
  employment: {
    type: {
      type: String,
      enum: ["Employed", "Self-employed", "Unemployed", "Studying", ""],
    },
    employerName: {
      type: String,
    },
    employerContact: {
      type: String,
    },
    employerEmail: {
      type: String,
    },
    documentUrl: {
      type: String,
    },
    selfEmploymentDetails: {
      type: String,
    },
  },
  higherEducation: {
    institutionName: {
      type: String,
    },
    programName: {
      type: String,
    },
    documentUrl: {
      type: String,
    },
  },
  // New fields for file uploads
  basicInfoImageUrl: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
})

const Alumni = mongoose.model("Alumni", AlumniSchema)

export default Alumni

