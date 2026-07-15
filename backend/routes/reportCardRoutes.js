// routes/reportCardRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const ReportCard = require('../models/ReportCard');
const User = require('../models/User');
const {
    sendReportCard,
    getStudentReportCards,
    getReportCard,
    getAllReportCards
} = require('../controllers/reportCardController');
const { protect, authorize } = require('../middleware/auth');
const { generatePdfFromHtml } = require('../utils/pdfGenerator');
const upload = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;

// Middleware to handle file upload errors
const handleFileUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}`
        });
    } else if (err) {
        // An unknown error occurred
        return res.status(500).json({
            success: false,
            message: `Error processing file upload: ${err.message}`
        });
    }
    next();
};

/**
 * @route   POST /api/report-cards
 * @desc    Create a new report card (with or without file upload)
 * @access  Teacher, Admin
 */
router.post(
    '/',
    protect,
    authorize('teacher', 'admin'),
    (req, res, next) => {
        // If no file is being uploaded, skip multer
        if (!req.is('multipart/form-data') || !req.headers['content-type']?.includes('multipart/form-data')) {
            return next();
        }
        // Otherwise, use Cloudinary upload middleware
        upload.single('reportFile')(req, res, next);
    },
    handleFileUploadErrors,
    sendReportCard
);

/**
 * @route   POST /api/report-cards/generate
 * @desc    Generate a report card from HTML content
 * @access  Teacher, Admin
 */
// @route   POST /api/report-cards/generate
// @desc    Generate a report card from HTML content
// @access  Private (Teacher/Admin)
router.post(
    '/generate',
    upload.none(),
    express.json(),
    protect,
    authorize('teacher', 'admin'),
    async (req, res) => {
      console.log('=== REPORT CARD GENERATION REQUEST ===');
      console.log('Authenticated User:', {
        id: req.user?.id,
        role: req.user?.role,
        token: req.headers.authorization ? 
          `${req.headers.authorization.substring(0, 20)}...` : 'No token in headers'
      });
      console.log('Request Body:', {
        ...req.body,
        htmlContent: req.body.htmlContent ? '[HTML CONTENT]' : 'No HTML content'
      });
      console.log('Request Headers:', {
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? 'Token present' : 'No token',
        'x-auth-token': req.headers['x-auth-token'] ? 'Present' : 'Not present'
      });
      console.log('Authenticated user:', {
        id: req.user?.id,
        role: req.user?.role,
        body: { ...req.body, htmlContent: req.body.htmlContent ? '[HTML CONTENT]' : 'No HTML content' }
      });
        console.log('Received request to generate report card:', {
            body: {
                ...req.body,
                htmlContent: req.body.htmlContent ? req.body.htmlContent.substring(0, 100) + '...' : 'No HTML content'
            },
            headers: req.headers,
            user: req.user
        });
        
        try {
            const { studentId, term, year, comments, htmlContent } = req.body;

            // Validate required fields
            if (!studentId || !term || !year || !htmlContent) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID, term, year, and HTML content are required'
                });
            }

            // Check if student exists
            const student = await User.findById(studentId);
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }

            // Generate unique identifier for Cloudinary
            const timestamp = Date.now();
            const publicId = `report_cards/${studentId}_${timestamp}`;

            console.log('Starting PDF generation with Cloudinary upload...');

            // Generate PDF using Puppeteer and upload to Cloudinary
            const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });

            let pdfBuffer;
            try {
                const page = await browser.newPage();

                // Set HTML content directly
                await page.setContent(htmlContent, {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });

                // Generate PDF to memory buffer
                pdfBuffer = await page.pdf({
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '20mm',
                        right: '15mm',
                        bottom: '20mm',
                        left: '15mm'
                    }
                });

                console.log('PDF generated successfully in memory');
            } catch (pdfError) {
                console.error('Error generating PDF:', pdfError);
                throw new Error('Failed to generate PDF: ' + pdfError.message);
            } finally {
                await browser.close().catch(e => console.error('Error closing browser:', e));
            }

            // Upload PDF to Cloudinary using upload_stream
            console.log('Uploading PDF to Cloudinary...');
            const cloudinaryUploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        public_id: publicId,
                        folder: 'aic_school_system/report_cards',
                        resource_type: 'raw',
                        format: 'pdf',
                        overwrite: true
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            console.log('Cloudinary upload successful:', result);
                            resolve(result);
                        }
                    }
                );

                // Write the buffer to the upload stream
                uploadStream.end(pdfBuffer);
            });

            const cloudinaryResult = await cloudinaryUploadPromise;

            // Create report card record with Cloudinary URL and public ID
            const reportCard = new ReportCard({
                studentId,
                studentName: student.name,
                term: term.trim(),
                year: year.trim(),
                comments: comments || '',
                path: cloudinaryResult.secure_url, // Cloudinary secure URL
                cloudinaryPublicId: cloudinaryResult.public_id, // Cloudinary public ID
                status: 'published',
                uploadedBy: req.user.id,
                htmlContent: htmlContent
            });

            console.log('Creating report card with data:', {
                studentId: reportCard.studentId,
                studentName: reportCard.studentName,
                term: reportCard.term,
                year: reportCard.year,
                path: reportCard.path,
                cloudinaryPublicId: reportCard.cloudinaryPublicId,
                status: reportCard.status
            });

            await reportCard.save();

            res.status(201).json({
                success: true,
                message: 'Report card generated successfully',
                data: reportCard
            });

        } catch (error) {
            console.error('Error generating report card:', {
                error: error.toString(),
                stack: error.stack,
                request: {
                    body: req.body,
                    user: req.user
                }
            });

            res.status(500).json({
                success: false,
                message: 'Error generating report card',
                error: error.message
            });
        }
    }
);

/**
 * @route   GET /api/report-cards/student/:studentId
 * @desc    Get report cards for a specific student (teachers/admins)
 * @access  Private
 */
router.get(
    '/student/:studentId',
    protect,
    getStudentReportCards
);

/**
 * @route   GET /api/report-cards/student
 * @desc    Get report cards for the current user (students)
 * @access  Private
 */
router.get(
    '/student',
    protect,
    (req, res, next) => {
        // Set req.params.studentId to null to indicate current user
        req.params.studentId = null;
        next();
    },
    getStudentReportCards
);

/**
 * @route   GET /api/report-cards/:id
 * @desc    Get a single report card by ID
 * @access  Private
 */
router.get(
    '/:id',
    protect,
    getReportCard
);

// Legacy upload endpoint (for backward compatibility)
router.post(
    '/legacy',
    protect,
    authorize('teacher', 'admin'),
    upload.single('reportCard'),
    handleFileUploadErrors,
    async (req, res, next) => {
        try {
            const { studentName, year, term, comments } = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file was uploaded'
                });
            }

            // Cloudinary/CloudinaryStorage sets req.file.path to the full Cloudinary URL
            // and req.file.filename/public_id to the Cloudinary public_id
            const cloudinaryUrl = file.path;
            const publicId = file.filename || file.public_id;

            const newReport = new ReportCard({
                studentName,
                year,
                term,
                comments,
                path: cloudinaryUrl,
                cloudinaryPublicId: publicId,
                uploadedBy: req.user.id,
                studentId: req.user.id // Default to current user if not specified
            });

            await newReport.save();

            res.status(201).json({
                success: true,
                message: 'Report card uploaded',
                data: newReport
            });
        } catch (error) {
            console.error('Error uploading report card:', error);
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
);

// Delete a report card (admin/teacher only)
router.delete('/:id',
    protect,
    authorize('admin', 'teacher'),
    async (req, res) => {
        try {
            const report = await ReportCard.findById(req.params.id);

            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Report card not found'
                });
            }

            // Delete the file from Cloudinary using the public_id
            if (report.cloudinaryPublicId) {
                try {
                    await cloudinary.uploader.destroy(report.cloudinaryPublicId, {
                        resource_type: 'auto',
                        invalidate: true
                    });
                } catch (cloudinaryErr) {
                    console.error('Error deleting report card from Cloudinary:', cloudinaryErr);
                    // Proceed with database deletion even if Cloudinary deletion fails
                }
            }

            await ReportCard.findByIdAndDelete(req.params.id);

            res.json({
                success: true,
                message: 'Report card deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting report card:', error);
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
);

// Debug route to list all report cards (temporary, remove in production)
router.get('/debug/all', protect, async (req, res) => {
  try {
    // Only allow admins to use this debug endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const allReportCards = await ReportCard.find({}).populate('studentId', 'name email role');
    console.log('All report cards in database:', allReportCards);
    
    res.json({
      count: allReportCards.length,
      reportCards: allReportCards
    });
  } catch (err) {
    console.error('Error in debug route:', err);
    res.status(500).json({ 
      msg: 'Error fetching all report cards',
      error: err.message 
    });
  }
});

// Add any additional routes here if needed

// Export the router
/**
 * @route   GET /api/report-cards
 * @desc    Get all report cards (admin and teacher)
 * @access  Private (Admin/Teacher)
 */
router.get(
    '/',
    protect,
    authorize('admin', 'teacher'),
    async (req, res) => {
        console.log('User accessing report cards:', {
            id: req.user.id,
            role: req.user.role
        });
        await getAllReportCards(req, res);
    }
);

/**
 * @route   GET /api/report-cards/download/:id
 * @desc    Download a report card PDF
 * @access  Private
 */
router.get(
    '/download/:id',
    protect,
    async (req, res) => {
        try {
            const reportCard = await ReportCard.findById(req.params.id);
            
            if (!reportCard) {
                return res.status(404).json({
                    success: false,
                    message: 'Report card not found'
                });
            }

            // Check if the user has permission to access this report card
            if (req.user.role === 'student' && reportCard.studentId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this report card'
                });
            }

            // If the report card has a file path, serve that file
            if (reportCard.path) {
                const filePath = path.join(__dirname, '../public/uploads/report-cards', reportCard.path);
                
                if (require('fs').existsSync(filePath)) {
                    return res.download(filePath, `Report-Card-${reportCard.year}-${reportCard.term}.pdf`);
                } else {
                    return res.status(404).json({
                        success: false,
                        message: 'Report card file not found'
                    });
                }
            } else if (reportCard.htmlContent) {
                // If there's HTML content but no file, generate a PDF on the fly
                try {
                    const pdfBuffer = await generatePdfFromHtml(reportCard.htmlContent);
                    
                    res.set({
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename=Report-Card-${reportCard.year}-${reportCard.term}.pdf`,
                        'Content-Length': pdfBuffer.length
                    });
                    
                    res.send(pdfBuffer);
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Error generating PDF',
                        error: error.message
                    });
                }
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'No report card content available'
                });
            }
        } catch (error) {
            console.error('Error downloading report card:', error);
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
);

module.exports = router;
