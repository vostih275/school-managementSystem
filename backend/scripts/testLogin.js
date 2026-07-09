require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

connectDB().then(async () => {
    const email = 'admin@school.com';
    const password = 'Admin@2026';

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) { console.log('USER NOT FOUND'); process.exit(1); }

    console.log('User found:', user.email, '| role:', user.role, '| requiresPasswordChange:', user.requiresPasswordChange);

    const match = await bcrypt.compare(password, user.password);
    console.log('Password match:', match);

    if (user.requiresPasswordChange) {
        console.log('STATUS: Would return 403 forcePasswordReset');
    } else if (match) {
        console.log('STATUS: Login would SUCCEED ✅');
    } else {
        console.log('STATUS: Invalid password ❌');
    }

    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
