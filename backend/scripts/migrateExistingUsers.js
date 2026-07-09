require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

connectDB().then(async () => {
    // All users that existed before the provisioning system (no requiresPasswordChange set)
    // should be treated as already-setup accounts
    const result = await User.updateMany(
        { requiresPasswordChange: { $exists: false } },
        { $set: { requiresPasswordChange: false } }
    );
    console.log(`✅ Migrated ${result.modifiedCount} existing users -> requiresPasswordChange: false`);

    // Also fix any that are explicitly undefined (shouldn't happen but safety net)
    const result2 = await User.updateMany(
        { requiresPasswordChange: null },
        { $set: { requiresPasswordChange: false } }
    );
    if (result2.modifiedCount > 0) {
        console.log(`✅ Fixed ${result2.modifiedCount} users with null requiresPasswordChange`);
    }

    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
