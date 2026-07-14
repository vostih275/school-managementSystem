const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'school',
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 MongoDB Database: ${conn.connection.name}`);

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
