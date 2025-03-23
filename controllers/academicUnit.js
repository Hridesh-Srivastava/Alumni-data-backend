import AcademicUnit from "../models/academicUnit.js"

// @desc    Get all academic units
// @route   GET /api/academic-units
// @access  Private/Admin
export const getAcademicUnits = async (req, res) => {
  try {
    const academicUnits = await AcademicUnit.find({})
    res.json(academicUnits)
  } catch (error) {
    console.error("Get academic units error:", error)
    res.status(500).json({ message: "Server error fetching academic units" })
  }
}

// @desc    Get academic unit by ID
// @route   GET /api/academic-units/:id
// @access  Private/Admin
export const getAcademicUnitById = async (req, res) => {
  try {
    const academicUnit = await AcademicUnit.findById(req.params.id)

    if (academicUnit) {
      res.json(academicUnit)
    } else {
      res.status(404).json({ message: "Academic unit not found" })
    }
  } catch (error) {
    console.error("Get academic unit error:", error)
    res.status(500).json({ message: "Server error fetching academic unit" })
  }
}

// @desc    Create a new academic unit
// @route   POST /api/academic-units
// @access  Private/Admin
export const createAcademicUnit = async (req, res) => {
  try {
    const { name, shortName, description } = req.body

    const academicUnitExists = await AcademicUnit.findOne({ name })

    if (academicUnitExists) {
      return res.status(400).json({ message: "Academic unit already exists" })
    }

    const academicUnit = await AcademicUnit.create({
      name,
      shortName,
      description,
    })

    if (academicUnit) {
      res.status(201).json(academicUnit)
    } else {
      res.status(400).json({ message: "Invalid academic unit data" })
    }
  } catch (error) {
    console.error("Create academic unit error:", error)
    res.status(500).json({ message: "Server error creating academic unit" })
  }
}

// @desc    Update an academic unit
// @route   PUT /api/academic-units/:id
// @access  Private/Admin
export const updateAcademicUnit = async (req, res) => {
  try {
    const { name, shortName, description } = req.body

    const academicUnit = await AcademicUnit.findById(req.params.id)

    if (academicUnit) {
      academicUnit.name = name || academicUnit.name
      academicUnit.shortName = shortName || academicUnit.shortName
      academicUnit.description = description || academicUnit.description

      const updatedAcademicUnit = await academicUnit.save()
      res.json(updatedAcademicUnit)
    } else {
      res.status(404).json({ message: "Academic unit not found" })
    }
  } catch (error) {
    console.error("Update academic unit error:", error)
    res.status(500).json({ message: "Server error updating academic unit" })
  }
}

// @desc    Delete an academic unit
// @route   DELETE /api/academic-units/:id
// @access  Private/Admin
export const deleteAcademicUnit = async (req, res) => {
  try {
    const academicUnit = await AcademicUnit.findById(req.params.id)

    if (academicUnit) {
      await academicUnit.deleteOne()
      res.json({ message: "Academic unit removed" })
    } else {
      res.status(404).json({ message: "Academic unit not found" })
    }
  } catch (error) {
    console.error("Delete academic unit error:", error)
    res.status(500).json({ message: "Server error deleting academic unit" })
  }
}

