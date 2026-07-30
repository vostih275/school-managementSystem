const mongoose = require('mongoose');

const subjectSubmissionSchema = new mongoose.Schema({
  class: {
    type: String,
    required: [true, 'Class is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required']
  },
  term: {
    type: String,
    required: [true, 'Term is required']
  },
  year: {
    type: Number,
    required: [true, 'Year is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Subject teacher is required']
  },
  // draft -> submitted (subject teacher) -> locked (class teacher / admin)
  status: {
    type: String,
    enum: ['draft', 'submitted', 'locked'],
    default: 'draft'
  },
  submittedAt: {
    type: Date,
    default: null
  },
  lockedAt: {
    type: Date,
    default: null
  },
  isFinalized: {
    type: Boolean,
    default: false
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// One submission record per class/subject/term/year
subjectSubmissionSchema.index(
  { class: 1, subject: 1, term: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model('SubjectSubmission', subjectSubmissionSchema);
