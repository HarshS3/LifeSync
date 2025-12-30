const mongoose = require('mongoose');

const SymptomLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    symptomName: { type: String, required: true, trim: true, index: true },
    severity: { type: Number, min: 0, max: 10, default: null },
    notes: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

SymptomLogSchema.index({ user: 1, date: -1 });
SymptomLogSchema.index({ user: 1, symptomName: 1, date: -1 });

module.exports = mongoose.model('SymptomLog', SymptomLogSchema);
