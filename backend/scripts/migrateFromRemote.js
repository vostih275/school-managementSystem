/**
 * migrateFromRemote.js
 * --------------------
 * Copies every collection from a remote MongoDB (e.g. Atlas/Render) into the
 * local `school` database. Documents are upserted by _id so re-running is safe.
 *
 * Conflict handling: if an incoming document can't be inserted because a unique
 * index (e.g. users.email, users.admissionNumber) collides with a DIFFERENT
 * local _id, the local document is kept and the conflict is reported.
 *
 * Usage:
 *   REMOTE_URI="mongodb+srv://user:pass@cluster.example.net/school" \
 *   node scripts/migrateFromRemote.js
 *
 * Optional env vars:
 *   REMOTE_DB   (default: 'school')
 *   LOCAL_URI   (default: 'mongodb://localhost:27017')
 *   LOCAL_DB    (default: 'school')
 */
require('dotenv').config();
const mongoose = require('mongoose');

const REMOTE_URI = process.env.REMOTE_URI;
const REMOTE_DB = process.env.REMOTE_DB || 'school';
const LOCAL_URI = process.env.LOCAL_URI || 'mongodb://localhost:27017';
const LOCAL_DB = process.env.LOCAL_DB || 'school';

if (!REMOTE_URI) {
  console.error('REMOTE_URI env var is required.');
  process.exit(1);
}

(async () => {
  let remote, local;
  try {
    remote = await mongoose.createConnection(REMOTE_URI, {
      dbName: REMOTE_DB,
      serverSelectionTimeoutMS: 15000,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).asPromise();
    console.log(`Remote connected: ${remote.host} / ${remote.name}`);

    local = await mongoose.createConnection(LOCAL_URI, {
      dbName: LOCAL_DB,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).asPromise();
    console.log(`Local connected:  ${local.host} / ${local.name}`);

    const remoteColls = (await remote.db.listCollections().toArray())
      .map(c => c.name)
      .filter(n => !n.startsWith('system.'));

    const results = [];
    for (const name of remoteColls) {
      const rCol = remote.db.collection(name);
      const lCol = local.db.collection(name);
      const remoteCount = await rCol.countDocuments();
      const localBefore = await lCol.countDocuments();

      let upserted = 0;
      const conflicts = [];
      const cursor = rCol.find({});
      for await (const doc of cursor) {
        try {
          await lCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
          upserted++;
        } catch (err) {
          if (err.code === 11000) {
            conflicts.push(doc._id);
          } else {
            throw err;
          }
        }
      }
      const localAfter = await lCol.countDocuments();
      results.push({ name, remoteCount, localBefore, upserted, skipped: conflicts.length, localAfter });
    }

    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(
      'collection'.padEnd(24),
      'remote'.padStart(7),
      'before'.padStart(7),
      'copied'.padStart(7),
      'skipped'.padStart(8),
      'after'.padStart(7)
    );
    let totalCopied = 0, totalSkipped = 0;
    for (const r of results) {
      console.log(
        r.name.padEnd(24),
        String(r.remoteCount).padStart(7),
        String(r.localBefore).padStart(7),
        String(r.upserted).padStart(7),
        String(r.skipped).padStart(8),
        String(r.localAfter).padStart(7)
      );
      totalCopied += r.upserted;
      totalSkipped += r.skipped;
    }
    console.log(`\nTotal copied/updated: ${totalCopied} | skipped (unique-key conflicts, local kept): ${totalSkipped}`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (remote) await remote.close();
    if (local) await local.close();
  }
  process.exit(process.exitCode || 0);
})();
