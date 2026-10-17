const mongoose = require('mongoose');

// Structured section for newsletter-type announcements.
// Each section renders as: optional heading -> paragraphs -> bullets -> table.
const newsletterSectionSchema = new mongoose.Schema({
  heading: { type: String, default: '' },
  paragraphs: [{ type: String }],
  bullets: [{ type: String }],
  // Simple uniform table: headers + rows of string cells
  table: {
    headers: [{ type: String }],
    rows: [[{ type: String }]]
  },
  note: { type: String, default: '' }
}, { _id: false });

const announcementSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  createdBy: {
    type: String,
    default: 'Unknown',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // 'announcement' (default) or 'newsletter' — drives the frontend renderer
  type: {
    type: String,
    enum: ['announcement', 'newsletter'],
    default: 'announcement'
  },
  // Newsletter-only fields (ignored for plain announcements)
  title: { type: String, default: '' },
  dateLabel: { type: String, default: '' },
  audience: { type: String, default: '' },
  author: { type: String, default: '' },
  authorRole: { type: String, default: '' },
  fileName: { type: String, default: '' },
  sections: [newsletterSectionSchema]
});

module.exports = mongoose.model('Announcement', announcementSchema);
