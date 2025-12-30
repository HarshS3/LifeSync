const mongoose = require('mongoose');

const JournalEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  text: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('JournalEntry', JournalEntrySchema);
