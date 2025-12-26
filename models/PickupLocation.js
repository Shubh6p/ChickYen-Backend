const mongoose = require("mongoose");

const pickupLocationSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Main Branch - Imphal"
    address: { type: String, required: true },
    googleMapsLink: { type: String, required: true }, // For redirection
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("PickupLocation", pickupLocationSchema);