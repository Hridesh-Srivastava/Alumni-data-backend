import mongoose from "mongoose"

const AlumniSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  academicUnit: {
    type: String,
    required: true,
    default: "School of Science and Technology", // Default to SST
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

// Create indexes for better performance with large datasets
AlumniSchema.index({ academicUnit: 1, createdAt: -1 }) // For main queries
AlumniSchema.index({ registrationNumber: 1 }) // For unique lookups
AlumniSchema.index({ name: 1 }) // For name searches
AlumniSchema.index({ program: 1 }) // For program filtering
AlumniSchema.index({ passingYear: 1 }) // For year filtering
AlumniSchema.index({ "employment.type": 1 }) // For employment filtering

// Compound indexes for filter combinations
AlumniSchema.index({ academicUnit: 1, passingYear: 1, createdAt: -1 }) // For academic unit + year filtering
AlumniSchema.index({ academicUnit: 1, program: 1, createdAt: -1 }) // For academic unit + program filtering
AlumniSchema.index({ passingYear: 1, program: 1, createdAt: -1 }) // For year + program filtering
AlumniSchema.index({ academicUnit: 1, passingYear: 1, program: 1, createdAt: -1 }) // For all filters combined

export default Alumni

