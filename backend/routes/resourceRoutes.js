const express = require('express');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const Resource = require('../models/Resource');
const uploadCloudinary = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// POST route for uploading a file
router.post('/upload', protect, authorize('teacher'), uploadCloudinary.single('resource'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded or invalid file type' });
    }

    // Get class from request body or user's profile
    const classAssigned = req.body.classAssigned || req.user.profile?.class || 'General';

    // Cloudinary/CloudinaryStorage sets req.file.path to the full Cloudinary URL
    // and req.file.filename/public_id to the Cloudinary public_id
    const cloudinaryUrl = req.file.path;
    const publicId = req.file.filename || req.file.public_id;

    // Save resource to the database with Cloudinary URL and public_id
    const newResource = new Resource({
      name: req.file.originalname,
      path: cloudinaryUrl,
      cloudinaryPublicId: publicId,
      classAssigned: classAssigned,
      uploadedBy: req.user._id,
    });

    await newResource.save();

    res.status(200).json({
      success: true,
      message: 'Resource uploaded successfully',
      resource: {
        _id: newResource._id,
        name: newResource.name,
        path: newResource.path,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET route for fetching uploaded resources (now from the database)
router.get('/', protect, async (req, res) => {
  try {
    const { class: classFilter } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id.toString();
    // Check both locations for class
    const userClass = req.user.class || (req.user.profile && req.user.profile.class);
    
    console.log('=== BACKEND RESOURCE DEBUG ===');
    console.log('User ID:', userId);
    console.log('User Role:', userRole);
    console.log('User Class:', userClass);
    console.log('Class Filter:', classFilter);
    console.log('Request Query:', req.query);
    console.log('User Object:', JSON.stringify(req.user, null, 2));
    console.log('===============================');
    
    // Build query
    const query = {};
    
    console.log('Resource query - userRole:', userRole, 'userClass:', userClass, 'classFilter:', classFilter, 'req.query:', req.query);
    console.log('Full user object:', JSON.stringify(req.user, null, 2));
    
    // If user is a student, only show resources for their class
    if (userRole === 'student') {
      console.log('Processing student request. User class:', userClass, 'Type:', typeof userClass);
      
      if (!userClass) {
        console.log('No class found for student:', req.user._id);
        return res.status(400).json({ 
          success: false, 
          message: 'Student is not assigned to any class. Please contact an administrator.' 
        });
      }
      
      // Ensure class is a string and trim any whitespace
      const normalizedClass = String(userClass).trim();
      console.log('Filtering resources for class:', normalizedClass);
      query.classAssigned = normalizedClass;
    } 
    // For teachers, show all their resources by default, with optional class filter
    else if (userRole === 'teacher') {
      console.log('Processing teacher request');
      query.uploadedBy = req.user._id;
      
      // Only apply class filter if specifically requested (not 'all' or undefined)
      if (classFilter && classFilter !== 'all') {
        console.log('Applying class filter for teacher:', classFilter);
        query.classAssigned = classFilter;
      } else {
        console.log('No class filter applied - showing all teacher resources');
      }
    } 
    // For admins, show all resources by default, with optional class filter
    else if (userRole === 'admin') {
      console.log('Processing admin request');
      // Only apply class filter if specifically requested (not 'all' or undefined)
      if (classFilter && classFilter !== 'all') {
        console.log('Applying class filter for admin:', classFilter);
        query.classAssigned = classFilter;
      } else {
        console.log('No class filter applied - showing all resources');
      }
    }
    
    console.log('Database query:', query);
    
    // Log all resources before filtering for debugging
    const allResources = await Resource.find({}).populate('uploadedBy', 'name').lean();
    console.log('All resources in database:', allResources.map(r => ({
      name: r.name,
      classAssigned: r.classAssigned,
      uploadedBy: r.uploadedBy?.name
    })));
    
    // Execute the actual query with filtering
    const resources = await Resource.find(query).populate('uploadedBy', 'name').lean();
    
    console.log('Filtered resources:', resources.map(r => ({
      name: r.name,
      classAssigned: r.classAssigned,
      uploadedBy: r.uploadedBy?.name
    })));
    
    // Add canDelete flag
    const resourcesWithDelete = resources.map(r => ({
      ...r,
      canDelete: userRole === 'admin' || (r.uploadedBy && r.uploadedBy._id.toString() === userId)
    }));
    
    // Get unique classes for filter dropdown based on user's role
    let classes = [];
    if (userRole === 'teacher') {
      // For teachers, only show classes they have resources for
      classes = await Resource.distinct('classAssigned', { uploadedBy: req.user._id });
    } else {
      // For admins, show all classes
      classes = await Resource.distinct('classAssigned');
    }
    
    console.log('Sending response with', resourcesWithDelete.length, 'resources');
    res.json({ 
      resources: resourcesWithDelete,
      classes,
      userClass: userRole === 'student' ? userClass : null
    });
  } catch (err) {
    console.error('Failed to fetch resources from database:', err);
    res.status(500).json({ msg: 'Failed to load resources' });
  }
});

// DELETE resource endpoint
router.delete('/:resourceId', protect, authorize('teacher'), async (req, res) => {
  const { resourceId } = req.params;

  try {
    // First find the resource to get the Cloudinary public_id
    const resource = await Resource.findById(resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, msg: 'Resource not found in the database' });
    }

    // Delete the file from Cloudinary using the public_id
    if (resource.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(resource.cloudinaryPublicId, {
          resource_type: 'raw',
          invalidate: true
        });
      } catch (cloudinaryErr) {
        console.error('Error deleting from Cloudinary:', cloudinaryErr);
        // Proceed with database deletion even if Cloudinary deletion fails
      }
    }

    // Remove the resource from the database
    await Resource.findByIdAndDelete(resourceId);

    // Send success response
    res.status(200).json({
      success: true,
      msg: 'Resource deleted successfully',
      resourceId: resourceId
    });
  } catch (err) {
    console.error('Error deleting resource:', err);
    res.status(500).json({
      success: false,
      msg: 'Failed to delete resource',
      error: err.message
    });
  }
});

module.exports = router;
