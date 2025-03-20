import Alumni from '../models/alumni.js';

// @desc    Create a new alumni record
// @route   POST /api/alumni
// @access  Private
export const createAlumni = async (req, res) => {
  try {
    const alumniData = req.body;
    
    // Check if alumni with registration number already exists
    const alumniExists = await Alumni.findOne({ 
      registrationNumber: alumniData.registrationNumber 
    });
    
    if (alumniExists) {
      return res.status(400).json({ 
        message: 'Alumni with this registration number already exists' 
      });
    }
    
    const newAlumni = new Alumni({
      ...alumniData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newAlumni.save();
    
    res.status(201).json(newAlumni);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all alumni records with pagination
// @route   GET /api/alumni
// @access  Private
export const getAlumni = async (req, res) => {
  try {
    const { page = 1, limit = 10, academicUnit } = req.query;
    
    const query = academicUnit ? { academicUnit } : {};
    
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 }
    };
    
    const alumni = await Alumni.find(query)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);
      
    const total = await Alumni.countDocuments(query);
    
    res.status(200).json({
      alumni,
      totalPages: Math.ceil(total / options.limit),
      currentPage: options.page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get alumni by ID
// @route   GET /api/alumni/:id
// @access  Private
export const getAlumniById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alumni = await Alumni.findById(id);
    
    if (!alumni) {
      return res.status(404).json({ message: 'Alumni not found' });
    }
    
    res.status(200).json(alumni);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update alumni record
// @route   PUT /api/alumni/:id
// @access  Private
export const updateAlumni = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const alumni = await Alumni.findById(id);
    
    if (!alumni) {
      return res.status(404).json({ message: 'Alumni not found' });
    }
    
    const updatedAlumni = await Alumni.findByIdAndUpdate(
      id, 
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    res.status(200).json(updatedAlumni);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete alumni record
// @route   DELETE /api/alumni/:id
// @access  Private
export const deleteAlumni = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alumni = await Alumni.findById(id);
    
    if (!alumni) {
      return res.status(404).json({ message: 'Alumni not found' });
    }
    
    await Alumni.findByIdAndDelete(id);
    
    res.status(200).json({ message: 'Alumni deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search alumni records
// @route   GET /api/alumni/search
// @access  Private
export const searchAlumni = async (req, res) => {
  try {
    const { query, academicUnit } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { registrationNumber: { $regex: query, $options: 'i' } },
        { program: { $regex: query, $options: 'i' } }
      ]
    };
    
    if (academicUnit) {
      searchQuery.academicUnit = academicUnit;
    }
    
    const alumni = await Alumni.find(searchQuery).limit(20);
    
    res.status(200).json(alumni);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};