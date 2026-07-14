const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Atomically get the next admission number.
 * The sequence starts at 1000 (so the first generated value is 1000).
 */
const getNextAdmissionNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'admissionNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Initial seq after first increment is 1, so add 999 to start at 1000
  return String(counter.seq + 999);
};

module.exports = { Counter, getNextAdmissionNumber };
