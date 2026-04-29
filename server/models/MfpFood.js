const mongoose = require('mongoose');

const MfpFoodSchema = new mongoose.Schema(
  {
    sourceFile: { type: String, required: true, default: 'myfitnesspal_nutrition_data.csv', index: true },
    displayName: { type: String, required: true, index: true },
    searchText: { type: String, default: '', index: true },
    servingQty: { type: String, default: '' },
    servingSize: { type: String, default: '' },

    embedding: {
      type: [Number],
      default: null,
      index: false
    },

    // All INDB-matched columns preserved in the exact same array structure
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

MfpFoodSchema.index({ displayName: 'text', searchText: 'text' });

module.exports = mongoose.model('MfpFood', MfpFoodSchema);
