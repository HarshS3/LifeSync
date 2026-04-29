const mongoose = require('mongoose');

const TarlaFoodSchema = new mongoose.Schema(
  {
    sourceFile: {
      type: String,
      required: true,
      default: 'tarladalal_calories_wide.csv',
      index: true,
    },
    displayName: { type: String, required: true, index: true },
    searchText: { type: String, default: '', index: true },
    servingQty: { type: String, default: '' },
    servingSize: { type: String, default: '' },
    servingWeightG: { type: Number, default: null },

    kind: { type: String, default: 'tarla', index: true },
    embedding: { type: [Number], default: [] },

    columns: {
      type: [
        {
          key: { type: String, required: true },
          value: { type: mongoose.Schema.Types.Mixed, default: '-' },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

TarlaFoodSchema.index({ displayName: 'text', searchText: 'text' });

module.exports = mongoose.model('TarlaFood', TarlaFoodSchema);
