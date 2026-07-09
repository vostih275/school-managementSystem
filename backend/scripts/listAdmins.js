require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

connectDB().then(async () => {
    const admins = await User.find({ role: 'admin' }).select('name email requiresPasswordChange createdAt');
    console.log('All admin accounts:');
    admins.forEach(a => console.log(` - ${a.email} | requiresPasswordChange: ${a.requiresPasswordChange} | created: ${a.createdAt}`));
    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
