const mongoose = require('mongoose');

const IdentityMemorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Deterministic: same meaning => same key (per user via compound unique index).
    identityKey: { type: String, required: true, index: true },

    // Internal-only, non-judgmental statement. Never advice.
    claim: { type: String, required: true },

    // PatternMemory.patternKey values supporting this claim.
    supportingPatterns: { type: [String], default: [] },

    confidence: { type: Number, default: 0.2, min: 0, max: 1 },

    // Reflects time persistence + reinforcement, not just count.
    stabilityScore: { type: Number, default: 0, min: 0, max: 1 },

    firstConfirmed: { type: Date, default: null },
    lastReinforced: { type: Date, default: null },

    status: { type: String, enum: ['active', 'fading', 'retired'], default: 'fading', index: true },

    computeVersion: { type: String, default: 'im-v1' },
  },
  { timestamps: true }
);

IdentityMemorySchema.index({ user: 1, identityKey: 1 }, { unique: true });
IdentityMemorySchema.index({ user: 1, lastReinforced: -1 });

module.exports = mongoose.model('IdentityMemory', IdentityMemorySchema);
