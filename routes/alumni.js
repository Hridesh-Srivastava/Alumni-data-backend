import express from "express"
import { check, validationResult } from "express-validator"
import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import { CloudinaryStorage } from "multer-storage-cloudinary"
import auth from "../middleware/auth.js"
import Alumni from "../models/alumni.js"

// Configure Cloudinary with fallback values if environment variables are missing
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "hridesh",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "hsst-alumni",
    allowed_formats: ["jpg", "jpeg", "png", "pdf", "webp", "avif", "svg"],
  },
})

// Configure multer for file uploads
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
})

// Create multer middleware for multiple file uploads
const uploadFiles = upload.fields([
  { name: "basicInfoImage", maxCount: 1 },
  { name: "qualificationImage", maxCount: 1 },
  { name: "employmentImage", maxCount: 1 },
  { name: "higherEducationImage", maxCount: 1 },
])

const router = express.Router()

// @route   GET /api/alumni/programs
// @desc    Get all available programs
// @access  Public
router.get("/programs", async (req, res) => {
  try {
    // Get distinct programs from the database
    const programs = await Alumni.distinct("program")
    
    // Sort alphabetically
    const sortedPrograms = programs.sort()
    
    console.log("Available programs:", sortedPrograms)
    
    res.json({
      data: sortedPrograms,
      total: sortedPrograms.length
    })
  } catch (error) {
    console.error("Error fetching programs:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/alumni/passing-years
// @desc    Get all available passing years
// @access  Public
router.get("/passing-years", async (req, res) => {
  try {
    // Get distinct passing years from the database
    const passingYears = await Alumni.distinct("passingYear")
    
    // Sort in descending order (newest first)
    const sortedYears = passingYears.sort((a, b) => {
      const yearA = parseInt(a.split('-')[0])
      const yearB = parseInt(b.split('-')[0])
      return yearB - yearA
    })
    
    console.log("Available passing years:", sortedYears)
    
    res.json({
      data: sortedYears,
      total: sortedYears.length
    })
  } catch (error) {
    console.error("Error fetching passing years:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/alumni
// @desc    Get all alumni with pagination and filters
// @access  Public
router.get("/", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Math.min(Number.parseInt(req.query.limit) || 10, 100) // Maximum 100 records per page
    const skip = (page - 1) * limit

    // Build filter object
    const filter = {}

    // Handle academic unit filter
    if (req.query.academicUnit && req.query.academicUnit !== "all") {
      filter.academicUnit = req.query.academicUnit
    }
    // If "all" is selected or no filter, don't add academicUnit filter - show all units

    if (req.query.passingYear && req.query.passingYear !== "all") {
      filter.passingYear = req.query.passingYear
    }

    if (req.query.program && req.query.program.trim() !== "") {
      // Use case-insensitive regex for program search
      filter.program = { $regex: req.query.program.trim(), $options: "i" }
    }

    console.log("Filter applied:", filter) // Debug log for filter performance

    // Get total count
    const total = await Alumni.countDocuments(filter)

    // Get alumni with pagination and optimization
    const alumni = await Alumni.find(filter)
      .select('name contactDetails.email academicUnit passingYear program registrationNumber createdAt') // Only select needed fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() // Convert to plain JavaScript objects for better performance

    res.json({
      data: alumni,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching alumni:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/alumni/search
// @desc    Search alumni with pagination
// @access  Private
router.get("/search", auth.protect, async (req, res) => {
  try {
    const { query } = req.query
    const page = Number.parseInt(req.query.page) || 1
    const limit = Math.min(Number.parseInt(req.query.limit) || 10, 100) // Maximum 100 records per page
    const skip = (page - 1) * limit

    // Build search filter
    const filter = {}

    // Handle academic unit filter
    if (req.query.academicUnit && req.query.academicUnit !== "all") {
      filter.academicUnit = req.query.academicUnit
    }
    // If "all" is selected or no filter, don't add academicUnit filter - show all units

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { registrationNumber: { $regex: query, $options: "i" } },
        { program: { $regex: query, $options: "i" } },
      ]
    }

    // Get total count for pagination
    const total = await Alumni.countDocuments(filter)

    // Search alumni with pagination and optimization
    const alumni = await Alumni.find(filter)
      .select('name contactDetails.email academicUnit passingYear program registrationNumber createdAt') // Only select needed fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() // Convert to plain JavaScript objects for better performance

    res.json({
      data: alumni,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error searching alumni:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/alumni/stats
// @desc    Get alumni statistics
// @access  Public
// IMPORTANT: This route must be defined BEFORE the /:id route to prevent MongoDB from trying to cast "stats" as an ObjectId
router.get("/stats", async (req, res) => {
  try {
    console.log("Fetching alumni statistics...")

    // No filter - get statistics for all academic units
    const filter = {}

    // Get total alumni count
    const totalAlumni = await Alumni.countDocuments(filter)
    console.log(`Total alumni: ${totalAlumni}`)

    // Get alumni count by academic unit
    const byAcademicUnitResult = await Alumni.aggregate([
      { $match: filter },
      { $group: { _id: "$academicUnit", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    // Get alumni count by passing year
    const byPassingYearResult = await Alumni.aggregate([
      { $match: filter },
      { $group: { _id: "$passingYear", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    // Get employment rate
    const employedCount = await Alumni.countDocuments({
      ...filter,
      "employment.type": "Employed",
    })

    const employmentRate = totalAlumni > 0 ? Math.round((employedCount / totalAlumni) * 100) : 0

    // Get higher education rate
    const higherEducationCount = await Alumni.countDocuments({
      ...filter,
      "higherEducation.institutionName": { $exists: true, $ne: "" },
    })

    const higherEducationRate = totalAlumni > 0 ? Math.round((higherEducationCount / totalAlumni) * 100) : 0

    // Format data for response
    const byAcademicUnit = {}
    byAcademicUnitResult.forEach((item) => {
      if (item._id) {
        byAcademicUnit[item._id] = item.count
      }
    })

    const byPassingYear = {}
    byPassingYearResult.forEach((item) => {
      if (item._id) {
        byPassingYear[item._id] = item.count
      }
    })

    const stats = {
      totalAlumni,
      byAcademicUnit,
      byPassingYear,
      employmentRate,
      higherEducationRate,
    }

    console.log("Stats generated successfully:", stats)
    res.json(stats)
  } catch (error) {
    console.error("Error fetching statistics:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/alumni/:id
// @desc    Get alumni by ID
// @access  Private
router.get("/:id", auth.protect, async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.id)

    if (!alumni) {
      return res.status(404).json({ message: "Alumni not found" })
    }

    res.json(alumni)
  } catch (error) {
    console.error("Error fetching alumni:", error)

    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Alumni not found" })
    }

    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/alumni
// @desc    Create new alumni with file uploads
// @access  Private
router.post(
  "/",
  [
    auth.protect, // Using auth.protect instead of auth
    uploadFiles,
    check("name", "Name is required").not().isEmpty(),
    check("program", "Program is required").not().isEmpty(),
    check("passingYear", "Passing year is required").not().isEmpty(),
    check("registrationNumber", "Registration number is required").not().isEmpty(),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      console.log("Creating new alumni with data:", req.body);
      
      // Parse JSON strings if they were sent as strings
      let contactDetails = req.body.contactDetails
      let qualifiedExams = req.body.qualifiedExams
      let employment = req.body.employment
      let higherEducation = req.body.higherEducation

      if (typeof contactDetails === "string") {
        try {
          contactDetails = JSON.parse(contactDetails)
        } catch (e) {
          console.error("Error parsing contactDetails:", e)
          contactDetails = {}
        }
      }

      if (typeof qualifiedExams === "string") {
        try {
          qualifiedExams = JSON.parse(qualifiedExams)
        } catch (e) {
          console.error("Error parsing qualifiedExams:", e)
          qualifiedExams = {}
        }
      }

      if (typeof employment === "string") {
        try {
          employment = JSON.parse(employment)
        } catch (e) {
          console.error("Error parsing employment:", e)
          employment = {}
        }
      }

      if (typeof higherEducation === "string") {
        try {
          higherEducation = JSON.parse(higherEducation)
        } catch (e) {
          console.error("Error parsing higherEducation:", e)
          higherEducation = {}
        }
      }

      // Check if alumni with same registration number already exists
      const existingAlumni = await Alumni.findOne({ registrationNumber: req.body.registrationNumber })

      if (existingAlumni) {
        return res.status(400).json({ message: "Alumni with this registration number already exists" })
      }

      // Get file URLs if files were uploaded
      const fileUrls = {
        basicInfoImageUrl: req.files?.basicInfoImage ? req.files.basicInfoImage[0].path : null,
        qualificationImageUrl: req.files?.qualificationImage ? req.files.qualificationImage[0].path : null,
        employmentImageUrl: req.files?.employmentImage ? req.files.employmentImage[0].path : null,
        higherEducationImageUrl: req.files?.higherEducationImage ? req.files.higherEducationImage[0].path : null,
      }

      console.log("File URLs:", fileUrls);

      // Create new alumni
      const newAlumni = new Alumni({
        name: req.body.name,
        academicUnit: "School of Science and Technology", // Always set to SST
        program: req.body.program,
        passingYear: req.body.passingYear,
        registrationNumber: req.body.registrationNumber,
        contactDetails: contactDetails || {},
        qualifiedExams: {
          ...(qualifiedExams || {}),
          certificateUrl: fileUrls.qualificationImageUrl || qualifiedExams?.certificateUrl || "",
        },
        employment: {
          ...(employment || {}),
          documentUrl: fileUrls.employmentImageUrl || employment?.documentUrl || "",
        },
        higherEducation: {
          ...(higherEducation || {}),
          documentUrl: fileUrls.higherEducationImageUrl || higherEducation?.documentUrl || "",
        },
        basicInfoImageUrl: fileUrls.basicInfoImageUrl,
        createdBy: req.user.id,
      })

      console.log("Saving new alumni:", newAlumni);

      // Save to database
      const alumni = await newAlumni.save()
      console.log("Alumni saved successfully:", alumni);

      res.json(alumni)
    } catch (error) {
      console.error("Error creating alumni:", error)
      res.status(500).json({ message: "Failed to create alumni: " + error.message })
    }
  },
)

// @route   PUT /api/alumni/:id
// @desc    Update alumni with file uploads
// @access  Private
router.put("/:id", [auth.protect, uploadFiles], async (req, res) => {
  try {
    // Find alumni
    let alumni = await Alumni.findById(req.params.id)

    if (!alumni) {
      return res.status(404).json({ message: "Alumni not found" })
    }

    // Check if updating registration number and it already exists
    if (req.body.registrationNumber && req.body.registrationNumber !== alumni.registrationNumber) {
      const existingAlumni = await Alumni.findOne({ registrationNumber: req.body.registrationNumber })

      if (existingAlumni) {
        return res.status(400).json({ message: "Alumni with this registration number already exists" })
      }
    }

    // Parse JSON strings if they were sent as strings
    let contactDetails = req.body.contactDetails
    let qualifiedExams = req.body.qualifiedExams
    let employment = req.body.employment
    let higherEducation = req.body.higherEducation

    if (typeof contactDetails === "string") {
      try {
        contactDetails = JSON.parse(contactDetails)
      } catch (e) {
        console.error("Error parsing contactDetails:", e)
        contactDetails = {}
      }
    }

    if (typeof qualifiedExams === "string") {
      try {
        qualifiedExams = JSON.parse(qualifiedExams)
      } catch (e) {
        console.error("Error parsing qualifiedExams:", e)
        qualifiedExams = {}
      }
    }

    if (typeof employment === "string") {
      try {
        employment = JSON.parse(employment)
      } catch (e) {
        console.error("Error parsing employment:", e)
        employment = {}
      }
    }

    if (typeof higherEducation === "string") {
      try {
        higherEducation = JSON.parse(higherEducation)
      } catch (e) {
        console.error("Error parsing higherEducation:", e)
        higherEducation = {}
      }
    }

    // Get file URLs if files were uploaded
    const fileUrls = {
      basicInfoImageUrl: req.files?.basicInfoImage ? req.files.basicInfoImage[0].path : null,
      qualificationImageUrl: req.files?.qualificationImage ? req.files.qualificationImage[0].path : null,
      employmentImageUrl: req.files?.employmentImage ? req.files.employmentImage[0].path : null,
      higherEducationImageUrl: req.files?.higherEducationImage ? req.files.higherEducationImage[0].path : null,
    }

    // Update fields
    const updateFields = {
      name: req.body.name || alumni.name,
      academicUnit: "School of Science and Technology", // Always set to SST
      program: req.body.program || alumni.program,
      passingYear: req.body.passingYear || alumni.passingYear,
      registrationNumber: req.body.registrationNumber || alumni.registrationNumber,
      contactDetails: contactDetails || alumni.contactDetails,
      qualifiedExams: {
        ...(qualifiedExams || alumni.qualifiedExams),
        certificateUrl:
          fileUrls.qualificationImageUrl ||
          qualifiedExams?.certificateUrl ||
          alumni.qualifiedExams?.certificateUrl ||
          "",
      },
      employment: {
        ...(employment || alumni.employment),
        documentUrl: fileUrls.employmentImageUrl || employment?.documentUrl || alumni.employment?.documentUrl || "",
      },
      higherEducation: {
        ...(higherEducation || alumni.higherEducation),
        documentUrl:
          fileUrls.higherEducationImageUrl || higherEducation?.documentUrl || alumni.higherEducation?.documentUrl || "",
      },
      basicInfoImageUrl: fileUrls.basicInfoImageUrl || alumni.basicInfoImageUrl,
      updatedAt: Date.now(),
    }

    // Update alumni
    alumni = await Alumni.findByIdAndUpdate(req.params.id, updateFields, { new: true })

    res.json(alumni)
  } catch (error) {
    console.error("Error updating alumni:", error)

    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Alumni not found" })
    }

    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   DELETE /api/alumni/:id
// @desc    Delete alumni
// @access  Private
router.delete("/:id", auth.protect, auth.admin, async (req, res) => {
  try {
    // Find alumni
    const alumni = await Alumni.findById(req.params.id)

    if (!alumni) {
      return res.status(404).json({ message: "Alumni not found" })
    }

    // Delete alumni
    await Alumni.deleteOne({ _id: req.params.id })

    res.json({ message: "Alumni removed" })
  } catch (error) {
    console.error("Error deleting alumni:", error)

    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Alumni not found" })
    }

    res.status(500).json({ message: "Server error" })
  }
})

export default router