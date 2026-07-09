require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

connectDB().then(async () => {
    const users = await User.find({ role: 'admin' });
    for (const u of users) {
        const lower = u.email.toLowerCase().trim();
        if (u.email !== lower) {
            await User.updateOne({ _id: u._id }, { email: lower });
            console.log(`Updated: ${u.email} -> ${lower}`);
        } else {
            console.log(`OK (already lowercase): ${u.email}`);
        }
    }
    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
