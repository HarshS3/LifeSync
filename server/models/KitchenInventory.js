const mongoose = require('mongoose');

const KitchenInventorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{ type: String }], // Just item names — no quantities
  },
  { timestamps: true }
);

// One doc per user — upsert pattern
module.exports = mongoose.models.KitchenInventory || mongoose.model('KitchenInventory', KitchenInventorySchema);
