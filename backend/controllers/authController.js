const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// ---------------------------------------------------------------------------
// Provisioning helpers
// ---------------------------------------------------------------------------
const generateTempPassword = () => {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${process.env.SCHOOL_NAME || 'School'}@${year}-${random}`;
};

const standardizeClass = (classValue) => {
    if (!classValue) return '';
    const trimmed = classValue.trim();

    // Normalize verbose PP labels: "PP1 (Pre-Primary 1)" -> "PP1", "PP2 (Pre-Primary 2)" -> "PP2"
    const ppNormalized = trimmed.replace(/^(PP[12])\s*\(.*\)$/i, '$1');

    // Accepted canonical values (case-insensitive):
    //   Baby Class | PP1 | PP2 | Grade 1-12 | Form 1-4
    const VALID = /^(Baby\s+Class|PP[12]|Grade\s+([1-9]|1[0-2])|Form\s+[1-4])$/i;
    if (!VALID.test(ppNormalized)) {
        return null;
    }

    // Title-case each word (handles "Baby Class", "Grade 10", etc.)
    return ppNormalized
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Secure user provisioning (admin or teacher for students only)
exports.provisionUser = async (req, res) => {
    try {
        const { name, email, role = 'student', class: userClass, profile = {} } = req.body;
        const requester = req.user;

        if (!name || !email || !role) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and role'
            });
        }

        const normalizedRole = String(role).toLowerCase().trim();
        const allowedRoles = ['student', 'teacher', 'admin', 'parent'];
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`
            });
        }

        // Teachers may only provision students
        if (requester.role === 'teacher' && normalizedRole !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Teachers can only provision student accounts'
            });
        }

        // Students must have a class
        if (normalizedRole === 'student' && !userClass) {
            return res.status(400).json({
                success: false,
                message: 'Class is required for student provisioning'
            });
        }

        // Check for duplicate email
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }

        let finalClass = '';
        if (userClass) {
            finalClass = standardizeClass(userClass);
            if (!finalClass) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid class format. Please use format 'Grade X' or 'Form X'"
                });
            }
        }

        const tempPassword = generateTempPassword();

        const userData = {
            name,
            email: email.toLowerCase().trim(),
            password: tempPassword,
            role: normalizedRole,
            requiresPasswordChange: true,
            profile: { ...profile }
        };

        if (finalClass) {
            userData.class = finalClass;
            userData.classAssigned = finalClass;
            userData.profile.class = finalClass;
        }

        const newUser = new User(userData);
        await newUser.save();

        res.status(201).json({
            success: true,
            message: `${normalizedRole} account provisioned successfully`,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                class: newUser.class || undefined,
                requiresPasswordChange: newUser.requiresPasswordChange
            },
            tempPassword // Sent once to the provisioner for secure handoff
        });
    } catch (err) {
        console.error('Provisioning error:', err);
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }
        res.status(500).json({ success: false, message: 'Server error while provisioning user' });
    }
};

// First-login password reset
exports.firstLoginReset = async (req, res) => {
    try {
        const { email, tempPassword, newPassword } = req.body;

        if (!email || !tempPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email, temporary password, and new password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or temporary password'
            });
        }

        if (!user.requiresPasswordChange) {
            return res.status(400).json({
                success: false,
                message: 'Account does not require a password reset. Please log in normally.'
            });
        }

        const isMatch = await bcrypt.compare(tempPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or temporary password'
            });
        }

        // Set new permanent password and clear flag
        user.password = newPassword;
        user.requiresPasswordChange = false;
        await user.save();

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ success: false, message: 'JWT Secret is missing' });
        }

        const payload = { id: user._id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({
            success: true,
            message: 'Password reset successful. Welcome!',
            token,
            role: user.role,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('First-login reset error:', err);
        res.status(500).json({ success: false, message: 'Server error during password reset' });
    }
};

// User Login
exports.loginUser = async (req, res) => {
    console.log('=== Login Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const email = (req.body.email || '').trim();
    const password = (req.body.password || '').trim();
    if (!email || !password) {
        console.log('Missing email or password');
        return res.status(400).json({ 
            success: false,
            msg: 'Please provide both email and password' 
        });
    }
    
    console.log('Login attempt for email:', email);
    
    try {
        // Case insensitive exact email search
        const user = await User.findOne({ 
            email: email.toLowerCase().trim()
        });
        
        if (!user) {
            console.log('❌ User not found with email:', email);
            console.log('Connected MongoDB database:', mongoose.connection?.db?.databaseName || mongoose.connection?.name || 'unknown');
            return res.status(401).json({ 
                success: false,
                msg: 'Invalid email or password' 
            });
        }
        console.log('User found:', { id: user.id, role: user.role, requiresPasswordChange: user.requiresPasswordChange });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password does not match');
            return res.status(401).json({ success: false, msg: "Invalid email or password" });
        }
        console.log('Password matches');
        console.log('User role:', user.role);

        // First-login flow: require password reset before issuing main token
        if (user.requiresPasswordChange === true) {
            console.log('User requires password reset before login');
            return res.status(403).json({
                success: false,
                forcePasswordReset: true,
                message: 'You must reset your temporary password before logging in. Use POST /api/auth/first-login-reset.'
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not set');
            return res.status(500).json({ success: false, msg: "JWT Secret is missing" });
        }
        console.log('JWT_SECRET is set');

        // Create token payload
        const payload = { 
            id: user._id,  // Changed from user.id to user._id for MongoDB
            role: user.role 
        };
        console.log('Token payload:', payload);

        // Generate token
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
        console.log('JWT Token generated');

        // Prepare user data (exclude sensitive info)
        const userData = {
            id: user._id,
            email: user.email,
            role: user.role,
            name: user.name || ''
        };

        // Send response
        res.json({ 
            success: true,
            msg: "Login successful", 
            token, 
            role: user.role,
            user: userData
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
};
