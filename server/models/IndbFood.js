const mongoose = require('mongoose');

const IndbFoodSchema = new mongoose.Schema(
  {
    sourceFile: { type: String, required: true, default: 'INDB.xlsx', index: true },
    sheetName: { type: String, required: true, index: true },
    rowNumber: { type: Number, required: true, index: true },

    // All XLSX columns are preserved exactly in this key/value array.
    columns: {
      type: [
        {
          key: { type: String, required: true },
          value: { type: mongoose.Schema.Types.Mixed, default: null },
          _id: false,
        },
      ],
      default: [],
    },

    // Helper fields for fast lookups, derived deterministically from row data.
    displayName: { type: String, default: '', index: true },
    searchText: { type: String, default: '', index: true },
    fingerprints: {
      type: [String],
      default: [],
      index: true,
    },
    // The dense vector representation of the food name/description for Atlas Vector Search
    embedding: {
      type: [Number],
      default: null,
      index: false
    }
  },
  { timestamps: true }
);

IndbFoodSchema.index({ sourceFile: 1, sheetName: 1, rowNumber: 1 }, { unique: true });
IndbFoodSchema.index({ displayName: 'text', searchText: 'text' });

module.exports = mongoose.model('IndbFood', IndbFoodSchema);
