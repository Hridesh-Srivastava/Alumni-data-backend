import Alumni from "../models/alumni.js"

// @desc    Get all alumni
// @route   GET /api/alumni
// @access  Private/Admin
export const getAlumni = async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10
    const page = Number(req.query.page) || 1

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

    const count = await Alumni.countDocuments(filter)
    const alumni = await Alumni.find(filter)
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 })

    res.json({
      data: alumni,
      pagination: {
        total: count,
        page,
        limit: pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
    })
  } catch (error) {
    console.error("Get alumni error:", error)
    res.status(500).json({ message: "Server error fetching alumni" })
  }
}

// @desc    Get alumni by ID
// @route   GET /api/alumni/:id
// @access  Private/Admin
export const getAlumniById = async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.id)

    if (alumni) {
      res.json(alumni)
    } else {
      res.status(404).json({ message: "Alumni not found" })
    }
  } catch (error) {
    console.error("Get alumni by ID error:", error)
    res.status(500).json({ message: "Server error fetching alumni" })
  }
}

// @desc    Create a new alumni
// @route   POST /api/alumni
// @access  Private/Admin
export const createAlumni = async (req, res) => {
  try {
    const {
      name,
      academicUnit,
      program,
      passingYear,
      registrationNumber,
      qualifiedExams,
      employment,
      higherEducation,
      contactDetails,
    } = req.body

    const alumniExists = await Alumni.findOne({ registrationNumber })

    if (alumniExists) {
      return res.status(400).json({ message: "Alumni with this registration number already exists" })
    }

    const alumni = await Alumni.create({
      name,
      academicUnit,
      program,
      passingYear,
      registrationNumber,
      qualifiedExams,
      employment,
      higherEducation,
      contactDetails,
    })

    if (alumni) {
      res.status(201).json(alumni)
    } else {
      res.status(400).json({ message: "Invalid alumni data" })
    }
  } catch (error) {
    console.error("Create alumni error:", error)
    res.status(500).json({ message: "Server error creating alumni" })
  }
}

// @desc    Update an alumni
// @route   PUT /api/alumni/:id
// @access  Private/Admin
export const updateAlumni = async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.id)

    if (alumni) {
      alumni.name = req.body.name || alumni.name
      alumni.academicUnit = req.body.academicUnit || alumni.academicUnit
      alumni.program = req.body.program || alumni.program
      alumni.passingYear = req.body.passingYear || alumni.passingYear
      alumni.registrationNumber = req.body.registrationNumber || alumni.registrationNumber

      if (req.body.qualifiedExams) {
        alumni.qualifiedExams = req.body.qualifiedExams
      }

      if (req.body.employment) {
        alumni.employment = req.body.employment
      }

      if (req.body.higherEducation) {
        alumni.higherEducation = req.body.higherEducation
      }

      if (req.body.contactDetails) {
        alumni.contactDetails = req.body.contactDetails
      }

      const updatedAlumni = await alumni.save()
      res.json(updatedAlumni)
    } else {
      res.status(404).json({ message: "Alumni not found" })
    }
  } catch (error) {
    console.error("Update alumni error:", error)
    res.status(500).json({ message: "Server error updating alumni" })
  }
}

// @desc    Delete an alumni
// @route   DELETE /api/alumni/:id
// @access  Private/Admin
export const deleteAlumni = async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.id)

    if (alumni) {
      await alumni.deleteOne()
      res.json({ message: "Alumni removed" })
    } else {
      res.status(404).json({ message: "Alumni not found" })
    }
  } catch (error) {
    console.error("Delete alumni error:", error)
    res.status(500).json({ message: "Server error deleting alumni" })
  }
}

// @desc    Search alumni
// @route   GET /api/alumni/search
// @access  Private/Admin
export const searchAlumni = async (req, res) => {
  try {
    const { query, academicUnit } = req.query

    const filter = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { registrationNumber: { $regex: query, $options: "i" } },
        { program: { $regex: query, $options: "i" } },
      ],
    }

    if (academicUnit && academicUnit !== "all") {
      filter.academicUnit = academicUnit
    }

    const alumni = await Alumni.find(filter).limit(20)

    res.json(alumni)
  } catch (error) {
    console.error("Search alumni error:", error)
    res.status(500).json({ message: "Server error searching alumni" })
  }
}

// @desc    Get alumni statistics
// @route   GET /api/alumni/stats
// @access  Private/Admin
export const getAlumniStats = async (req, res) => {
  try {
    // Total alumni count
    const totalAlumni = await Alumni.countDocuments()

    // Count by academic unit
    const byAcademicUnit = await Alumni.aggregate([
      {
        $group: {
          _id: "$academicUnit",
          count: { $sum: 1 },
        },
      },
    ])

    // Format academic unit data
    const academicUnitData = {}
    byAcademicUnit.forEach((item) => {
      academicUnitData[item._id] = item.count
    })

    // Count by passing year
    const byPassingYear = await Alumni.aggregate([
      {
        $group: {
          _id: "$passingYear",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    // Format passing year data
    const passingYearData = {}
    byPassingYear.forEach((item) => {
      passingYearData[item._id] = item.count
    })

    // Count employed alumni
    const employedCount = await Alumni.countDocuments({
      "employment.type": "Employed",
    })

    // Calculate employment rate
    const employmentRate = totalAlumni > 0 ? Math.round((employedCount / totalAlumni) * 100) : 0

    // Count alumni pursuing higher education
    const higherEducationCount = await Alumni.countDocuments({
      "higherEducation.institutionName": { $exists: true, $ne: "" },
    })

    // Calculate higher education rate
    const higherEducationRate = totalAlumni > 0 ? Math.round((higherEducationCount / totalAlumni) * 100) : 0

    res.json({
      totalAlumni,
      byAcademicUnit: academicUnitData,
      byPassingYear: passingYearData,
      employmentRate,
      higherEducationRate,
    })
  } catch (error) {
    console.error("Get alumni stats error:", error)
    res.status(500).json({ message: "Server error fetching alumni statistics" })
  }
}

