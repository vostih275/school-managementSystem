// models/Resource.js

const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  cloudinaryPublicId: { type: String }, // Cloudinary public_id for deletion
  classAssigned: {
    type: String,
    required: true,
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, {
  timestamps: true,
});

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;
