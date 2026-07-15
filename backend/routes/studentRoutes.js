const express = require('express');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const uploadCloudinary = require('../config/cloudinary');
const { 
    getStudents, 
    getStudentsByClass,
    getStudentProfile, 
    updateStudentProfile, 
    changePassword,
    uploadProfilePhoto 
} = require('../controllers/studentController');

const router = express.Router();

// Get students by class
router.get('/class/:className', protect, getStudentsByClass);

// Change Password
router.put('/change-password', protect, (req, res) => {
    console.log('Received change password request:', {
        method: req.method,
        url: req.url,
        headers: req.headers
    });
    changePassword(req, res);
});

// User Profile Routes
// Handle both /profile and /profile/:id with separate routes for better compatibility
router.get('/profile', protect, (req, res, next) => {
    // If no ID is provided, use the current user's ID
    req.params = {}; // Clear any existing params
    console.log('Received get current user profile request:', {
        method: req.method,
        url: req.url,
        user: req.user
    });
    getStudentProfile(req, res);
});

// Get profile by ID
router.get('/profile/:id', protect, (req, res, next) => {
    // Get profile for the specified ID
    console.log('Received get user profile by ID request:', {
        method: req.method,
        url: req.url,
        user: req.user,
        params: req.params
    });
    getStudentProfile(req, res);
});

// Update student profile
router.put('/profile', protect, (req, res, next) => {
    console.log('Received update student profile request:', {
            method: req.method,
            url: req.url,
            user: req.user,
            body: req.body
        });
        updateStudentProfile(req, res);
    });

// Student Profile Photo Upload
router.post('/profile/photo', 
    protect, 
    uploadCloudinary.single('photo'), 
    uploadProfilePhoto,
    (err, req, res, next) => {
        // Handle multer errors specifically
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload error',
                code: err.code
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'Error uploading file'
            });
        }
        next();
    }
);

// Get All Students - Public endpoint
router.get('/', (req, res) => {
    console.log('Received get all students request:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query
    });
    getStudents(req, res);
});

router.get('/teachers', (req, res) => {
    console.log('Received get teachers request:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query
    });
    getStudents(req, res);
});

// Get Student Profile (Only the student)
router.get('/profile', (req, res, next) => {
    console.log('Received get student profile request:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query
    });
    next();
}, protect, authorize('Student'), getStudentProfile);

// Update Student Profile (Only the student)
router.put('/profile', protect, authorize('Student'), updateStudentProfile);

module.exports = router;
