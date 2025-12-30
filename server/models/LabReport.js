const mongoose = require('mongoose');

const LabResultSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    unit: { type: String, default: '', trim: true },
    refRangeLow: { type: Number, default: null },
    refRangeHigh: { type: Number, default: null },
    flag: { type: String, enum: ['low', 'high', 'normal', 'unknown'], default: 'unknown' },
    notes: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const LabReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    panelName: { type: String, required: true, trim: true, index: true },
    results: { type: [LabResultSchema], default: [] },
    source: { type: String, default: 'manual' },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

LabReportSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('LabReport', LabReportSchema);
