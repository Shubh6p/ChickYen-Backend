const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'Pickle' },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    weight: { type: String, required: true },
    spiceLevel: { type: Number, default: 1 },
    type: { type: String, default: 'Non-Veg' },
    description: { type: String },
    image: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },

    // ✅ NEW
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
