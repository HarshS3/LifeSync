const mongoose = require('mongoose');

const BarcodeProductSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  brand: String,
  quantityLabel: String,
  servingSize: String,
  imageUrl: String,
  nutrimentsPer100g: { type: mongoose.Schema.Types.Mixed },
  estimatedFields: [{ type: String }],
  source: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('BarcodeProduct', BarcodeProductSchema);