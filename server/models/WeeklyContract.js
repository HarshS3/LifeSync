/**
 * WeeklyContract — 3 specific behavioral targets for the coming week,
 * auto-proposed from actual gaps, user-editable, scored on Friday evening.
 *
 * Targets are nutrition-first but domain-agnostic. Each target has:
 *   - a measurable metric (e.g. avgProtein >= 140g, daysLogged >= 5)
 *   - a domain (nutrition, training, wellness)
 *   - a why (one sentence grounded in the user's actual data)
 *
 * Status lifecycle: proposed → active → scored
 */
const mongoose = require('mongoose');

const ContractTargetSchema = new mongoose.Schema({
  domain: { type: String, enum: ['nutrition', 'training', 'wellness'], required: true },
  metric: { type: String, required: true },       // e.g. 'avg_protein_g', 'days_logged', 'workouts'
  label: { type: String, required: true },         // display string e.g. "Hit 140g protein on 5+ days"
  why: { type: String, default: '' },              // one sentence from the data
  targetValue: { type: Number, required: true },
  unit: { type: String, default: '' },
  // Filled in during scoring
  actualValue: { type: Number, default: null },
  met: { type: Boolean, default: null },
}, { _id: false });

const WeeklyContractSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weekKey: { type: String, required: true },       // YYYY-Www
  targets: { type: [ContractTargetSchema], default: [] },
  status: { type: String, enum: ['proposed', 'active', 'scored'], default: 'proposed' },
  userEdited: { type: Boolean, default: false },
  scoredAt: { type: Date, default: null },
  score: { type: Number, default: null },          // 0–3 targets met
  reflection: { type: String, default: '' },       // optional user note
}, { timestamps: true });

WeeklyContractSchema.index({ user: 1, weekKey: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyContract', WeeklyContractSchema);
