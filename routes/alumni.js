import express from "express"
import { check, validationResult } from "express-validator"
import { protect as auth } from "../middleware/auth.js"
import Alumni from "../models/Alumni.js"

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

    if (req.query.academicUnit && req.query.academicUnit !== "all") {
      filter.academicUnit = req.query.academicUnit
    }

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

// @route   GET /api/alumni/:id
// @desc    Get alumni by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
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
// @desc    Create new alumni
// @access  Private
router.post(
  "/",
  [
    auth,
    [
      check("name", "Name is required").not().isEmpty(),
      check("academicUnit", "Academic unit is required").not().isEmpty(),
      check("program", "Program is required").not().isEmpty(),
      check("passingYear", "Passing year is required").not().isEmpty(),
      check("registrationNumber", "Registration number is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      // Check if alumni with same registration number already exists
      const existingAlumni = await Alumni.findOne({ registrationNumber: req.body.registrationNumber })

      if (existingAlumni) {
        return res.status(400).json({ message: "Alumni with this registration number already exists" })
      }

      // Create new alumni
      const newAlumni = new Alumni({
        name: req.body.name,
        academicUnit: req.body.academicUnit,
        program: req.body.program,
        passingYear: req.body.passingYear,
        registrationNumber: req.body.registrationNumber,
        contactDetails: req.body.contactDetails || {},
        qualifiedExams: req.body.qualifiedExams || {},
        employment: req.body.employment || {},
        higherEducation: req.body.higherEducation || {},
        createdBy: req.user.id,
      })

      // Save to database
      const alumni = await newAlumni.save()

      res.json(alumni)
    } catch (error) {
      console.error("Error creating alumni:", error)
      res.status(500).json({ message: "Failed to create alumni" })
    }
  },
)

// @route   PUT /api/alumni/:id
// @desc    Update alumni
// @access  Private
router.put("/:id", auth, async (req, res) => {
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

    // Update fields
    const updateFields = {
      name: req.body.name || alumni.name,
      academicUnit: req.body.academicUnit || alumni.academicUnit,
      program: req.body.program || alumni.program,
      passingYear: req.body.passingYear || alumni.passingYear,
      registrationNumber: req.body.registrationNumber || alumni.registrationNumber,
      contactDetails: req.body.contactDetails || alumni.contactDetails,
      qualifiedExams: req.body.qualifiedExams || alumni.qualifiedExams,
      employment: req.body.employment || alumni.employment,
      higherEducation: req.body.higherEducation || alumni.higherEducation,
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

    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/alumni/:id
// @desc    Delete alumni
// @access  Private
router.delete("/:id", auth, async (req, res) => {
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

// @route   GET /api/alumni/search
// @desc    Search alumni
// @access  Private
router.get("/search", auth, async (req, res) => {
  try {
    const { query, academicUnit } = req.query

    // Build search filter
    const filter = {}

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { registrationNumber: { $regex: query, $options: "i" } },
        { program: { $regex: query, $options: "i" } },
      ]
    }

    if (academicUnit && academicUnit !== "all") {
      filter.academicUnit = academicUnit
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
router.get("/stats", async (req, res) => {
  try {
    console.log("Fetching alumni statistics...")

    // Get total alumni count
    const totalAlumni = await Alumni.countDocuments()
    console.log(`Total alumni: ${totalAlumni}`)

    // Get alumni count by academic unit
    const byAcademicUnitResult = await Alumni.aggregate([
      { $group: { _id: "$academicUnit", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    // Get alumni count by passing year
    const byPassingYearResult = await Alumni.aggregate([
      { $group: { _id: "$passingYear", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    // Get employment rate
    const employedCount = await Alumni.countDocuments({
      "employment.type": "Employed",
    })

    const employmentRate = totalAlumni > 0 ? Math.round((employedCount / totalAlumni) * 100) : 0

    // Get higher education rate
    const higherEducationCount = await Alumni.countDocuments({
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

export default router

