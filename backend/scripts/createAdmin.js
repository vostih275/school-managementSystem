const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
const connectDB = require('../config/db');

// Function to create admin user
const createAdminUser = async (name, email, password) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log('User already exists with this email');
      return process.exit(1);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      requiresPasswordChange: false, // Admin accounts created via script are ready to log in
      profile: {
        // Add any additional profile fields here if needed
      }
    });

    await user.save();
    console.log('✅ Admin user created successfully!');
    console.log(`Email: ${email}`);
    console.log('Role: admin');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

// Check if required arguments are provided
if (process.argv.length < 5) {
  console.log('Usage: node createAdmin.js <name> <email> <password>');
  console.log('Example: node createAdmin.js "Admin User" admin@example.com "securepassword123"');
  process.exit(1);
}

// Get command line arguments
const name = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

// Connect to DB and create admin user
connectDB().then(() => {
  createAdminUser(name, email, password);
});
