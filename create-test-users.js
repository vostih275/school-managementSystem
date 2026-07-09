const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./backend/models/User');

// Load environment variables
dotenv.config({ path: './backend/config/config.env' });

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/school_management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Create test users
const createTestUsers = async () => {
  try {
    // Test Teacher
    const teacherEmail = 'teacher@school.com';
    const teacherPassword = 'teacher123';
    
    // Check if teacher already exists
    let teacher = await User.findOne({ email: teacherEmail });
    
    if (!teacher) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(teacherPassword, salt);
      
      // Create teacher
      teacher = new User({
        name: 'Test Teacher',
        email: teacherEmail,
        password: hashedPassword,
        role: 'teacher',
        profile: {
          specialization: 'Mathematics',
          subjects: ['Math', 'Physics']
        }
      });
      
      await teacher.save();
      console.log('Test teacher created successfully');
    } else {
      console.log('Test teacher already exists');
    }
    
    // Test Student
    const studentEmail = 'student@school.com';
    const studentPassword = 'student123';
    
    // Check if student already exists
    let student = await User.findOne({ email: studentEmail });
    
    if (!student) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(studentPassword, 10);
      
      // Create student
      student = new User({
        name: 'Test Student',
        email: studentEmail,
        password: hashedPassword,
        role: 'student',
        class: 'Grade 10',
        profile: {
          dob: new Date('2007-01-01'),
          gender: 'Male',
          address: '123 School St, City',
          class: 'Grade 10',
          emergencyContact: {
            name: 'Parent Name',
            phone: '1234567890',
            relationship: 'Parent'
          }
        }
      });
      
      await student.save();
      console.log('Test student created successfully');
    } else {
      console.log('Test student already exists');
    }
    
    console.log('\nTest users:');
    console.log('-----------');
    console.log('Teacher:');
    console.log(`Email: ${teacherEmail}`);
    console.log(`Password: ${teacherPassword}`);
    console.log('\nStudent:');
    console.log(`Email: ${studentEmail}`);
    console.log(`Password: ${studentPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
};

// Run the script
(async () => {
  await connectDB();
  await createTestUsers();
})();
