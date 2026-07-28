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

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    if (process.env.DB_NAME) {
      options.dbName = process.env.DB_NAME;
    }

    const conn = await mongoose.connect(mongoUri, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 MongoDB Database: ${conn.connection.name}`);

    // Show how many user documents exist in the connected database
    try {
      const User = require('../models/User');
      const userCount = await User.countDocuments();
      console.log('User documents in connected database:', userCount);
    } catch (countErr) {
      console.log('Could not count users:', countErr.message);
    }

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
