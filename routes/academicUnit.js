import express from "express"
import { check, validationResult } from "express-validator"
import { protect } from "../middleware/auth.js"
import AcademicUnit from "../models/AcademicUnit.js"

const router = express.Router()

// @route   GET /api/academic-units
// @desc    Get all academic units
// @access  Public
router.get("/", async (req, res) => {
  try {
    const academicUnits = await AcademicUnit.find().sort({ name: 1 })
    res.json(academicUnits)
  } catch (error) {
    console.error("Error fetching academic units:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/academic-units/:id
// @desc    Get academic unit by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const academicUnit = await AcademicUnit.findById(req.params.id)

    if (!academicUnit) {
      return res.status(404).json({ message: "Academic unit not found" })
    }

    res.json(academicUnit)
  } catch (error) {
    console.error("Error fetching academic unit:", error)

    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Academic unit not found" })
    }

    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/academic-units
// @desc    Create new academic unit
// @access  Private
router.post(
  "/",
  [
    protect,
    [check("name", "Name is required").not().isEmpty(), check("shortName", "Short name is required").not().isEmpty()],
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      // Check if academic unit with same name already exists
      const existingUnit = await AcademicUnit.findOne({ name: req.body.name })

      if (existingUnit) {
        return res.status(400).json({ message: "Academic unit with this name already exists" })
      }

      // Create new academic unit
      const newAcademicUnit = new AcademicUnit({
        name: req.body.name,
        shortName: req.body.shortName,
        description: req.body.description,
      })

      // Save to database
      const academicUnit = await newAcademicUnit.save()

      res.json(academicUnit)
    } catch (error) {
      console.error("Error creating academic unit:", error)
      res.status(500).json({ message: "Failed to create academic unit" })
    }
  },
)

// @route   PUT /api/academic-units/:id
// @desc    Update academic unit
// @access  Private
router.put("/:id", protect, async (req, res) => {
  try {
    // Find academic unit
    let academicUnit = await AcademicUnit.findById(req.params.id)

    if (!academicUnit) {
      return res.status(404).json({ message: "Academic unit not found" })
    }

    // Check if updating name and it already exists
    if (req.body.name && req.body.name !== academicUnit.name) {
      const existingUnit = await AcademicUnit.findOne({ name: req.body.name })

      if (existingUnit) {
        return res.status(400).json({ message: "Academic unit with this name already exists" })
      }
    }

    // Update fields
    const updateFields = {
      name: req.body.name || academicUnit.name,
      shortName: req.body.shortName || academicUnit.shortName,
      description: req.body.description || academicUnit.description,
      updatedAt: Date.now(),
    }

    // Update academic unit
    academicUnit = await AcademicUnit.findByIdAndUpdate(req.params.id, updateFields, { new: true })

    res.json(academicUnit)
  } catch (error) {
    console.error("Error updating academic unit:", error)

    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Academic unit not found" })
    }

    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/academic-units/:id
// @desc    Delete academic unit
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    // Find academic unit
    const academicUnit = await AcademicUnit.findById(req.params.id)

    if (!academicUnit) {
      return res.status(404).json({ message: "Academic unit not found" })
    }

    // Delete academic unit
    await AcademicUnit.deleteOne({ _id: req.params.id })

    res.json({ message: "Academic unit removed" })
  } catch (error) {
    console.error("Error deleting academic unit:", error)

    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Academic unit not found" })
    }

    res.status(500).json({ message: "Server error" })
  }
})

export default router

