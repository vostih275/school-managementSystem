// middleware/upload.js
// Re-export the Cloudinary-backed upload middleware so any route that
// requires `../middleware/upload` automatically uploads to Cloudinary.
const uploadCloudinary = require('../config/cloudinary');

module.exports = uploadCloudinary;
