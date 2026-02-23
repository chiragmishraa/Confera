const mongoose = require('mongoose');
require('dotenv').config();

async function fixSessionExpiration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/meeting-app');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const sessionsCollection = db.collection('sessions');

    // Get all indexes
    const indexes = await sessionsCollection.indexes();
    console.log('\nCurrent indexes:', JSON.stringify(indexes, null, 2));

    // Drop the old TTL index if it exists
    try {
      await sessionsCollection.dropIndex('createdAt_1');
      console.log('\n✓ Successfully dropped old TTL index (createdAt_1)');
    } catch (err) {
      if (err.code === 27) {
        console.log('\n✓ TTL index (createdAt_1) does not exist - nothing to drop');
      } else {
        console.log('\n✗ Error dropping index:', err.message);
      }
    }

    // Optional: Create a new TTL index with 7 days expiration (604800 seconds)
    // Uncomment the lines below if you want sessions to auto-expire after 7 days
    /*
    await sessionsCollection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 604800 } // 7 days
    );
    console.log('\n✓ Created new TTL index with 7 days expiration');
    */

    console.log('\n✓ Session expiration fix completed successfully!');
    console.log('\nSessions will now persist indefinitely (no auto-expiration).');
    console.log('You can manually delete old sessions using the "Delete Expired" button in the UI.');

    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  }
}

fixSessionExpiration();
