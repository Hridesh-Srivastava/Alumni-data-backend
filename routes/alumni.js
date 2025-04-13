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
])

const router = express.Router()

// @route   GET /api/alumni
// @desc    Get all alumni with pagination and filters
// @access  Public
router.get("/", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Build filter object
    const filter = {}

    // Always filter for HSST engineering department
    filter.academicUnit = "Himalayan School of Science and Technology"

    if (req.query.passingYear && req.query.passingYear !== "all") {
      filter.passingYear = req.query.passingYear
    }

    if (req.query.program) {
      filter.program = { $regex: req.query.program, $options: "i" }
    }

    // Get total count
    const total = await Alumni.countDocuments(filter)

    // Get alumni with pagination
    const alumni = await Alumni.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)

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
// @desc    Search alumni
// @access  Private
router.get("/search", auth.protect, async (req, res) => {
  try {
    const { query } = req.query

    // Build search filter
    const filter = {
      // Always filter for HSST engineering department
      academicUnit: "Himalayan School of Science and Technology",
    }

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { registrationNumber: { $regex: query, $options: "i" } },
        { program: { $regex: query, $options: "i" } },
      ]
    }

    // Search alumni
    const alumni = await Alumni.find(filter).sort({ createdAt: -1 })

    res.json(alumni)
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

    // Filter for HSST engineering department only
    const filter = { academicUnit: "Himalayan School of Science and Technology" }

    // Get total alumni count
    const totalAlumni = await Alumni.countDocuments(filter)
    console.log(`Total alumni: ${totalAlumni}`)

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
    const byAcademicUnit = {
      "Himalayan School of Science and Technology": totalAlumni,
    }

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
      }

      console.log("File URLs:", fileUrls);

      // Create new alumni
      const newAlumni = new Alumni({
        name: req.body.name,
        academicUnit: "Himalayan School of Science and Technology", // Always set to HSST
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
          documentUrl: fileUrls.basicInfoImageUrl || higherEducation?.documentUrl || "",
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
    }

    // Update fields
    const updateFields = {
      name: req.body.name || alumni.name,
      academicUnit: "Himalayan School of Science and Technology", // Always set to HSST
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
          fileUrls.basicInfoImageUrl || higherEducation?.documentUrl || alumni.higherEducation?.documentUrl || "",
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