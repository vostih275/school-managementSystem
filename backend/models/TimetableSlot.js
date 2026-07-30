const mongoose = require('mongoose');

const timetableSlotSchema = new mongoose.Schema({
  class: {
    type: String,
    required: [true, 'Class is required']
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    required: [true, 'Day is required']
  },
  // The nine regular lessons plus remedial/activity/ppi blocks
  lessonNumber: {
    type: Number,
    min: 1,
    max: 11,
    required: [true, 'Lesson/period number is required']
  },
  periodType: {
    type: String,
    enum: ['lesson', 'remedial', 'activity', 'ppi'],
    default: 'lesson'
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required']
  },
  subject: {
    type: String,
    default: ''
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  activity: {
    type: String,
    default: ''
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

timetableSlotSchema.index({ class: 1, day: 1, lessonNumber: 1 }, { unique: true });

module.exports = mongoose.model('TimetableSlot', timetableSlotSchema);
