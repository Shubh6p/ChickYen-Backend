const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },
    customerName: String,

    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    spiceLevel: {
        type: Number,
        min: 1,
        max: 5
    },
    comment: String,
    imageUrl: String,

    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending" // You might want to auto-approve or moderate
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Review", reviewSchema);
