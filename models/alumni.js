import mongoose from "mongoose"

const AlumniSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  academicUnit: {
    type: String,
    required: true,
    // No default - user must select from their academic units
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
    // Removed global unique constraint - handled by compound index
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

// Create indexes BEFORE model creation
// Compound unique index for user-specific uniqueness
AlumniSchema.index({ registrationNumber: 1, createdBy: 1 }, { unique: true })
AlumniSchema.index({ academicUnit: 1, createdBy: 1, createdAt: -1 })

// Single field indexes for queries
AlumniSchema.index({ name: 1 })
AlumniSchema.index({ program: 1 })
AlumniSchema.index({ passingYear: 1 })
AlumniSchema.index({ "employment.type": 1 })

// Compound indexes for filter combinations
AlumniSchema.index({ academicUnit: 1, passingYear: 1, createdAt: -1 })
AlumniSchema.index({ academicUnit: 1, program: 1, createdAt: -1 })
AlumniSchema.index({ passingYear: 1, program: 1, createdAt: -1 })
AlumniSchema.index({ academicUnit: 1, passingYear: 1, program: 1, createdAt: -1 })

const Alumni = mongoose.model("Alumni", AlumniSchema)

export default Alumni

