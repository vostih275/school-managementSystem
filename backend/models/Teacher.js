const mongoose = require('mongoose');

const teacherAssignmentSchema = new mongoose.Schema({
  class: { type: String, required: true },
  subject: { type: String, required: true },
  isCoTeacher: { type: Boolean, default: false }
});

const teacherSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  name: {
    type: String,
    required: [true, 'Teacher name is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // Class teacher responsibility (e.g., 'Grade 7', 'Grade 8', 'Grade 9')
  classTeacher: {
    type: String,
    trim: true,
    default: ''
  },
  // Subject-Grade assignments. Supports co-teaching by having multiple
  // teachers assigned to the same class/subject pair.
  subjects: [teacherAssignmentSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

teacherSchema.index({ classTeacher: 1 });
teacherSchema.index({ 'subjects.class': 1, 'subjects.subject': 1 });

module.exports = mongoose.model('Teacher', teacherSchema);
