import Alumni from "../models/alumni.js";
import mongoose from "mongoose";

// @desc    Get all alumni
// @route   GET /api/alumni
// @access  Private
export const getAlumni = async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10
    const page = Number(req.query.page) || 1

    // Always filter by the logged-in user
    const filter = { createdBy: req.user.id }

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
// @access  Private
export const getAlumniById = async (req, res) => {
  try {
    // Only allow user to access their own alumni records
    const alumni = await Alumni.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    })

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
// @access  Private
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

    // Check if registration number exists for THIS user only
    const alumniExists = await Alumni.findOne({ 
      registrationNumber, 
      createdBy: req.user.id 
    })

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
      createdBy: req.user.id, // Link to current user
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
// @access  Private
export const updateAlumni = async (req, res) => {
  try {
    // Only allow user to update their own alumni records
    const alumni = await Alumni.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    })

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
// @access  Private
export const deleteAlumni = async (req, res) => {
  try {
    // Only allow user to delete their own alumni records
    const alumni = await Alumni.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    })

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
// @access  Private
export const searchAlumni = async (req, res) => {
  try {
    const { query, academicUnit } = req.query

    const filter = {
      createdBy: req.user.id, // Only search user's own data
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
// @access  Private
export const getAlumniStats = async (req, res) => {
  try {
    console.log("=== GET ALUMNI STATS ===")
    console.log("Current user ID:", req.user.id)
    console.log("User ID type:", typeof req.user.id)
    
    // Convert user ID to ObjectId for ALL queries (aggregate AND countDocuments)
    const userObjectId = new mongoose.Types.ObjectId(req.user.id)
    console.log("Converted to ObjectId:", userObjectId)
    
    // Total alumni count for current user - USE ObjectId
    const totalAlumni = await Alumni.countDocuments({ createdBy: userObjectId })
    console.log("Total alumni for this user:", totalAlumni)

    // Count by academic unit (user-specific) - USING ObjectId
    const byAcademicUnit = await Alumni.aggregate([
      { $match: { createdBy: userObjectId } },
      {
        $group: {
          _id: "$academicUnit",
          count: { $sum: 1 },
        },
      },
    ])
    console.log("Academic unit aggregation result:", byAcademicUnit)

    // Format academic unit data
    const academicUnitData = {}
    byAcademicUnit.forEach((item) => {
      academicUnitData[item._id] = item.count
    })

    // Count by passing year (user-specific) - USING ObjectId
    const byPassingYear = await Alumni.aggregate([
      { $match: { createdBy: userObjectId } },
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
    console.log("Passing year aggregation result:", byPassingYear)

    // Format passing year data
    const passingYearData = {}
    byPassingYear.forEach((item) => {
      passingYearData[item._id] = item.count
    })

    // Count employed alumni (user-specific) - USE ObjectId
    const employedCount = await Alumni.countDocuments({
      createdBy: userObjectId,
      "employment.type": "Employed",
    })
    console.log("Employed count:", employedCount)

    // Calculate employment rate
    const employmentRate = totalAlumni > 0 ? Math.round((employedCount / totalAlumni) * 100) : 0

    // Count alumni pursuing higher education (user-specific) - USE ObjectId
    const higherEducationCount = await Alumni.countDocuments({
      createdBy: userObjectId,
      "higherEducation.institutionName": { $exists: true, $ne: "" },
    })
    console.log("Higher education count:", higherEducationCount)

    // Calculate higher education rate
    const higherEducationRate = totalAlumni > 0 ? Math.round((higherEducationCount / totalAlumni) * 100) : 0

    const response = {
      totalAlumni,
      byAcademicUnit: academicUnitData,
      byPassingYear: passingYearData,
      employmentRate,
      higherEducationRate,
    }
    console.log("Final response:", response)
    console.log("======================")

    res.json(response)
  } catch (error) {
    console.error("Get alumni stats error:", error)
    res.status(500).json({ message: "Server error fetching alumni statistics" })
  }
}

