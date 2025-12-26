const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  // Link to the specific Customer account
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Customer",
    required: true 
  },
  orderId: { type: String, unique: true, required: true },
  customerName: String,
  email: String,
  phone: String,
  pickupLocation: {
    locationName: String,
    fullAddress: String
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // ADD THIS
      name: String,
      price: Number,
      quantity: Number,
      weight: String,
      image: String
    }
  ],
  totalAmount: Number,
  status: { 
    type: String, 
    // Updated workflow sequence
    enum: ["Processing", "Verified", "Packed", "Out for Delivery", "Delivered", "Cancelled"], 
    default: "Processing" 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);