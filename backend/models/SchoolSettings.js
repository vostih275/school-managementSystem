const mongoose = require('mongoose');

const schoolSettingsSchema = new mongoose.Schema({
  schoolName: {
    type: String,
    default: 'AIC LOKICHOGGIO GIRLS PRIMARY & JUNIOR SCHOOL'
  },
  primaryEmail: {
    type: String,
    default: 'aiclokichoggiogirlsprimaryscho@gmail.com'
  },
  juniorSchoolEmail: {
    type: String,
    default: 'juniorschoolaiclokichoggiogirl@gmail.com'
  },
  schoolPhone: {
    type: String,
    default: '0117554435'
  },
  schoolAddress: {
    type: String,
    default: 'Lokichoggio, Turkana County - P.O. Box 1, Lokichoggio'
  },
  academicYear: {
    type: String,
    default: '2026'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SchoolSettings', schoolSettingsSchema);
