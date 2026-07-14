// controllers/schoolUserController.js
const User = require('../models/User');

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all users (admins, teachers, students) with filtering support
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role.toLowerCase();

    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Create a new user (teacher/student)
exports.createUser = async (req, res) => {
  const { name, email, password, role, subject, studentClass, admissionNumber } = req.body;

  const normalizedRole = role ? role.toLowerCase() : 'student';

  // Normalize email only if provided; students may use admission number instead
  const normalizedEmail = email ? email.toLowerCase().trim() : '';

  if (normalizedRole !== 'student' && !normalizedEmail) {
    return res.status(400).json({ message: 'Email is required for teachers, admins, and parents' });
  }

  // Default temporary password if admin does not provide one
  const plainPassword = password && password.trim() ? password.trim() : 'Welcome123!';

  try {
    // Check for duplicate email only when one is provided
    if (normalizedEmail) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
    }

    // If an admission number was supplied, ensure it is not taken
    if (admissionNumber) {
      const existingAdmission = await User.findOne({
        admissionNumber: admissionNumber.toString().trim()
      });
      if (existingAdmission) {
        return res.status(400).json({ message: 'A user with this admission number already exists' });
      }
    }

    const userData = {
      name,
      email: normalizedEmail || (normalizedRole === 'student' ? undefined : ''),
      password: plainPassword,
      role: normalizedRole,
      requiresPasswordChange: true,
      profile: {}
    };

    if (admissionNumber) {
      userData.admissionNumber = admissionNumber.toString().trim();
    }

    if (userData.role === 'teacher' && subject) {
      userData.profile.subjects = Array.isArray(subject) ? subject : [subject];
    }
    if ((userData.role === 'student' || userData.role === 'parent') && studentClass) {
      userData.class = studentClass;
      userData.profile.class = studentClass;
    }

    console.log('Plain password before save:', plainPassword);

    const newUser = new User(userData);
    await newUser.save();

    console.log(`User created: ${newUser.name} | admissionNumber: ${newUser.admissionNumber} | default password: ${plainPassword}`);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email || undefined,
        admissionNumber: newUser.admissionNumber || undefined,
        role: newUser.role,
        class: newUser.class || undefined,
        requiresPasswordChange: newUser.requiresPasswordChange
      }
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
