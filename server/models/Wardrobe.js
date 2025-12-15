const mongoose = require('mongoose');

const WardrobeItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'activewear', 'formal'],
      required: true,
    },
    colors: [String],
    occasions: [{
      type: String,
      enum: ['casual', 'work', 'formal', 'workout', 'date', 'outdoor'],
    }],
    seasons: [{
      type: String,
      enum: ['spring', 'summer', 'fall', 'winter', 'all-season'],
      default: ['all-season'],
    }],
    brand: String,
    imageUrl: String,
    favorite: { type: Boolean, default: false },
    notes: String,
    timesWorn: { type: Number, default: 0 },
    lastWorn: Date,
  },
  { timestamps: true }
);

// Index for efficient querying
WardrobeItemSchema.index({ user: 1, category: 1 });
WardrobeItemSchema.index({ user: 1, favorite: 1 });

const OutfitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: String,
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WardrobeItem' }],
    occasion: String,
    weather: String,
    description: String,
    favorite: { type: Boolean, default: false },
    timesWorn: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = {
  WardrobeItem: mongoose.model('WardrobeItem', WardrobeItemSchema),
  Outfit: mongoose.model('Outfit', OutfitSchema),
};
