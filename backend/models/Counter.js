const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Atomically get the next admission number.
 * Syncs with existing admission numbers in the database.
 */
const getNextAdmissionNumber = async () => {
  const User = mongoose.model('User');

  // Ensure counter is initialized based on existing admission numbers
  let counter = await Counter.findById('admissionNumber');
  if (!counter) {
    // Find the highest existing admission number
    const highestAdmission = await User.findOne(
      { admissionNumber: { $exists: true, $ne: null } },
      { admissionNumber: 1 },
      { sort: { admissionNumber: -1 } }
    );

    let startSeq = 0;
    if (highestAdmission && highestAdmission.admissionNumber) {
      const highestNum = parseInt(highestAdmission.admissionNumber, 10);
      if (!isNaN(highestNum)) {
        startSeq = highestNum;
      }
    }

    counter = await Counter.create({
      _id: 'admissionNumber',
      seq: startSeq
    });
    console.log('Initialized counter at seq:', startSeq, 'based on highest admission:', highestAdmission?.admissionNumber);
  }

  // Atomically increment
  counter = await Counter.findOneAndUpdate(
    { _id: 'admissionNumber' },
    { $inc: { seq: 1 } },
    { new: true }
  );

  console.log('Counter increment result:', counter);

  if (!counter || typeof counter.seq !== 'number') {
    throw new Error('Counter document not returned or invalid');
  }

  return String(counter.seq);
};

module.exports = { Counter, getNextAdmissionNumber };
