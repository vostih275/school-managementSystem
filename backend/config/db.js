const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGOURI || process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URL;
    if (!mongoUri) {
      console.error('❌ No MongoDB URI found in environment variables.');
      console.error('   Set one of MONGOURI, MONGO_URI, MONGODB_URI, MONGODB_URL, or MONGO_URL in your Render Environment Variables.');
      process.exit(1);
    }

    const displayUri = mongoUri.replace(/\/\/([^:/@]+):([^@]+)@/, '//<user>:<pass>@');
    console.log('Connecting to MongoDB using URI:', displayUri);
    console.log('DB_NAME env var:', process.env.DB_NAME || '<not set>');

    const preferredDb = process.env.DB_NAME ? process.env.DB_NAME.trim() : '';
    const candidateDbs = preferredDb ? [preferredDb] : ['school', 'School0', 'SW'];
    const results = [];
    let lastError = null;

    for (const dbName of candidateDbs) {
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
          console.log(`Disconnected from previous database, trying ${dbName}`);
        }

        const options = {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          dbName: dbName,
        };

        console.log(`Trying MongoDB database: ${dbName}`);
        await mongoose.connect(mongoUri, options);

        const User = require('../models/User');
        const userCount = await User.countDocuments();
        console.log(`Database '${dbName}' has ${userCount} user documents.`);

        results.push({ dbName, userCount });
      } catch (err) {
        console.error(`Failed to use database '${dbName}':`, err.message);
        lastError = err;
      }
    }

    if (results.length === 0) {
      console.error('❌ Could not connect to any candidate database.');
      if (lastError) throw lastError;
      process.exit(1);
    }

    const best = results.reduce((a, b) => (a.userCount >= b.userCount ? a : b));
    console.log('Candidate database user counts:', results.map(r => `${r.dbName}: ${r.userCount}`).join(', '));
    console.log(`✅ Selected MongoDB database: ${best.dbName} (${best.userCount} users)`);

    if (mongoose.connection.name !== best.dbName) {
      await mongoose.disconnect();
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: best.dbName,
      };
      await mongoose.connect(mongoUri, options);
    }

    const conn = mongoose;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 MongoDB Database: ${conn.connection.name}`);

    // List all databases on the cluster to help locate the correct one
    try {
      const admin = conn.connection.db.admin();
      const { databases } = await admin.listDatabases();
      console.log('Available databases on this cluster:', databases.map(d => d.name));
    } catch (listErr) {
      console.log('Could not list databases:', listErr.message);
    }

    // Sync User indexes to apply the partial unique email index and sparse unique admission number index
    try {
      // Drop the old strict email index if it still exists
      try {
        await mongoose.connection.collection('users').dropIndex('email_1');
        console.log('Old email index dropped.');
      } catch (dropError) {
        // Ignore error if the index doesn't exist
        console.log('Old email index not found or already dropped.');
      }

      // Sync the new partial/sparse indexes from the User model
      const User = require('../models/User');
      await User.syncIndexes();
      console.log('Database indexes synced successfully.');
    } catch (indexError) {
      console.error('❌ Error syncing indexes:', indexError.message);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
