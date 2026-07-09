require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

connectDB().then(async () => {
    const users = await User.find({}).select('name email role requiresPasswordChange createdAt').lean();
    console.log('\nAll users:');
    users.forEach(u => {
        console.log(`  [${u.role.padEnd(10)}] ${u.email.padEnd(35)} requiresPasswordChange: ${u.requiresPasswordChange}`);
    });
    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
