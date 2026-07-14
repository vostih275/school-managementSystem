require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

connectDB().then(async () => {
    console.log('Syncing User indexes...');
    const result = await User.syncIndexes();
    console.log('✅ Indexes synced. Dropped/created indexes:', result);

    const indexes = await User.collection.indexes();
    console.log('Current indexes on users collection:');
    console.log(JSON.stringify(indexes, null, 2));

    process.exit(0);
}).catch(e => { console.error('❌ Failed to sync indexes:', e); process.exit(1); });
