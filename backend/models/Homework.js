const mongoose = require('mongoose');

const HomeworkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  classAssigned: {
    type: String,
    required: true,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  file: {
    type: String,
    trim: true
  },
  cloudinaryPublicId: {
    type: String // Cloudinary public_id for deletion
  },
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    file: {
      type: String,
      trim: true
    },
    cloudinaryPublicId: {
      type: String // Cloudinary public_id for submission file deletion
    },
    originalFilename: {
      type: String,
      trim: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    comments: {
      type: String,
      trim: true
    },
    grade: {
      type: Number,
      min: 0,
      max: 100,
      validate: {
        validator: Number.isInteger,
        message: 'Grade must be an integer'
      }
    },
    gradeComments: {
      type: String,
      trim: true
    },
    gradedAt: {
      type: Date
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Homework', HomeworkSchema);
