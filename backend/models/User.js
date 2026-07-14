const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { getNextAdmissionNumber } = require('./Counter');

// Validate class format for CBC Primary and Junior Secondary (PP1, PP2, Grade 1-9)
const validateClass = (value) => {
  if (!value) return true; // Allow empty for non-students
  return /^(PP[12]|Grade\s[1-9])$/i.test(value);
};

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: function() {
      // Students may log in with admission number; email is required for all other roles
      return this.role !== 'student';
    },
    lowercase: true,
    trim: true
  },
  admissionNumber: { type: String, trim: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['student', 'teacher', 'admin', 'parent'],
    default: 'student'
  },
  class: { 
    type: String, 
    default: '',
    validate: {
      validator: function(v) {
        // Only validate class for students
        return this.role !== 'student' || validateClass(v);
      },
      message: props => `${props.value} is not a valid class. Please use PP1, PP2, or Grade 1-9`
    }
  },
  classAssigned: { type: String, default: '' }, // For backward compatibility
  requiresPasswordChange: { type: Boolean, default: false }, // First-login password reset flag (set to true only by provisionUser)
  completedQuizzes: [{
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
    score: Number,
    totalQuestions: Number,
    completedAt: { type: Date, default: Date.now }
  }],
  profile: {
    dob: Date,
    gender: String,
    address: String,
    phone: { type: String, trim: true },
    class: { type: String, default: '' }, // Ensure class is defined in profile
    specialization: String,
    subjects: [String],
    photo: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    health: {
      bloodGroup: String,
      allergies: [String],
      medicalConditions: [String],
      medications: [String]
    }
  }
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    }
  }
});

// Pre-save hook to keep class in sync between root and profile
userSchema.pre('save', async function(next) {
  // Auto-generate admission number for new students
  if (this.isNew && this.role === 'student' && !this.admissionNumber) {
    try {
      this.admissionNumber = await getNextAdmissionNumber();
    } catch (err) {
      return next(err);
    }
  }

  // Convert blank/empty emails to undefined to avoid unique-index collisions
  if (this.email !== undefined && this.email !== null && String(this.email).trim() === '') {
    this.email = undefined;
  }

  next();
});

userSchema.pre('save', function(next) {
  console.log('Pre-save hook - Current class data:', {
    rootClass: this.class,
    classAssigned: this.classAssigned,
    profileClass: this.profile?.class,
    isNew: this.isNew
  });

  // If class is set at root level, ensure it's in profile and classAssigned
  if (this.class) {
    this.profile = this.profile || {};
    this.profile.class = this.class;
    this.classAssigned = this.class;
  } 
  // If class is set in profile, ensure it's at root level and in classAssigned
  else if (this.profile?.class) {
    this.class = this.profile.class;
    this.classAssigned = this.profile.class;
  }
  // If classAssigned is set but not class, use it for both
  else if (this.classAssigned) {
    this.class = this.classAssigned;
    this.profile = this.profile || {};
    this.profile.class = this.classAssigned;
  }
  
  // Final check to ensure all are in sync
  if (this.class) {
    this.classAssigned = this.class;
    this.profile = this.profile || {};
    this.profile.class = this.class;
  }
  
  console.log('Pre-save hook - Updated class data:', {
    rootClass: this.class,
    classAssigned: this.classAssigned,
    profileClass: this.profile?.class
  });
  
  next();
});

// Always hash the password before saving if it is not already hashed
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  // bcrypt hashes start with '$2a$', '$2b$' or '$2y$'
  if (typeof this.password === 'string' && this.password.match(/^\$2[aby]\$/)) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Partial unique index for email: only enforces uniqueness when email is a non-empty string
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: 'string', $gt: '' }
    }
  }
);

// Sparse unique index for admission numbers (only students have them)
userSchema.index(
  { admissionNumber: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema, 'users');
