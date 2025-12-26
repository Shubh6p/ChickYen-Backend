const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    weight: { type: String, required: true },
    spiceLevel: { type: Number, default: 1 },
    description: { type: String },
    image: { type: String, required: true },

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
