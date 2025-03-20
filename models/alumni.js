import mongoose from 'mongoose';

const alumniSchema = mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  academicUnit: { 
    type: String, 
    required: true,
    enum: [
      'Himalayan School of Science/Engineering and Technology',
      'Himalayan Institute of Medical Sciences (Medical)',
      'Himalayan Institute of Medical Sciences (Paramedical)',
      'Himalayan Institute of Medical Sciences (Community Medicine)',
      'Himalayan Institute of Medical Sciences (Hospital Administration)',
      'Himalayan Institute of Medical Sciences (Yoga Sciences & Holistic Health)',
      'Himalayan Institute of Medical Sciences (Biosciences)',
      'Himalayan School of Management Studies',
      'Himalayan College of Nursing'
    ]
  },
  program: { 
    type: String, 
    required: true,
    trim: true
  },
  passingYear: { 
    type: String, 
    required: true,
    enum: ['2016-17', '2017-18', '2018-19', '2019-20']
  },
  registrationNumber: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  qualifiedExams: {
    examName: { 
      type: String,
      enum: [
        'NET', 'SLET', 'GATE', 'GMAT', 'GPAT', 'CAT', 'GRE', 'TOEFL', 
        'PLAB', 'USMLE', 'AYUSH', 'Civil Services', 'Defense', 'UPSC', 
        'State government examinations', 'PG-NEET', 'AIIMSPGET', 
        'JIPMER Entrance Test', 'PGIMER Entrance Test', 'Other', 'Not applicable'
      ],
      default: 'Not applicable'
    },
    rollNumber: { type: String, default: '' },
    certificateUrl: { type: String, default: '' }
  },
  employment: {
    type: { 
      type: String, 
      enum: ['Employed', 'Self-employed', 'Unemployed'],
      default: 'Unemployed'
    },
    employerName: { type: String, default: '' },
    employerContact: { type: String, default: '' },
    employerEmail: { type: String, default: '' },
    documentUrl: { type: String, default: '' },
    selfEmploymentDetails: { type: String, default: '' }
  },
  higherEducation: {
    institutionName: { type: String, default: '' },
    programName: { type: String, default: '' },
    documentUrl: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: new Date()
  },
  updatedAt: {
    type: Date,
    default: new Date()
  }
});

// Create index for search functionality
alumniSchema.index({ 
  name: 'text', 
  academicUnit: 'text', 
  program: 'text',
  registrationNumber: 'text'
});

export default mongoose.model('Alumni', alumniSchema);