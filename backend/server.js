require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const corsMiddleware = require('./middleware/cors');
const requestLogger = require('./middleware/requestLogger');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Resolve the root static directory:
// - In production the bundled frontend lives in `backend/public`.
// - In local development it lives in `../frontend`.
const publicDir = path.join(__dirname, isProduction ? 'public' : '../frontend');
const indexHtml = path.join(publicDir, isProduction ? 'index.html' : 'pages/login.html');

// Connect to MongoDB
connectDB();

// Trust proxy (required for platforms like Render)
app.set('trust proxy', 1);

// Request logging
app.use(requestLogger);

// CORS (single, consistent middleware)
app.use(corsMiddleware);

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const profilePhotosDir = path.join(uploadsDir, 'profile-photos');
const reportCardsDir = path.join(publicDir, 'uploads', 'report-cards');
const publicAssetsDir = path.join(publicDir, 'assets');
const cbcReportCardsDir = path.join(publicDir, 'downloads', 'report-cards');
[uploadsDir, profilePhotosDir, reportCardsDir, publicAssetsDir, cbcReportCardsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Static files
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads/profile-photos', express.static(profilePhotosDir));
app.use('/report-cards', express.static(reportCardsDir));
app.use('/public/assets', express.static(publicAssetsDir));
app.use('/downloads/report-cards', express.static(cbcReportCardsDir));

// Serve frontend static files from the bundled public directory
// This must come BEFORE the catch-all route
app.use(express.static(publicDir, {
  maxAge: '1h', // Cache static files for 1 hour
  etag: true,
  setHeaders: (res, path) => {
    // Log static file requests for debugging
    console.log('[STATIC] Serving:', path);
  }
}));

// Favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(publicDir, 'favicon.ico'), { headers: { 'Content-Type': 'image/x-icon' } });
});

// Root routes
app.get(['/', '/login'], (req, res) => {
  res.sendFile(indexHtml);
});

app.get('/index.html', (req, res) => {
  res.sendFile(indexHtml);
});

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/books', require('./routes/books'));
app.use('/api/events', require('./routes/events'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/users', require('./routes/schoolUserRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/health', require('./routes/health'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/grades', require('./routes/gradesRoutes'));
app.use('/api/homeworks', require('./routes/homeworkRoutes'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/quizzes', require('./routes/quizRoutes'));
app.use('/api/classes', require('./routes/class'));
app.use('/api/marks', require('./routes/marksRoutes'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/report-cards', require('./routes/reportCardRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/library', require('./routes/library'));
app.use('/api/backups', require('./routes/backups'));
app.use('/api/cbc', require('./routes/cbcRoutes'));

// Fallback for unmatched routes (SPA / direct page refresh behavior)
// Exclude static file extensions to prevent serving HTML for JS/CSS requests
app.get('*', (req, res) => {
  // Don't serve HTML for requests that look like static files
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(indexHtml);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
