const mongoose = require('mongoose');

const ChatTurnSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }, // mode, ingestion summary, etc.
  },
  { _id: false }
);

const ChatThreadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Optional human label, defaults to date-of-first-turn.
    title: { type: String, default: '' },

    // Most recent N turns kept verbatim. Older turns are folded into `summary`.
    turns: { type: [ChatTurnSchema], default: [] },

    // Rolling summary of older turns (NOT live yet — written when a summarizer is wired).
    summary: { type: String, default: '' },

    // Convenience: latest activity for ordering threads.
    lastActiveAt: { type: Date, default: Date.now, index: true },

    // Soft-archive for the user (don't delete history).
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ChatThreadSchema.index({ user: 1, lastActiveAt: -1 });
ChatThreadSchema.index({ user: 1, isActive: 1, lastActiveAt: -1 });

module.exports = mongoose.model('ChatThread', ChatThreadSchema);
